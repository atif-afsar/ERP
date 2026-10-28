# Rebrand + New Domain + Google Play App — Plan

Status: **draft for owner review** · Written 2026-10-26 · Nothing in this plan has been executed yet.

This plan covers two projects:

1. **Rebrand** EduNexus to a new name and move the frontend and backend to the new domain.
2. **Ship an Android app on Google Play** that runs on the same codebase as the website.

Rebranding comes first. The Play Store listing name, the Android package ID (permanent once published), the privacy-policy URL and the app's deep links all depend on the final name and domain.

---

## 0. Decisions needed before Phase 1

Decided values are marked ✅. Where the plan below says `NewName` / `newdomain.com`, read **EzyAura** / **ezyaura.in**.

| # | Decision | Value | Notes |
|---|---|---|---|
| D1 | New product name | ✅ **EzyAura** (one word, capital E and A, matches the domain) | Check trademarks (IP India, class 9/42) and that no Play Store app already uses it |
| D2 | New domain | ✅ **ezyaura.in** | Site: `www.ezyaura.in`, API: `api.ezyaura.in` |
| D3 | Android package ID | Proposed `in.ezyaura.app` | **Cannot be changed after the first upload to Play.** Confirm before Phase 4 |
| D4 | Support / sender emails | ✅ Support: `ezyaura.support@gmail.com` (in the app since Phase 1). Sender: `notifications@ezyaura.in` | The sender must be on ezyaura.in, because Resend can only send from a domain you verify, not from Gmail. Set it up in Phase 2 |
| D5 | Play developer account type | Undecided | Organization needs a D-U-N-S number but skips the "12 testers for 14 days" rule that applies to new personal accounts. Needed before Phase 7 |
| D6 | Keep the old domain? | Yes, redirect for at least 12 months | Old email links, bookmarks and Google rankings point to `edunexus.network` |
| D7 | Rename internal identifiers? | **No** (recommended) | DB name, PM2 names, `/var/www/edunexus`, localStorage keys. See §1.4 |
| D8 | Students under 13 in the app? | Decide (see §6.4) | Determines whether Google's Families policy applies |

---

## 1. What the rename touches (findings from the code)

A scan of tracked files found **~665 occurrences** of "EduNexus"/"edunexus". About half are in `qa/` and `docs/`, which are stale. The parts that matter fall into five groups.

### 1.1 User-visible text in the app (must change)

| Area | Files |
|---|---|
| Header, sidebar, login, reset password | `frontend/src/components/layout/Header.tsx`, `Sidebar.tsx`, `components/auth/LoginView.tsx`, `ResetPasswordView.tsx` |
| Landing page, FAQ, footer | `frontend/src/modules/public/LandingPage.tsx` |
| Sign-up / onboarding | `frontend/src/components/public/InstituteOnboardingModal.tsx` (also the UPI note `tn=EduNexus…`) |
| Assistant widgets | `frontend/src/components/ai/AssistantWidget.tsx`, `PublicAssistantWidget.tsx` |
| Subscription & Super Admin | `modules/saasBilling/SaaSBillingModule.tsx` (fallback UPI `edunexus@upi`, payee "EduNexus ERP"), `modules/superadmin/SuperAdminSaaSModule.tsx` |
| QR screen instructions | `modules/qrAttendance/QrSessionPanel.tsx` ("Open EduNexus → Attendance → …") |
| Lapsed-subscription screen | `frontend/src/App.tsx:67` hard-codes `billing@edunexus.io`, which is an address we don't use. Replace it with D4 |
| Dashboard welcome | `modules/dashboard/DashboardModule.tsx` |

### 1.2 Backend text (must change)

| Area | Files |
|---|---|
| AI system prompts ("You are the EduNexus Assistant…") | `backend/src/services/geminiService.ts`, `routes/ai.ts`, `routes/publicAssistant.ts` |
| Email sender default | `backend/src/config.ts` → `EMAIL_FROM_NAME` default (prod sets it via `.env`) |
| Fallback names in emails | `routes/organization.ts` (`school_name … \|\| 'EduNexus'`) |
| QR error message | `routes/qrAttendance.ts` ("This is not an EduNexus attendance QR code.") |
| Default payment settings | `routes/adminBilling.ts` (`'EduNexus Technologies'`, `'edunexus@upi'`). Only defaults; real values are in the DB and editable by the Super Admin |
| Startup log line | `backend/src/server.ts:168` |

### 1.3 Text stored in the database (needs a migration)

Seed data inserted by already-applied migrations still contains the brand. We **must not edit those migrations**, because the runner checks their checksums. Instead, add one new migration:

- `native_0051_rebrand.sql`: idempotent `UPDATE … SET col = replace(col, 'EduNexus', 'NewName')` on:
  - notification/email templates (from 0014, 0041, 0042, 0045): subject + body
  - assistant help articles (from 0046, 0049): title + body. Rebuild the full-text `tsvector` if it is a stored column
  - platform payment settings, only if they still hold the default `EduNexus Technologies` / `edunexus@upi`
- A test asserting that no active template or help article contains "EduNexus" after migrating.

### 1.4 Internal identifiers (recommend keeping)

Users never see these. Renaming them costs a lot and carries risk:

| Identifier | Why keep it |
|---|---|
| DB names `edunexus_erp`, `edunexus_user`, `edunexus_erp_test` | Renaming the live DB means downtime, a new `DATABASE_URL` and changes to backups and scripts |
| PM2 `edunexus-api` / `edunexus-worker`, `/var/www/edunexus`, `/var/log/edunexus` | Server paths; renaming them needs a coordinated VPS change for no user benefit |
| localStorage `edunexus_auth_token`, event `edunexus_unauthorized`, `edunexus_ai_conversation:*` | Renaming the token key **signs out every user**. In Phase 3 it moves behind a storage helper anyway |
| JWT `iss`/`aud` (`edunexus-api`/`edunexus-web`) | Changing them invalidates every live session. Optional, env-driven |
| npm package names `edunexus-frontend` etc. | Never shown |
| QR payload prefix `ENX-QR2` | Protocol constant; changing it breaks QR codes on screens during rollout |

If you later want a clean internal rename, do it as a separate, scheduled maintenance task.

### 1.5 Domain references (must change)

| Where | Today |
|---|---|
| `frontend/index.html` | canonical, hreflang, Open Graph, Twitter and JSON-LD all use `https://www.edunexus.network/` (~25 places) |
| `frontend/public/robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest` | old domain + old name |
| `frontend/public/logo.png`, `favicon.*`, `og-image.png` | old logo artwork |
| `frontend/vite.config.ts` | example API URL in the error message |
| Backend `.env` on the VPS | `FRONTEND_URL`, `CORS_ORIGIN`, `APP_PUBLIC_URL`, `EMAIL_FROM_*` |
| Vercel env | `VITE_API_URL=https://api.edunexus.network/api/v1` |
| `backend/deploy/nginx.conf` | `server_name` and certificate paths (still example values) |
| `docs/DEPLOYMENT.md`, `README.md`, `AGENTS.md` | old domain and name |

Links in emails (password reset, invitations) are built from `APP_PUBLIC_URL`. Changing the env var changes them; no code change is needed.

---

## 2. Technology choice for the Android app

### 2.1 Recommendation: Capacitor

**Capacitor** (by Ionic) wraps the existing React + Vite build in a native Android project. The same `frontend/` code then runs on the website (Vercel) and in the Play Store app. Native plugins cover what a plain browser can't do well.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Capacitor** | Reuses 100% of the React code; native plugins (push, camera scanner, files, share, secure storage); iOS later for little extra work | Native project to maintain; frontend changes ship through Play releases | **Recommended** |
| Trusted Web Activity (Bubblewrap/PWABuilder) | Fastest; the app just shows the live website | No real native features; downloads and the camera behave like Chrome; higher risk of rejection under Play's "minimum functionality" policy for thin wrappers | Fallback only |
| React Native / Expo | Fully native UI | Rewrite of every screen; two codebases | Not worth it for V1 |
| Flutter | Fully native UI | Full rewrite in Dart | No |

### 2.2 Proposed stack

| Layer | Technology | Purpose |
|---|---|---|
| App shell | `@capacitor/core`, `@capacitor/android` (latest major, check that it targets Play's current required API level) | Android project in `frontend/android/` |
| Build | Android Studio + Gradle, JDK 21, signed **AAB** | Play only accepts AAB |
| Icons / splash | `@capacitor/assets`, `@capacitor/splash-screen` | Generated from one logo |
| Status bar / safe areas | `@capacitor/status-bar`, CSS `env(safe-area-inset-*)` | Edge-to-edge display (enforced on recent Android) |
| Back button, deep links | `@capacitor/app` | Hardware back = go back in the hash router; App Links for reset/invite emails |
| Token storage | `@capacitor/preferences` (or a secure-storage plugin) | Replaces direct `localStorage` on native |
| File downloads | `@capacitor/filesystem` + `@capacitor/share` | CSV exports, receipts, payslips, proof files. `<a download>` with blob URLs does **not** work in Android WebView |
| QR scanning | `@capacitor-mlkit/barcode-scanning` | Native, fast scanner; the web keeps `BarcodeDetector`/`jsqr` |
| Push notifications | `@capacitor/push-notifications` + Firebase Cloud Messaging; backend `firebase-admin` | Notices, fee approvals, results, homework |
| Network state | `@capacitor/network` | "You're offline" screen instead of failed requests |
| External links | `@capacitor/browser` / app launcher | Open `upi://` links in UPI apps and web links in Chrome Custom Tabs |
| CI | GitHub Actions job: `vite build` → `npx cap sync` → `gradlew bundleRelease` | Reproducible AAB builds |

No change is needed in the backend stack (Express + Postgres on the VPS). It gains one table and one service for push notifications (Phase 5).

### 2.3 How web and app share the code

```
frontend/src  ──vite build──►  frontend/dist ──► Vercel (website, www.newdomain.com)
                                     │
                                     └──npx cap sync──► frontend/android ──Gradle──► .aab ──► Google Play
Both call ──► https://api.newdomain.com/api/v1  (VPS, Nginx, PM2)
```

- One code path, with a small **platform layer** (`frontend/src/platform/`) that picks the web or native implementation for storage, downloads, sharing, scanning, external links and push. Screens call the platform layer, never Capacitor directly.
- The hash router (`#/app/...`) works as-is inside Capacitor.
- Inside the app, the page origin is `https://localhost`. The backend must allow it in `CORS_ORIGIN`. The existing config check accepts it because it is HTTPS.
- On native builds, hide the public marketing pages and open the app on `#login`.

---

## 3. Phases

Each phase can ship on its own, and the website keeps working after each one.

### Phase 1 — Centralize the brand and rename in code (no domain change yet)

**Goal:** after this phase, the next rename touches one file per side.

1. Add `frontend/src/config/brand.ts` (`name`, `shortName`, `legalName`, `supportEmail`, `siteUrl`, `logo`) and use it everywhere listed in §1.1.
2. Add a backend `BRAND_NAME` constant (or env with default) and use it in the AI prompts, fallback names and the QR error (§1.2).
3. Replace `billing@edunexus.io` in `App.tsx` with the brand support email.
4. Add migration `native_0051_rebrand.sql` (§1.3) + test.
5. New logo, favicon, `og-image.png`; update `site.webmanifest`, `index.html` title/meta (name only, URLs in Phase 2), `llms.txt`.
6. Update tests that assert on brand strings. Run `npm run build` and `npm run test:backend`.
7. Update `AGENTS.md`, `README.md`, `docs/DEPLOYMENT.md`. Leave `qa/` and the stale docs alone.

**Done when:** a search for `EduNexus` in `frontend/src`, `backend/src` and `frontend/public` returns only the intentional internal identifiers from §1.4.

### Phase 2 — Move to the new domain

**Goal:** `www.newdomain.com` serves the site, `api.newdomain.com` serves the API, and the old domain redirects.

Order matters. Bring the new domain up next to the old one, then switch.

1. **DNS** (at the registrar):
   - `www` → CNAME to Vercel; apex `newdomain.com` → Vercel A record (redirect apex → www in Vercel).
   - `api` → A record to the VPS IP.
2. **Backend (VPS):**
   - Add `api.newdomain.com` to Nginx `server_name` (keep the old API host too); `certbot --nginx -d api.newdomain.com`.
   - `.env`: `FRONTEND_URL=https://www.newdomain.com`, `CORS_ORIGIN=https://newdomain.com,https://www.edunexus.network,https://edunexus.network` (old origins during the transition), `APP_PUBLIC_URL=https://www.newdomain.com`.
   - `pm2 reload edunexus-api && pm2 restart edunexus-worker`.
3. **Email (Resend):** add and verify `newdomain.com` (SPF, DKIM, DMARC records); then set `EMAIL_FROM_ADDRESS=notifications@newdomain.com`, `EMAIL_FROM_NAME=NewName`. Send one test password-reset email.
4. **Frontend (Vercel):** add both domains to the project; set `VITE_API_URL=https://api.newdomain.com/api/v1`; redeploy.
5. **Code:** replace every `edunexus.network` URL in `index.html`, `robots.txt`, `sitemap.xml`, `llms.txt` (§1.5); update `backend/deploy/nginx.conf` and `vite.config.ts`.
6. **Old domain:** in Vercel, set `www.edunexus.network` and `edunexus.network` to **301 redirect** to `https://www.newdomain.com` (path and hash kept, so old reset links still work). Keep `api.edunexus.network` serving the API for 30+ days, because browsers with the old build still cached may call it.
7. **SEO:** Google Search Console → add and verify the new domain → submit the sitemap → use **Change of Address** from the old property. Update social profiles and Google Business listing.
8. **Smoke test:** sign up, sign in, password reset email link, invite link, fee proof upload, receipt download, QR attendance, assistant on the landing page.

**Done when:** the smoke test passes on the new domain, and old URLs redirect.

**Rollback:** revert `VITE_API_URL` in Vercel and the `.env` values; the old domain was never removed.

### Phase 3 — Make the web app mobile-ready (still web only)

**Goal:** the React app behaves correctly inside a WebView before any Android code exists. Each change also improves the mobile website.

1. **Platform layer** `frontend/src/platform/`: `isNative()`, `storage`, `downloadFile(blob, name)`, `shareFile`, `openExternal(url)`, `scanQr()`. Web implementations only for now.
2. **Token storage:** move `apiClient.ts` token reads/writes to `platform.storage`. Migrate the old `edunexus_auth_token` value on first read so nobody is signed out.
3. **Downloads:** route `reportsService.ts`, `spreadsheetImport.ts`, the attendance export in `AcademicOperationsModule.tsx`, fee proofs/receipts (`ParentFeePortal.tsx`) and the Super Admin proof download through `downloadFile`.
4. **UPI links** (`InstituteOnboardingModal.tsx`, `SaaSBillingModule.tsx`, `ParentFeePortal.tsx`): go through `openExternal`.
5. **Sessions:** the JWT lasts 1 hour (`JWT_EXPIRES_IN=1h`). App users expect to stay signed in for weeks. Add **refresh tokens**: a `refresh_tokens` table (migration 0052, hashed, rotating, revoked by `auth_version`), `POST /auth/refresh`, and a silent refresh in `apiClient.ts`. This also fixes mid-task timeouts on the website.
6. **Mobile UI audit** at 360×800: sidebar → drawer, wide tables → horizontal scroll or cards, modals fit the screen, tap targets ≥ 44px, safe-area padding. Main screens: Dashboard, Attendance, Fees (parent), Homework, Timetable, Results, QR check-in, My HR.
7. **Network:** raise the 10 s API timeout for uploads (proof images are up to ~12 MB base64); show a clear offline message.
8. **Rate limits:** mobile carriers put many users behind one IP (CGNAT). Check `globalLimiter` and the per-IP public assistant limit. Key authenticated limits on user ID, not IP.

**Done when:** the website still passes all tests, and the main screens work well in Chrome DevTools' mobile view.

### Phase 4 — Android shell with Capacitor

**Goal:** a signed AAB that installs and works on a real phone.

1. `npm i @capacitor/core @capacitor/cli @capacitor/android` in `frontend/`; `npx cap init "NewName" com.newdomain.app --web-dir dist`; `npx cap add android`. Commit `frontend/android/`, ignoring build outputs.
2. `capacitor.config.ts`: `androidScheme: 'https'`, splash/status bar settings, and **no** `server.url`. The app runs from bundled files, not from the live website.
3. A build mode for the app: `vite build --mode android` sets `VITE_PLATFORM=android`, so the build opens on `#login` and hides the public marketing pages.
4. Backend `CORS_ORIGIN` += `https://localhost`.
5. Native implementations in the platform layer: Preferences storage, Filesystem + Share for downloads, Browser/App Launcher for `upi://` and external links, `App` back button handling (go back, or exit from Dashboard/Login).
6. Icons and splash from the new logo (`npx @capacitor/assets generate`); adaptive icon; app name `NewName`.
7. `AndroidManifest.xml`: `INTERNET`, `CAMERA` (QR), `POST_NOTIFICATIONS` (Phase 5). Nothing else. Don't request storage permissions; Filesystem + Share don't need them.
8. **Android App Links:** host `https://www.newdomain.com/.well-known/assetlinks.json` (Vercel, from `frontend/public/.well-known/`) with the Play app-signing SHA-256, so reset/invite email links open in the app when it is installed.
9. **Signing:** create an upload keystore, store it and its passwords outside the repo (password manager + offline backup), and enable **Play App Signing**.
10. `versionCode` / `versionName` rule: `versionName` = app version (`1.0.0`), `versionCode` incremented on every upload.

**Done when:** a release AAB, installed through Play internal testing on 2–3 real Android phones (one older and low-end, Android 10/11), passes the Phase 2 smoke test.

### Phase 5 — Native features that make it a real app

These features make the app more useful than the website. They also lower the risk of rejection under Play's policy against apps that only wrap a website.

1. **Push notifications (FCM):**
   - Firebase project + `google-services.json` (gitignored, injected in CI).
   - Migration: `device_tokens (id, tenant_id, user_id, platform, token, last_seen_at)` with a unique token.
   - `POST /notifications/devices` (register) and `DELETE` (on sign-out).
   - `worker.ts`: after an in-app notification is created, send FCM to the user's tokens via `firebase-admin`. The service-account JSON lives in backend `.env`/a file on the VPS, never in the frontend. Remove tokens that FCM reports as invalid.
   - Tapping a notification opens the matching screen (`#/app/notices`, `#/app/fees`, …).
2. **Native QR scanner:** `@capacitor-mlkit/barcode-scanning` in `platform.scanQr()` for `StudentQrCheckIn.tsx`. The 6-digit code fallback stays.
3. **Camera for fee proofs:** the file input already accepts images; check that Android offers "Camera" and "Files" in the picker.
4. **Forced update check:** `GET /app/config` → `{ minVersionCode, latestVersionCode }`. If the app is older than `minVersionCode`, show "Please update" with a Play Store link. Needed because API changes can break old app builds that users haven't updated.

### Phase 6 — Play Store compliance and listing

| Requirement | What we do |
|---|---|
| **Privacy policy** (public URL) | New public page `#/privacy` + static `https://www.newdomain.com/privacy`. Covers what we collect (student/parent/staff records, attendance, payment proofs, device push tokens), that schools own their data, Gemini processing for the assistant, retention, contact |
| **Terms of service** | `#/terms` page |
| **Account deletion** (required for apps with accounts) | (a) In-app: Settings → "Delete my account" → creates a deletion request. (b) Public web page `#/delete-account` that works without the app. Backend: `account_deletion_requests` table; the Super Admin/institution owner processes requests. Explain that the institution may keep academic and fee records as required by law, and that personal login data is deleted |
| **Data safety form** | Declare: name, email, phone, photos (payment proofs), app activity; encrypted in transit; deletion possible; no data sold; no ads |
| **Payments policy** | **Hide buying or renewing the EduNexus/NewName subscription inside the Android app** (plans, prices, payment proof for the SaaS plan). Selling digital services in an Android app normally requires Google Play Billing. Owners renew on the website; the app says "Your subscription is managed by your institution's administrator." **Parent school-fee payments can stay**: they pay for real-world education, which is outside Play Billing. Re-check the current Play payments policy for India before submission |
| **AI-generated content** | The assistant needs a way to report bad answers. The existing feedback endpoint covers this; make sure the 👎 button is visible in the app. Consider turning the assistant off for the STUDENT role in the app (see D8) |
| **Content rating** | IARC questionnaire: education/business, no violence, user-to-user communication = notices only |
| **Target audience** | See §6.4 |
| **Reviewer access** | The app requires sign-in, so give Google a demo institution with owner, teacher, parent and student logins (test data only, not `LOGINS.md` credentials) |
| **Store listing** | App name (≤ 30 chars), short description (≤ 80), full description, 512×512 icon, 1024×500 feature graphic, 4–8 phone screenshots, category: Education, contact email, privacy-policy URL |
| **Target API level** | Build with the latest Capacitor and the Android SDK Play currently requires (it goes up every August) |

#### 6.4 Students under 13 (decision D8)

The student portal will be used by school children. Two options:

- **A. Declare the target audience as 13+/18+** and describe the app as a tool for institutions; younger students use the website. Simpler, but if children clearly use the app, Google may still apply the Families policy.
- **B. Include under-13 age groups** and follow the Families policy: no ads (already none), only Families-certified SDKs (Firebase Messaging is acceptable; avoid analytics SDKs), stricter privacy disclosures, and probably no AI assistant for students.

Recommendation: **B**. It is honest about actual use and protects the listing long term. The extra work is mostly disclosures, plus disabling the assistant for STUDENT on native.

### Phase 7 — Testing and release

1. **Internal testing** track: the team, 2–3 days, real devices.
2. **Closed testing:** 5–10 friendly institutions. A *new personal* developer account needs **12+ testers opted in for 14 days** before it can apply for production; an organization account doesn't (D5).
3. **Production** with a **staged rollout** (10% → 50% → 100%); watch Play Console crash/ANR reports and API logs.
4. Announce to institutions, put a "Get it on Google Play" badge on the website, and add the app link to the welcome/invite emails.

### Phase 8 — Ongoing operations

- **CI:** add an Android job to `.github/workflows/ci.yml` that builds the AAB on tags. Signing secrets go in GitHub Secrets. Optionally upload to the internal track with `fastlane supply` or the Play Developer API.
- **Release rule:** backend changes must stay compatible with the oldest app version still allowed by `minVersionCode`. Never remove an API field that a released app reads without first raising `minVersionCode`.
- **Every August:** raise the target SDK to Play's new requirement.
- **iOS (later, optional):** `npx cap add ios`. The same platform layer works; needs a Mac + Apple Developer account (US$99/yr).

---

## 4. Rough effort

| Phase | Size | Comment |
|---|---|---|
| 1 Brand centralization + rename | M | Mostly mechanical; migration + tests |
| 2 Domain move | S (code) + DNS wait | 1 day of work; DNS/SSL/Resend verification can take hours |
| 3 Mobile-ready web app | L | Refresh tokens and the mobile UI audit are the big items |
| 4 Capacitor shell | M | First Android build, signing, App Links |
| 5 Native features | M–L | Push notifications are the largest piece |
| 6 Compliance + listing | M | Privacy/terms/deletion pages + Play Console forms + screenshots |
| 7 Testing + release | Calendar time | 14+ days if the 12-tester rule applies |

## 5. Costs outside the code

| Item | Cost |
|---|---|
| Google Play developer account | US$25 one time |
| D-U-N-S number (organization account) | Free (takes days to weeks) |
| Firebase Cloud Messaging | Free |
| New domain + old domain renewal | Yearly registrar fee for both while redirecting |
| Resend | Existing plan; one more verified domain |
| Apple (only if iOS later) | US$99/year |

## 6. Main risks

| Risk | Mitigation |
|---|---|
| Rejected as a thin "website wrapper" | Native scanner, push notifications, downloads/share, offline screen (Phase 5) before the first production submission |
| Rejected over subscription payments | Hide SaaS plan purchase on native (Phase 6) |
| Old app builds break after API changes | `minVersionCode` forced-update check (Phase 5) + backward-compatible API rule |
| Lost upload keystore | Play App Signing + keystore backed up in two places |
| Users signed out by the rename | Keep the token key, or migrate it (Phase 3 step 2) |
| SEO drop after the domain move | 301 redirects, Search Console Change of Address, keep the old domain ≥ 12 months |
| Emails go to spam from the new domain | SPF + DKIM + DMARC verified in Resend before switching `EMAIL_FROM_ADDRESS` |
| Per-IP rate limits block whole schools on mobile data | Key authenticated limits by user (Phase 3 step 8) |

## 7. Suggested order of execution

1. Make decisions D1–D8 and order the D-U-N-S number now (it takes the longest).
2. Phase 1 → deploy.
3. Phase 2 → deploy, smoke test.
4. Phase 3 → deploy (the website benefits right away).
5. Phases 4 + 5 together → internal testing.
6. Phase 6 in parallel with closed testing.
7. Phase 7 → production.
