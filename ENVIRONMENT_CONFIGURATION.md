# Environment Configuration

Phase 1 uses explicit environment validation. The backend refuses to start when a database URL, secure JWT secret, or frontend origin is missing.

## Backend

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | No | HTTP port; defaults to `5000` |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `JWT_SECRET` | Yes | Signing secret, at least 32 characters; use a generated secret in production |
| `JWT_EXPIRES_IN` | No | Token duration such as `1h` or `7d` |
| `JWT_ISSUER` | No | Expected token issuer; defaults to `edunexus-api` |
| `JWT_AUDIENCE` | No | Expected token audience; defaults to `edunexus-web` |
| `FRONTEND_URL` | Yes | Primary browser origin allowed by CORS |
| `CORS_ORIGIN` | No | Additional comma-separated origins |
| `LOG_LEVEL` | No | Application logging level |

Production frontend origins must use HTTPS. CORS values must be origins only, for example `https://erp.example.com`, without paths or credentials.

## Frontend

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` to the backend API root, such as `https://api.example.com/api`. `VITE_GEMINI_API_KEY` remains optional.

Only the JWT access token and active tenant/branch identifiers are stored in browser storage. ERP business records are kept out of localStorage. Existing `edunexus_*` business-data keys are preserved but ignored so a later migration tool can export them.

## Database migrations

From `backend`:

```text
npm run db:plan
npm run db:status
npm run db:migrate
```

The initial schema is migration `native_0001_baseline.sql` (backed by `sql/001_schema.sql`); later migrations are ordered files in `sql/migrations/`. Migration history is recorded in `schema_migrations`, and migration execution is protected by a PostgreSQL advisory lock.

For a database that already contains the original schema, inspect `npm run db:plan`, back it up, then run `npm run db:baseline -- --confirm-native-schema`. Baseline checks required tables and columns before recording the initial migration and does not execute schema SQL.
