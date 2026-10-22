import { randomUUID } from 'node:crypto';
import { query, pool } from '../backend/src/db.js';
import { enqueueNotification } from '../backend/src/services/notificationService.js';
import { processNotificationJobs } from '../backend/src/services/notificationWorker.js';
import { config } from '../backend/src/config.js';

async function main() {
  console.log('====================================================');
  console.log('  EduNexus ERP — Authority Email & Resend Audit     ');
  console.log('====================================================');
  console.log(`Provider:        ${config.emailProvider}`);
  console.log(`Delivery Mode:   ${config.emailDeliveryMode}`);
  console.log(`Sender Address:  ${config.emailFromAddress}`);
  console.log(`Sender Name:     ${config.emailFromName}`);
  console.log(`Public App URL:  ${config.appPublicUrl}`);
  console.log('====================================================\n');

  // Find an active tenant
  const tenantRes = await query(`SELECT id, name FROM tenants WHERE status = 'active' LIMIT 1`);
  if (!tenantRes.rowCount) throw new Error('No active tenant found');
  const tenant = tenantRes.rows[0];
  console.log(`Using Tenant: [${tenant.name}] (${tenant.id})\n`);

  // Target test recipients:
  // We use Resend's designated deliverability address 'delivered@resend.dev' for bulk tests,
  // and the user's primary admin email 'atifafsar70@gmail.com' for the summary dispatch.
  const testScenarios = [
    {
      authority: 'School Principal / Administrator',
      role: 'ADMIN',
      flow: 'Teacher Onboarding Invitation',
      code: 'TEACHER_INVITATION',
      recipient: 'delivered@resend.dev',
      payload: {
        name: 'Dr. Sarah Jenkins',
        school_name: tenant.name,
        setup_url: `${config.appPublicUrl}/#/setup-account?token=demo_teacher_token_${randomUUID().slice(0, 8)}`,
      },
    },
    {
      authority: 'Teacher / Class In-charge',
      role: 'TEACHER',
      flow: 'Daily Student Absence Notice',
      code: 'ATTENDANCE_ABSENT',
      recipient: 'delivered@resend.dev',
      payload: {
        student_name: 'Aarav Sharma',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      },
    },
    {
      authority: 'Chief Accountant / Bursar',
      role: 'ACCOUNTANT',
      flow: 'Fee Payment Approval & Official Receipt',
      code: 'FEE_PROOF_APPROVED',
      recipient: 'delivered@resend.dev',
      payload: {
        student_name: 'Aarav Sharma',
        amount: '18,500',
        receipt_number: `REC-${Date.now().toString().slice(-6)}`,
      },
    },
    {
      authority: 'Examination Controller',
      role: 'EXAM_CONTROLLER',
      flow: 'Term Exam Results Published',
      code: 'EXAM_RESULT_PUBLISHED',
      recipient: 'delivered@resend.dev',
      payload: {
        exam_name: 'Term 1 Final Assessment',
        student_name: 'Aarav Sharma',
      },
    },
    {
      authority: 'HR & Operations Head',
      role: 'HR_MANAGER',
      flow: 'Staff Leave Approval Notice',
      code: 'STAFF_LEAVE_APPROVED',
      recipient: 'delivered@resend.dev',
      payload: {
        name: 'Dr. Sarah Jenkins',
        start_date: '2026-11-01',
        end_date: '2026-11-03',
        note: 'Approved with full academic cover scheduled.',
      },
    },
    {
      authority: 'System Security / Portal Access',
      role: 'SECURITY',
      flow: 'Password Reset & Account Recovery',
      code: 'PASSWORD_RESET',
      recipient: 'atifafsar70@gmail.com', // Sent directly to the administrator's mailbox
      payload: {
        name: 'Atif Afsar (System Admin)',
        reset_url: `${config.appPublicUrl}/#/reset-password?token=verified_live_token_${randomUUID().slice(0, 8)}`,
      },
    },
  ];

  const results = [];

  for (const [idx, item] of testScenarios.entries()) {
    console.log(`[${idx + 1}/${testScenarios.length}] Testing Authority Flow: ${item.authority}`);
    console.log(`    Action:    ${item.flow}`);
    console.log(`    Template:  ${item.code}`);
    console.log(`    Recipient: ${item.recipient}`);

    const sourceId = randomUUID();
    const { notificationId } = await enqueueNotification(
      {
        tenantId: tenant.id,
        eventType: item.code,
        templateCode: item.code,
        sourceType: 'AUTHORITY_AUDIT',
        sourceId,
        payload: item.payload,
        priority: 'HIGH',
      },
      [{ externalEmail: item.recipient }]
    );

    // Dispatch using the real notification worker and live Resend provider
    const workerResult = await processNotificationJobs({ workerId: `audit-worker-${idx + 1}`, batchSize: 5 });

    // Query the delivery record in PostgreSQL
    const deliveryRes = await query(
      `SELECT id, status, provider, provider_message_id, recipient, sent_at, last_error
       FROM notification_deliveries 
       WHERE notification_id = $1 AND channel = 'EMAIL'`,
      [notificationId]
    );

    const delivery = deliveryRes.rows[0];
    const isSuccess = delivery && delivery.status === 'SENT' && delivery.provider === 'RESEND';

    if (isSuccess) {
      console.log(`    ✔ Dispatched via Resend! Provider Msg ID: ${delivery.provider_message_id}`);
      results.push({
        authority: item.authority,
        role: item.role,
        flow: item.flow,
        template: item.code,
        recipient: item.recipient,
        status: 'PASSED',
        messageId: delivery.provider_message_id,
        sentAt: delivery.sent_at,
      });
    } else {
      console.error(`    ✖ Failed: ${delivery?.last_error || 'No delivery row created'}`);
      results.push({
        authority: item.authority,
        role: item.role,
        flow: item.flow,
        template: item.code,
        recipient: item.recipient,
        status: 'FAILED',
        error: delivery?.last_error || 'Unknown error',
      });
    }
    console.log('');
  }

  console.log('====================================================');
  console.log('                FINAL AUDIT SUMMARY                 ');
  console.log('====================================================');
  console.table(
    results.map(r => ({
      Authority: r.authority,
      Workflow: r.flow,
      Status: r.status,
      ResendMessageId: r.messageId ? r.messageId.slice(0, 18) + '...' : 'N/A',
    }))
  );

  const allPassed = results.every(r => r.status === 'PASSED');
  console.log(`\nOverall Decision: ${allPassed ? 'ALL AUTHORITY FLOWS OPERATIONAL (100% PASS)' : 'SOME FLOWS FAILED'}\n`);

  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
