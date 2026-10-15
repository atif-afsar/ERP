# EduNexus ERP: Migration Runner Security Hardening Certification Report

**Task Focus:** Migration Runner Hardening (`backend/migrate.mjs`)  
**Scope:** Migration Security, Recursive Real-Path Dependency Resolution, Import Policy Enforcement, Checksum Compatibility, and Cumulative Certification  
**Target Environment:**  
- API: `http://127.0.0.1:5111/api/v1`
- Frontend: `http://127.0.0.1:5191`
- QA Database: `edunexus_rc_1791213658158_9f3898_test`
- Date: October 14, 2026  
- Status: **ALL SECURITY REQUIREMENTS IMPLEMENTED & CERTIFIED**

---

## 1. Executive Summary & Root Cause Analysis

Four security gaps were previously identified in the migration runner implementation:

1. **One-Level-Deep Hashing:** The prior runner used a single-pass regex over the migration file to find imported specifiers and only read those immediate files. Nested helpers (e.g., Migration -> Helper A -> Helper B) were not traversed or hashed; mutations in nested dependencies escaped detection.
2. **Lexical Path Containment Without Real Filesystem Resolution:** The containment check relied solely on `path.relative()` on lexical paths. This allowed filesystem escapes via symlinks or NTFS junctions that resided lexically within `backend/sql/migrations` but pointed outside the migration root.
3. **Non-Literal Dynamic Imports Unchecked:** Dynamic imports using variables (`await import(pathVar)`) or template literals (`await import(`./lib/${name}.mjs`)`) were not rejected by the parser, introducing non-deterministic or malicious runtime module loading risks.
4. **Bare Third-Party Package Imports Unchecked:** Bare package imports (e.g., `import 'lodash'`) and arbitrary built-ins were not filtered or rejected, permitting unhashed external runtime dependencies inside migration scripts.

---

## 2. Final Supported Import Policy

The migration runner enforces an explicit, restrictive ESM grammar and module policy:

### Supported Imports:
1. **Static Relative String Literals:**
   ```javascript
   import { validateAndNormalizeIsbn } from './lib/isbn_v1.mjs';
   import './lib/setup.mjs';
   export { helper } from './lib/helper.mjs';
   ```
2. **Literal Relative Dynamic Imports:**
   ```javascript
   const mod = await import('./lib/helper.mjs');
   ```
3. **Explicitly Allowlisted Node Built-ins:**
   - Permitted: `'node:path'`, `'node:crypto'`, `'node:fs'`, `'node:fs/promises'`, `'node:url'`, `'node:util'`, `'node:os'`, `'node:buffer'`, `'node:stream'`, `'node:events'`.
   - Built-ins are verified and allowed without adding external file dependencies to the checksum hasher.

### Strictly Rejected Imports:
- **Non-literal dynamic imports:** `await import(varName)` or `await import(`./lib/${name}.mjs`)` -> Rejected with `Non-literal dynamic import rejected`.
- **Bare third-party packages:** `import _ from 'lodash'` -> Rejected with `Bare third-party imports are forbidden: 'lodash'`.
- **Unapproved Node built-ins:** `import 'node:child_process'` -> Rejected with `Unapproved Node built-in import 'node:child_process'`.
- **Absolute filesystem paths:** `import '/etc/passwd'` or `import 'C:\...'` -> Rejected with `Absolute path imports are forbidden`.
- **URLs:** `import 'file://...'` or `import 'http://...'` -> Rejected with `URL imports are forbidden`.
- **CommonJS require calls:** `require(...)` -> Rejected with `CommonJS require() call rejected`.
- **Unsupported extensions:** Non-`.mjs`, non-`.js`, non-`.json` files -> Rejected with `Unsupported dependency extension`.
- **Missing dependency files:** Rejected prior to database connection or migration execution.
- **Circular dependencies:** Active recursion stack detection rejects cycles deterministically with exact trace.

---

## 3. Architecture & Implementation Design

### A. Parser Implementation
- Leverages the existing repository TypeScript compiler parser (`typescript` v5.7.3) via `ts.createSourceFile`.
- Requires zero new runtime or external npm dependencies.
- Inspects AST nodes:
  - `ts.isImportDeclaration`: Validates string literal `moduleSpecifier`.
  - `ts.isExportDeclaration`: Validates string literal `moduleSpecifier` if re-exporting.
  - `ts.isCallExpression` with `ts.SyntaxKind.ImportKeyword`: Validates that `arguments[0]` is strictly `ts.isStringLiteral`. Rejects variables, binary expressions, and template literals.
  - `ts.isImportEqualsDeclaration` and `ts.isCallExpression` for `require`: Rejects unsupported module syntaxes.
- Comments (`//`, `/* */`), string literals, and template strings containing fake `import` statements are completely ignored because they do not produce module import AST nodes.

### B. Recursive Resolver & Cycle Detection
- Uses canonical real paths resolved via `fsSync.realpathSync`.
- **Active Stack:** `activeStack = new Set([fileReal])` maintains current DFS branch. If a dependency candidate is already in `activeStack`, a cycle is detected and throws `Circular dependency detected: A -> B -> A`.
- **Visited Map:** `visited = new Map()` tracks canonical realpaths that have been completely traversed and validated. Diamond dependencies (e.g., A -> D and B -> D) are processed once and hashed exactly once.
- **JSON Handling:** `.json` files are validated with deterministic `JSON.parse` prior to hashing.

### C. Real-Path Containment Logic
- Separator-aware containment prevents sibling path traversal (e.g. `migrations-evil`):
  ```javascript
  const normDepReal = path.normalize(depReal);
  const normMigrationRoot = path.normalize(canonicalMigrationRoot);
  const isContained = normDepReal.startsWith(normMigrationRoot + path.sep) ||
                      normDepReal.startsWith(normMigrationRoot + '/');
  if (!isContained) {
    throw new Error(`Path containment violation: import '${specifier}' in ${currentReal} resolves outside migration root (${depReal})`);
  }
  ```
- Both symlinks pointing outside the migration directory and NTFS directory junctions pointing to external directories (e.g. `backend/src`) resolve via `fs.realpathSync` to their external targets and are blocked.

### D. Deterministic Cross-Platform Hashing Order
- All collected dependencies are sorted by normalized relative path using forward slashes (`/`):
  `path.relative(canonicalMigrationRoot, depReal).replace(/\\/g, '/')`.
- Each dependency is hashed with a distinct boundary:
  `hasher.update(`\n--- DEP: ${dep.normalizedRel} ---\n`).update(dep.bytes)`.
- Eliminates Windows backslash vs Unix forward-slash divergence, guaranteeing identical SHA-256 hashes across all operating systems.

---

## 4. Checksum Transitions & Narrow Cryptographic Binding

Cross-platform path normalization (from Windows backslash `lib\isbn_v1.mjs` to cross-platform `lib/isbn_v1.mjs`) produced new normalized composite checksums. Historical database compatibility was maintained strictly through narrow, cryptographic bindings without wildcards:

| Migration | Historical Stored Checksum | Approved Current Checksum | Rationale |
|---|---|---|---|
| `native_0027_library_isbn_remediation.sql` | `b1468cde561cde9ce2bb4a452fab845f6219c26c9930e30108841b7f16760cd1` | `b1468cde561cde9ce2bb4a452fab845f6219c26c9930e30108841b7f16760cd1` | SQL migration; identical bytes. |
| `native_0028_library_isbn_legacy_backfill.mjs` | `3cc2a0a5c2529ca45df945a39fd773f0225bd8c21ef09fe3148f36835de6600a` | `ed20a976632706581f8293ce6f22f6dffa5ebc92256ce2c9dca99046f544ae12` | Stored checksum accepted only when disk source matches exact new recursive normalized composite hash. |
| `native_0029_library_isbn_migration_determinism.mjs` | `ba8a247750b73a72678d38d91ba865f236852d9927528a39fbf7a01fbc086974` | `e4d385ce11837f359c41fc7d6bfda964d0e294cf9bb94e98667ca36a598aa285` | Stored checksum (computed with Windows backslash) bound to newly approved cross-platform normalized checksum. |

Any mutation to `native_0028`, `native_0029`, or `lib/isbn_v1.mjs` changes `source.checksum`, violating `source.checksum === transition.approvedCurrentChecksum` and failing status immediately.

---

## 5. Automated 25-Point Security Test Matrix Results

The automated test script (`qa/artifacts/migration-runner-security/verify-runner-security.mjs`) evaluated all 25 security scenarios:

| # | Test Scenario | Expected Outcome | Result |
|---|---|---|---|
| 01 | Direct local helper | Included in composite checksum | **PASS** |
| 02 | Nested helper (mig -> A -> B) | Mutation in B alters migration checksum | **PASS** |
| 03 | Deep dependency chain (4 levels) | All 4 levels resolved and hashed | **PASS** |
| 04 | Duplicate diamond dependency | Hashed exactly once without double counting | **PASS** |
| 05 | Circular dependency | Deterministically rejected with cycle trace | **PASS** |
| 06 | Missing local helper | Rejected before DB connection or execution | **PASS** |
| 07 | Lexical `../` escape | Rejected as path safety violation | **PASS** |
| 08 | Absolute path import | Rejected as forbidden absolute path | **PASS** |
| 09 | Symlink escape outside migration root | Rejected after `realpath()` containment check | **PASS** |
| 10 | NTFS Junction escape on Windows | Rejected after `realpath()` containment check | **PASS** |
| 11 | Similar-prefix directory escape (`migrations_evil`) | Separator-aware check rejects prefix trick | **PASS** |
| 12 | Non-literal dynamic import variable | Rejected as non-literal import | **PASS** |
| 13 | Template-expression dynamic import | Rejected as non-literal import | **PASS** |
| 14 | Literal local dynamic import | Safely tracked and hashed | **PASS** |
| 15 | Bare third-party import | Rejected as forbidden package | **PASS** |
| 16 | Approved `node:*` built-in | Accepted without creating external dependency | **PASS** |
| 17 | Unapproved `node:*` built-in | Rejected by allowlist | **PASS** |
| 18 | Comment containing fake import | Ignored by AST parser | **PASS** |
| 19 | String containing fake import | Ignored by AST parser | **PASS** |
| 20 | Multiline static import | Detected and tracked | **PASS** |
| 21 | Side-effect import (`import './...'`) | Detected and tracked | **PASS** |
| 22 | 1-byte root migration mutation | Checksum mismatch in status | **PASS** |
| 23 | 1-byte direct helper mutation | Checksum mismatch in status | **PASS** |
| 24 | 1-byte nested helper mutation | Checksum mismatch in status | **PASS** |
| 25 | No execution during planning/status | Zero side-effect execution during checksumming | **PASS** |

**Summary: 25 / 25 PASS (100%)**

---

## 6. Database Preservation, Fresh Install & Rollback Certification

Verified via `qa/artifacts/migration-runner-security/verify-db-preservation-and-fresh.mjs`:

### Existing QA Database Preservation:
- `node backend/migrate.mjs status` returns code `0` with all 29 migrations `APPLIED`.
- Zero database rows dropped, modified, or truncated.
- Exact table row counts:
  - `schema_migrations`: 29
  - `library_isbn_remediation`: 10
  - `library_books`: 147
  - `book_copies`: 192
  - `library_loans`: 155
  - `audit_logs`: 3,195
  - `users`: 228
  - `tenants`: 61
- Zero temporary database objects remain.
- `node backend/migrate.mjs up` is idempotent: 0 pending migrations applied.

### Rollback & Advisory Lock Verification:
- Created isolated database `edunexus_sec_rollback_*_test`.
- Applied baseline, then triggered controlled mid-migration failure in `native_0099_controlled_failure_test.mjs`.
- Transaction rolled back cleanly: probe table and schema migration records do not exist.
- Advisory lock `hashtext('edunexus_native_migrations')` released immediately.
- Cleaned up probe migration file and dropped test database in `finally`.

### Fresh Database Verification:
- Created isolated database `edunexus_sec_fresh_*_test`.
- Applied baseline and executed `node backend/migrate.mjs up`.
- All 29 migrations applied cleanly with exit code `0`.
- Recorded exact approved current checksums:
  - `native_0028`: `ed20a976632706581f8293ce6f22f6dffa5ebc92256ce2c9dca99046f544ae12`
  - `native_0029`: `e4d385ce11837f359c41fc7d6bfda964d0e294cf9bb94e98667ca36a598aa285`
- Dropped test database in `finally`.

---

## 7. Cumulative Library Regression Certification

| Test Suite | File / Command | Result |
|---|---|---|
| Migration Runner Security Suite (25 scenarios) | `node qa/artifacts/migration-runner-security/verify-runner-security.mjs` | **25 / 25 PASS** |
| DB Preservation, Rollback & Fresh DB | `node qa/artifacts/migration-runner-security/verify-db-preservation-and-fresh.mjs` | **PASS** |
| Migration Determinism Verification Suite | `node qa/artifacts/library-migration-determinism/verify-determinism.mjs` | **23 / 23 PASS** |
| ISBN Service Unit Tests | `node backend/tests/isbn-service.test.mjs` | **12 / 12 PASS** |
| Legacy Backfill Migration Suite (Run 1) | `node qa/artifacts/library-isbn-legacy-backfill/verify-migration-backfill.mjs` | **12 / 12 PASS** |
| Legacy Backfill Migration Suite (Run 2 - Idempotency) | `node qa/artifacts/library-isbn-legacy-backfill/verify-migration-backfill.mjs` | **12 / 12 PASS** |
| ISBN API Contract Suite | `node qa/artifacts/library-isbn-legacy-backfill/verify-isbn-api-contract.mjs` | **11 / 11 PASS** |
| Library Operations Integration Suite | `node backend/tests/library-operations-integration.test.mjs` | **8 / 8 PASS** |
| DEF-LIB-001 (Title Archive Safety) | `node qa/artifacts/library-title-archive-safety/verify-title-archive-safety.mjs` | **15 / 15 PASS** |
| DEF-LIB-002 (Inactive Borrower Repair) | `node qa/artifacts/library-inactive-borrower-repair/verify-repair.mjs` | **14 / 14 PASS** |
| DEF-LIB-003 / DEF-LIB-004 (Selector Usability) | `node qa/artifacts/library-selector-usability/verify-selector-contract.mjs` | **15 / 15 PASS** |
| DEF-LIB-005 (ISBN Safety & Uniqueness) | `node qa/artifacts/library-isbn-safety/verify-isbn-contract.mjs` | **23 / 23 PASS** |
| Backend TypeScript Build | `npm run build --workspace=backend` | **PASS (`tsc` 0 errors)** |
| Frontend Production Build | `npm run build --workspace=frontend` | **PASS (`vite build` 0 errors)** |
| Library Browser Smoke Verification | `node qa/artifacts/migration-runner-security/verify-browser-smoke.mjs` | **7 / 7 PASS** |

### Focused Library Browser Smoke Verification:
- Page load: `http://127.0.0.1:5191/#/app/library` renders correctly.
- Title creation with valid ISBN-13 (`978-1-491-95029-6`) succeeds with 201 Created and normalized canonical value.
- Duplicate ISBN returns 409 `ISBN_EXISTS`.
- Invalid ISBN-13 returns 422 `INVALID_ISBN`.
- Physical copy and loan selectors load successfully.
- Zero console errors and zero uncaught runtime page errors.
- Visual screenshots saved: `01_library_overview.png`, `02_library_reloaded.png`.

---

## 8. Files Changed

1. [`backend/migrate.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/migrate.mjs):
   - Integrated TypeScript AST parser (`ts.createSourceFile`).
   - Implemented strict import policy: relative literals, literal dynamic imports, approved `node:*` built-ins.
   - Implemented recursive dependency traversal with canonical `fs.realpathSync`.
   - Added active stack cycle detection (`Circular dependency detected: ...`).
   - Added separator-aware realpath containment checks blocking symlink, junction, and sibling directory escapes.
   - Normalized relative paths to forward slashes (`/`) and sorted deterministically.
   - Updated `HISTORICAL_TRANSITIONS` with exact, cryptographic bindings for `native_0028` and `native_0029`.
2. [`qa/artifacts/library-migration-determinism/verify-determinism.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-migration-determinism/verify-determinism.mjs):
   - Updated expected current checksums to reflect cross-platform forward-slash normalized hashes.
3. [`qa/artifacts/migration-runner-security/verify-runner-security.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/migration-runner-security/verify-runner-security.mjs):
   - Automated 25-point security test suite covering all defect scenarios.
4. [`qa/artifacts/migration-runner-security/verify-db-preservation-and-fresh.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/migration-runner-security/verify-db-preservation-and-fresh.mjs):
   - Automated validation of QA database preservation, rollback & advisory lock, and fresh database execution.
5. [`qa/artifacts/migration-runner-security/verify-browser-smoke.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/migration-runner-security/verify-browser-smoke.mjs):
   - Browser smoke test verifying UI load, title creation, duplicate/invalid error handling, and selector availability.

---

## 9. Remaining Issues & Next Steps

- Zero unresolved migration security defects remain.
- All 25 required security test matrix checks pass.
- Historical database migrations remain cryptographically locked to exact approved checksums.
- Existing QA database records and fresh installations pass without regression.
- No business logic or feature changes were added.
- Scope limited strictly to migration-runner security hardening.
