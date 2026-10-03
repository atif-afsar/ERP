import type{Request}from'express';import{transaction}from'../db.js';import{AppError}from'../middleware/errorHandler.js';import{writeAudit}from'./auditService.js';import{enqueueNotification,resolveParentRecipients}from'./notificationService.js';
export async function verifyManualPayment(input:{tenantId:string;userId:string;proofId:string;decision:'APPROVED'|'REJECTED';notes:string;request:Request}){return transaction(async c=>{
 const proof=(await c.query(`SELECT * FROM payment_proofs WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,[input.proofId,input.tenantId])).rows[0];if(!proof)throw new AppError('Payment proof not found.',404,'NOT_FOUND');if(proof.status!=='PENDING')throw new AppError('Payment proof was already reviewed.',409,'PROOF_ALREADY_REVIEWED');
  if(input.decision==='REJECTED'){
    await c.query(`UPDATE payment_proofs SET status='REJECTED',verified_by=$1,verification_notes=$2,verified_at=NOW() WHERE id=$3`,[input.userId,input.notes,proof.id]);
    await writeAudit({tenantId:input.tenantId,userId:input.userId,action:'PAYMENT_PROOF_REJECTED',module:'fees',entityId:proof.id,details:{notes:input.notes},request:input.request},c);
    const assignment=(await c.query(`SELECT a.student_id,s.first_name,s.last_name FROM fee_assignments a JOIN students s ON s.id=a.student_id AND s.tenant_id=a.tenant_id WHERE a.id=$1 AND a.tenant_id=$2`,[proof.fee_assignment_id,input.tenantId])).rows[0];
    if(assignment){const recipients=await resolveParentRecipients(input.tenantId,assignment.student_id,c);await enqueueNotification({eventType:'FEE_PROOF_REJECTED',templateCode:'FEE_PROOF_REJECTED',tenantId:input.tenantId,sourceType:'PAYMENT_PROOF',sourceId:proof.id,payload:{student_name:`${assignment.first_name} ${assignment.last_name||''}`.trim(),amount:proof.amount,remarks:input.notes},priority:'HIGH'},recipients,c);}
    return{proofId:proof.id,status:'REJECTED'};
  }
 const assignment=(await c.query(`SELECT a.*,e.student_id FROM fee_assignments a JOIN enrollments e ON e.id=a.enrollment_id AND e.tenant_id=a.tenant_id WHERE a.id=$1 AND a.tenant_id=$2 FOR UPDATE OF a`,[proof.fee_assignment_id,input.tenantId])).rows[0];if(!assignment)throw new AppError('Fee assignment not found.',404,'NOT_FOUND');
 const paid=Number((await c.query(`SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE fee_assignment_id=$1 AND tenant_id=$2 AND status='COMPLETED'`,[assignment.id,input.tenantId])).rows[0].paid),outstanding=Number(assignment.total_amount)-paid;if(Number(proof.amount)>outstanding)throw new AppError('Approved amount exceeds the outstanding fee balance.',422,'AMOUNT_EXCEEDS_OUTSTANDING');
 if(proof.installment_id){const installment=(await c.query(`SELECT * FROM fee_installments WHERE id=$1 AND fee_assignment_id=$2 AND tenant_id=$3 FOR UPDATE`,[proof.installment_id,assignment.id,input.tenantId])).rows[0];if(!installment)throw new AppError('Installment does not belong to this fee assignment.',422,'INVALID_INSTALLMENT');const installmentPaid=Number((await c.query(`SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE installment_id=$1 AND tenant_id=$2 AND status='COMPLETED'`,[installment.id,input.tenantId])).rows[0].paid);if(Number(proof.amount)>Number(installment.amount)-installmentPaid)throw new AppError('Approved amount exceeds the installment balance.',422,'AMOUNT_EXCEEDS_INSTALLMENT');}
 const seq=(await c.query(`INSERT INTO fee_receipt_sequences(tenant_id,next_number) VALUES($1,2) ON CONFLICT(tenant_id) DO UPDATE SET next_number=fee_receipt_sequences.next_number+1 RETURNING next_number-1 receipt_number`,[input.tenantId])).rows[0].receipt_number,receipt=`REC-${new Date().getUTCFullYear()}-${String(seq).padStart(6,'0')}`;
 const payment=(await c.query(`INSERT INTO payments(tenant_id,fee_assignment_id,student_id,enrollment_id,installment_id,payment_proof_id,receipt_no,reference_number,amount,payment_method,status,received_by,paid_at,verified_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'UPI','COMPLETED',$10,$11,NOW()) RETURNING *`,[input.tenantId,assignment.id,assignment.student_id,assignment.enrollment_id,proof.installment_id,proof.id,receipt,proof.transaction_reference,proof.amount,input.userId,proof.payment_date])).rows[0];await c.query(`UPDATE payment_proofs SET status='APPROVED',verified_by=$1,verification_notes=$2,verified_at=NOW() WHERE id=$3`,[input.userId,input.notes,proof.id]);
 const newPaid=paid+Number(proof.amount),balance=Math.max(0,Number(assignment.total_amount)-newPaid),state=balance===0?'PAID':newPaid>0?'PARTIAL':'DUE';await c.query(`UPDATE fee_assignments SET paid_amount=$1,balance_amount=$2,status=$3,updated_at=NOW() WHERE id=$4 AND tenant_id=$5`,[newPaid,balance,state,assignment.id,input.tenantId]);await writeAudit({tenantId:input.tenantId,userId:input.userId,action:'PAYMENT_PROOF_APPROVED',module:'fees',entityId:proof.id,details:{paymentId:payment.id,receiptNo:receipt,amount:proof.amount,balance,state},request:input.request},c);
 
  try {
    const { postJournalEntry } = await import('./financeService.js');
    const incAcc = await c.query(`SELECT id FROM finance_accounts WHERE tenant_id = $1 AND code = 'INC-FEE'`, [input.tenantId]);
    const cashAccCfg = await c.query(`SELECT ledger_account_id FROM finance_cash_bank_accounts WHERE tenant_id = $1 LIMIT 1`, [input.tenantId]);
    if (incAcc.rowCount && incAcc.rowCount > 0 && cashAccCfg.rowCount && cashAccCfg.rowCount > 0) {
      await postJournalEntry({
        tenantId: input.tenantId,
        transactionDate: new Date(proof.payment_date),
        description: `Student Fee Collection via Proof: ${receipt}`,
        sourceType: 'STUDENT_FEE_PAYMENT',
        sourceId: payment.id,
        userId: input.userId,
        lines: [
          { accountId: cashAccCfg.rows[0].ledger_account_id, debit: Number(proof.amount) },
          { accountId: incAcc.rows[0].id, credit: Number(proof.amount) }
        ]
      }, c);
    }
  } catch (err) {
    // Ignore missing account configuration for backward compatibility
  }

  const student=(await c.query(`SELECT first_name,last_name FROM students WHERE id=$1 AND tenant_id=$2`,[assignment.student_id,input.tenantId])).rows[0];
  const recipients=await resolveParentRecipients(input.tenantId,assignment.student_id,c);
  await enqueueNotification({eventType:'FEE_PROOF_APPROVED',templateCode:'FEE_PROOF_APPROVED',tenantId:input.tenantId,sourceType:'PAYMENT_PROOF',sourceId:proof.id,payload:{student_name:student?`${student.first_name} ${student.last_name||''}`.trim():'Student',amount:proof.amount,receipt_number:receipt},priority:'NORMAL'},recipients,c);

  return{proofId:proof.id,status:'APPROVED',paymentId:payment.id,receiptNo:receipt,paidAmount:newPaid,balance,state};
});}
