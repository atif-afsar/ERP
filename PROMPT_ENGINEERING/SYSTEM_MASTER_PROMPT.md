# SYSTEM MASTER PROMPT - EduNexus ERP
## Project Identity
EduNexus is a high-performance, Multi-Tenant Educational SaaS for K-12 Schools and Coaching Institutes.

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Framer Motion.
- **Backend:** Node.js, Express, TypeScript, PM2.
- **Database:** PostgreSQL (with pg pool).
- **Auth:** JWT (Bearer tokens) with custom RBAC.

## Global Architectural Rules
1. **Multi-Tenancy:** Every single database query MUST be filtered by `tenant_id`. No exceptions.
2. **Security:** All endpoints must use `requireAuth` and `tenantContext` middleware.
3. **Terminology:** The system must dynamically switch labels between 'School' (Classes/Sections) and 'Coaching' (Batches/DPPs) based on tenant type.
4. **Idempotency:** All payment and financial transactions must use an `Idempotency-Key` to prevent double-billing.
5. **Error Handling:** Use the centralized `AppError` class and RFC-7807 error responses.

## Instructions for AI Assistants (Anti-Gravity)
When modifying this project:
- Always verify the `tenant_id` isolation.
- Ensure TypeScript types are strictly defined in `types/` folders.
- Maintain the separation between `/frontend` and `/backend` workspaces.
- Refer to `FEATURE_MAP.md` before implementing new logic.
