# Senior demo questions

Prepared 6 October 2026. Local fictional training only. No product changes, deployment or new QA audit. All eight accounts passed a real Chromium login check. Passwords are only in Git-ignored qa/artifacts/training/LOCAL_DEMO_CREDENTIALS.md.

## What makes EduNexus different?

Connected responsibilities: enrollment feeds academics/fees; approved collections feed receipts and school accounts. Do not claim an unresearched competitive advantage.

## Is data separated between schools?

Business access is tenant-scoped; the supplied local reports record isolation checks. This does not imply separate physical databases or immunity from every future defect.

## Can teachers see fees?

The current Teacher fixture has no Fees/Finance access and cannot verify payments. Actual grants and API gates control access.

## Can parents see other children?

Only children linked to their guardian account in that institution; several linked siblings are supported.

## How do fee payments work?

External parent-to-school QR/UPI payment, proof submission, Accountant bank verification, then approval/receipt/balance.

## Why not directly mark paid?

It bypasses verification and can invent collections. Controlled approval rechecks balance and avoids duplicate posting.

## How does accounting work?

Equal debit/credit per financial event. Fees debit collection and credit fee income; expenses and other income use separate vouchers.

## Is Razorpay used for school fees?

No. Manual QR/UPI verification is the current fee path. Razorpay scaffolding belongs to the separate school software subscription.

## What happens when SaaS expires?

Operational access is gated; records remain. Owner can use own-school billing recovery; platform Super Admin is separate.

## Is live SaaS billing complete?

No. Provider subscription creation/cancellation currently use placeholders/local flags. Genuine provider operations and live end-to-end integration need completion, beyond merely entering credentials.

## Can coaching institutes use it?

The foundation maps session/course/batch to year/class/section. Specialized coaching/course/rolling-enrollment UI needs customization.

## Can schools have different roles?

Yes, roles/grants are managed per school. Custom Admin here is limited; some APIs also require canonical roles.

## Can I add modules later?

Further development is possible, but that is future work, not an existing delivered feature.

## Is it open source?

Only claim an open-source license after owner license selection/file and publication prerequisites. Visible source alone does not grant a license.

## Is it production ready?

The supplied report certifies a local release candidate. Production configuration, providers, backups/restore, monitoring and staging/live validation still require readiness work.

## What remains before deployment?

Provider operations if needed; secure environment/uploads; DNS/TLS; monitoring; backups/restore; delivery providers and owner legal/publication decisions. Training does not perform these.

## What if internet is unavailable?

No offline business-write mode is claimed. Browser operations need a reachable backend; local setup works only while its local services are reachable.

## What if email is unavailable?

Durable jobs/status exist; local email is LOG only. Real delivery needs a configured provider and operational handling. Do not say a real email was sent.

## What if Razorpay is unavailable?

Manual school fees are a different workflow. SaaS checkout cannot complete; browser callback cannot grant unverified paid entitlement.

## Can users recover passwords through OTP?

Not in current V1. Recovery truthfully reports unavailable; do not claim an implemented reset process.

## Are all menu words working integrations?

No. Attendance & QR is not proof of scanning; Notice & SMS is not proof of SMS; Online Pay here is the manual fee path. Feature Catalog is not automated provisioning proof.

## Evidence boundary

Sources: the eleven requested certification/UI documents and current mounted App components, Sidebar, permission policy, manual fee/parent portal, finance and subscription code. Local release-candidate certification is reported by FINAL_RC_RECERTIFICATION_REPORT.md; this training does not recertify it or establish production/provider readiness. Current UI takes precedence over older prototype routes and tab names.
