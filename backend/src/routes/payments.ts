import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function mapPaymentFromDb(p: any) {
  return {
    id: p.id,
    tenantId: p.tenant_id,
    feeAssignmentId: p.fee_assignment_id,
    studentId: p.student_id,
    receiptNo: p.receipt_no,
    transactionRef: p.reference_number || p.receipt_no,
    amount: Number(p.amount),
    paymentMode: p.payment_method,
    status: p.status,
    receivedBy: p.received_by || 'Cashier / Admin',
    feeHeadBreakdown: p.fee_head_breakdown || [],
    idempotencyKey: p.idempotency_key,
    paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : new Date().toISOString(),
    createdAt: p.created_at,
  };
}

// GET /api/v1/payments
router.get('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const studentId = req.query.studentId as string;

  let sql = 'SELECT * FROM payments WHERE tenant_id = $1';
  const params: any[] = [tenantId];

  if (studentId) {
    sql += ' AND student_id = $2';
    params.push(studentId);
  }

  sql += ' ORDER BY paid_at DESC';
  const result = await query(sql, params);

  res.json({
    data: result.rows.map(mapPaymentFromDb),
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/payments (Transactional with Idempotency Support)
router.post('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const b = req.body;

  const idempotencyKey = (req.headers['idempotency-key'] as string) || b.idempotencyKey;
  const studentId = b.studentId || b.student_id;
  const amount = Number(b.amount);
  const paymentMethod = (b.paymentMode || b.paymentMethod || 'CASH').toUpperCase();
  const feeAssignmentId = b.feeAssignmentId || b.fee_assignment_id || null;
  const receiptNo = b.receiptNo || b.receipt_no || `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const referenceNumber = b.transactionRef || b.referenceNumber || receiptNo;
  const breakdown = b.feeHeadBreakdown || [];

  if (!studentId || !amount || amount <= 0) {
    throw new AppError('Valid studentId and positive amount are required.', 422, 'VALIDATION_ERROR');
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = await query(
      'SELECT * FROM payments WHERE tenant_id = $1 AND idempotency_key = $2',
      [tenantId, idempotencyKey]
    );
    if (existing.rows.length > 0) {
      return res.json({
        data: mapPaymentFromDb(existing.rows[0]),
        meta: { idempotentReplay: true },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Multi-table transactional execution
  const savedPayment = await transaction(async (client) => {
    // 1. Insert payment
    const payRes = await client.query(
      `INSERT INTO payments (
         tenant_id, fee_assignment_id, student_id, receipt_no, reference_number,
         amount, payment_method, status, received_by, fee_head_breakdown,
         idempotency_key, paid_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED', $8, $9, $10, NOW())
       RETURNING *`,
      [
        tenantId,
        feeAssignmentId,
        studentId,
        receiptNo,
        referenceNumber,
        amount,
        paymentMethod,
        req.user?.id || null,
        JSON.stringify(breakdown),
        idempotencyKey || null,
      ]
    );

    const paymentRow = payRes.rows[0];

    // 2. Update fee assignment if linked, or find earliest unpaid assignment
    let targetAssignmentId = feeAssignmentId;
    if (!targetAssignmentId) {
      const pendingAssignment = await client.query(
        "SELECT id FROM fee_assignments WHERE tenant_id = $1 AND student_id = $2 AND status != 'PAID' ORDER BY due_date ASC LIMIT 1",
        [tenantId, studentId]
      );
      if (pendingAssignment.rows.length > 0) {
        targetAssignmentId = pendingAssignment.rows[0].id;
      }
    }

    if (targetAssignmentId) {
      await client.query(
        `UPDATE fee_assignments
         SET paid_amount = paid_amount + $1,
             balance_amount = GREATEST(0, total_amount - (paid_amount + $1)),
             status = CASE WHEN (total_amount - (paid_amount + $1)) <= 0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END,
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [amount, targetAssignmentId, tenantId]
      );
    }

    // 3. Write immutable audit log
    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, module, entity_id, details)
       VALUES ($1, $2, 'PAYMENT_RECORDED', 'FEES', $3, $4)`,
      [
        tenantId,
        req.user?.id || null,
        paymentRow.id,
        JSON.stringify({ receiptNo, amount, paymentMethod, studentId }),
      ]
    );

    return paymentRow;
  });

  res.status(201).json({
    data: mapPaymentFromDb(savedPayment),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
