# EduNexus Email Notification Setup

EduNexus uses the central PostgreSQL notification outbox and a separate worker. HTTP requests only commit business data and jobs; they never call the email provider.

## Provider and sender

Phase 10 uses the Resend HTTPS API through the `EmailProvider` interface. Create a Resend account, verify the sending domain, publish the DNS records shown by Resend, and use an address on that verified domain. No provider credential belongs in Git.

Development configuration:

```ini
APP_PUBLIC_URL=http://localhost:5173
EMAIL_DELIVERY_MODE=LOG
EMAIL_PROVIDER=RESEND
EMAIL_FROM_NAME=EduNexus
EMAIL_FROM_ADDRESS=notifications@example.invalid
NOTIFICATION_POLL_MS=5000
```

`LOG` mode never sends email. It logs only delivery metadata, lengths, and the recipient domain. It does not log the body or onboarding token.

Production configuration:

```ini
APP_PUBLIC_URL=https://erp.yourdomain.com
EMAIL_DELIVERY_MODE=LIVE
EMAIL_PROVIDER=RESEND
EMAIL_FROM_NAME=Your School ERP
EMAIL_FROM_ADDRESS=notifications@yourdomain.com
RESEND_API_KEY=re_xxxxxxxxx
NOTIFICATION_POLL_MS=5000
```

Production startup rejects LOG mode, a missing API key, an invalid placeholder sender, or an invalid public URL. `APP_PUBLIC_URL` supplies onboarding links and must be the public frontend origin.

## Running the processes

Development uses two terminals:

```bash
cd backend
npm run dev
```

```bash
cd backend
npm run worker:notifications
```

After `npm run build`, run the production processes separately:

```bash
npm start
npm run worker:notifications:start
```

With PM2, configure two applications using those commands, one instance for the API and one or more worker instances. Workers coordinate with `FOR UPDATE SKIP LOCKED`; no Redis service is required.

## Safe validation

1. Keep `EMAIL_DELIVERY_MODE=LOG` and apply migration 14.
2. Create an invitation or another supported event.
3. Run the worker and confirm `notification_job_sent` appears without message content.
4. Inspect `notification_jobs` and `notification_deliveries` or the Communication workspace.
5. Use a verified test recipient before switching a non-production environment to LIVE.

Tests inject a mock provider and do not send external email.

## Retry and troubleshooting

Transient failures retry after 1, 5, 30, then 120 minutes, with four total attempts. Permanent provider errors fail immediately. A job left PROCESSING for ten minutes is recovered automatically. Review tenant-safe delivery metadata in the Communication workspace or query `notification_jobs` and `notification_deliveries`. Correct configuration or recipient data, then use the authorized manual retry endpoint for a FAILED job.

Common failures are an unverified sender domain, revoked API key, missing user email, invalid template placeholder, or a worker process that is not running. Core attendance, fee, exam, and onboarding records remain committed when the provider is unavailable because delivery occurs after the transaction.
