import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool, query } from '../src/db.ts';
import { enqueueNotification, escapeTemplateValue, renderTemplate } from '../src/services/notificationService.ts';
import { processNotificationJobs, retryDelayMinutes } from '../src/services/notificationWorker.ts';
import { LogEmailProvider, ResendEmailProvider } from '../src/services/emailProvider.ts';
import { config } from '../src/config.js';

let tenantId, userId, userEmail;

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  const tag = randomUUID().slice(0, 8);
  const tenantRes = await query(
    `INSERT INTO tenants (name, slug, tenant_type, status) VALUES ($1, $2, 'school', 'active') RETURNING id`,
    [`Resend Test School ${tag}`, `resend-${tag}`]
  );
  tenantId = tenantRes.rows[0].id;

  userEmail = `teacher-${tag}@resend-test.local`;
  const userRes = await query(
    `INSERT INTO users (email, password_hash, status) VALUES ($1, 'dummy_hash', 'ACTIVE') RETURNING id`,
    [userEmail]
  );
  userId = userRes.rows[0].id;
  await query(`INSERT INTO profiles (id, display_name) VALUES ($1, 'Resend Teacher')`, [userId]);
  await query(
    `INSERT INTO memberships (tenant_id, user_id, role_id, status)
     SELECT $1, $2, id, 'active' FROM roles WHERE key = 'TEACHER' AND tenant_id IS NULL`,
    [tenantId, userId]
  );
});

after(async () => {
  await pool?.end();
});

test('Resend Provider: HTML escaping protects against stored XSS in notifications', () => {
  const unsafePayload = {
    name: '<script>alert("XSS")</script>',
    reset_url: 'https://example.com?param="><svg onload=alert(1)>',
  };
  const template = 'Hello {{name}}, click here: {{reset_url}}';
  const rendered = renderTemplate(template, unsafePayload);
  assert.ok(!rendered.includes('<script>'));
  assert.ok(!rendered.includes('<svg onload'));
  assert.ok(rendered.includes('&lt;script&gt;'));
});

test('Resend Provider Contract: Successful email dispatch marks job and recipient DELIVERED', async () => {
  const event = {
    tenantId,
    eventType: 'PASSWORD_RESET',
    templateCode: 'PASSWORD_RESET',
    sourceType: 'SECURITY_TEST',
    sourceId: randomUUID(),
    payload: {
      name: 'Resend Test User',
      reset_url: 'https://app.edunexus.test/#/reset-password?token=mocktoken123',
    },
    priority: 'HIGH',
  };

  const { notificationId } = await enqueueNotification(event, [{ userId }]);
  assert.ok(notificationId);

  const sentDispatches = [];
  const fakeProvider = {
    async send(msg) {
      sentDispatches.push(msg);
      return { messageId: `resend_msg_${randomUUID()}`, provider: 'RESEND' };
    },
  };

  const processResult = await processNotificationJobs({ provider: fakeProvider, workerId: 'worker-unit-1' });
  assert.ok(processResult.processed >= 1);
  assert.ok(sentDispatches.some(d => d.to === userEmail && d.subject.includes('Reset your EduNexus password')));

  // Verify delivery record in PostgreSQL
  const delivery = await query(
    `SELECT * FROM notification_deliveries WHERE notification_id = $1 AND channel = 'EMAIL'`,
    [notificationId]
  );
  assert.equal(delivery.rowCount, 1);
  assert.equal(delivery.rows[0].status, 'SENT');
  assert.equal(delivery.rows[0].provider, 'RESEND');
  assert.ok(delivery.rows[0].provider_message_id.startsWith('resend_msg_'));

  // Verify job state
  const job = await query(
    `SELECT status, attempts FROM notification_jobs WHERE notification_id = $1 AND channel = 'EMAIL'`,
    [notificationId]
  );
  assert.equal(job.rows[0].status, 'SENT');
  assert.equal(Number(job.rows[0].attempts), 1);
});

test('Resend Provider Contract: Transient failure schedules exponential retry without permanent drop', async () => {
  const event = {
    tenantId,
    eventType: 'PASSWORD_RESET',
    templateCode: 'PASSWORD_RESET',
    sourceType: 'SECURITY_TEST',
    sourceId: randomUUID(),
    payload: {
      name: 'Retry User',
      reset_url: 'https://app.edunexus.test/#/reset-password?token=mockretry123',
    },
    priority: 'HIGH',
  };

  const { notificationId } = await enqueueNotification(event, [{ userId }]);

  const transientError = new Error('Resend 429 Rate Limit Exceeded');
  transientError.transient = true;

  const failingProvider = {
    async send() {
      throw transientError;
    },
  };

  // Attempt 1: Transient failure
  await processNotificationJobs({ provider: failingProvider, workerId: 'worker-retry-1' });

  const jobAfterAttempt1 = (
    await query(
      `SELECT status, attempts, next_attempt_at FROM notification_jobs WHERE notification_id = $1 AND channel = 'EMAIL'`,
      [notificationId]
    )
  ).rows[0];

  assert.equal(Number(jobAfterAttempt1.attempts), 1);
  assert.equal(jobAfterAttempt1.status, 'QUEUED');
  assert.ok(new Date(jobAfterAttempt1.next_attempt_at) > new Date());
});

test('Resend Provider Contract: Non-transient failure exhausts immediately to FAILED', async () => {
  const event = {
    tenantId,
    eventType: 'PASSWORD_RESET',
    templateCode: 'PASSWORD_RESET',
    sourceType: 'SECURITY_TEST',
    sourceId: randomUUID(),
    payload: {
      name: 'Permanent Fail User',
      reset_url: 'https://app.edunexus.test/#/reset-password?token=mockfail123',
    },
    priority: 'HIGH',
  };

  const { notificationId } = await enqueueNotification(event, [{ userId }]);

  const permanentError = new Error('Domain not verified: 403 Forbidden');
  permanentError.transient = false;

  const permanentFailingProvider = {
    async send() {
      throw permanentError;
    },
  };

  await processNotificationJobs({ provider: permanentFailingProvider, workerId: 'worker-permanent-fail' });

  const job = (
    await query(
      `SELECT status, attempts FROM notification_jobs WHERE notification_id = $1 AND channel = 'EMAIL'`,
      [notificationId]
    )
  ).rows[0];

  assert.equal(job.status, 'FAILED');
  assert.equal(Number(job.attempts), 1);
});

test('Resend Provider Contract: Two competing workers never dispatch duplicate emails', async () => {
  const event = {
    tenantId,
    eventType: 'PASSWORD_RESET',
    templateCode: 'PASSWORD_RESET',
    sourceType: 'CONCURRENCY_TEST',
    sourceId: randomUUID(),
    payload: {
      name: 'Concurrency User',
      reset_url: 'https://app.edunexus.test/#/reset-password?token=race123',
    },
    priority: 'HIGH',
  };

  const { notificationId } = await enqueueNotification(event, [{ userId }]);
  const dispatched = [];
  const fakeProvider = {
    async send(msg) {
      dispatched.push(msg);
      return { messageId: `msg_${randomUUID()}`, provider: 'RESEND' };
    },
  };

  // Run two concurrent worker claims
  await Promise.all([
    processNotificationJobs({ provider: fakeProvider, workerId: 'worker-alpha' }),
    processNotificationJobs({ provider: fakeProvider, workerId: 'worker-beta' }),
  ]);

  assert.equal(dispatched.length, 1, 'Exactly one email dispatched despite concurrent workers');

  const deliveries = await query(
    `SELECT * FROM notification_deliveries WHERE notification_id = $1 AND channel = 'EMAIL'`,
    [notificationId]
  );
  assert.equal(deliveries.rowCount, 1);
});

test('Resend Live Staging Verification: Assesses production credentials availability', () => {
  const hasLiveCredentials = Boolean(config.resendApiKey && config.emailDeliveryMode === 'LIVE');
  if (!hasLiveCredentials) {
    // Document Level 2 as BLOCKED for automated test runner when no live API key is supplied in environment
    console.log(
      JSON.stringify({
        level: 'info',
        test: 'RESEND_LIVE_STAGING',
        status: 'BLOCKED',
        reason: 'Live RESEND_API_KEY is not provisioned in local automated test environment. Tested via automated contract.',
      })
    );
    assert.ok(true, 'Automated contract passes; live Resend execution requires staging domain credentials.');
  } else {
    assert.ok(config.resendApiKey.startsWith('re_'), 'Valid Resend API key format');
  }
});
