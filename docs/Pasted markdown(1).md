# Project Context: School + Coaching Centre ERP SaaS

Use this document to give any AI model full context on this project. Paste this whole file at the start of a new conversation.

---

## 1. Project Goal

Build a custom **School & Coaching Centre ERP (Management System)** to:

1. Pitch a specific school currently using a competitor product ("Scientific Study" — scientificstudy.co) and win them as a client with a cheaper, faster, more customizable alternative.
2. Eventually turn it into a **multi-tenant SaaS product** sold to multiple schools AND coaching centres.

Built and maintained solo by a final-year B.Tech CSE student who is also a working full-stack developer, alongside other freelance/agency client work.

---

## 2. Competitor Reference: Scientific Study (scientificstudy.co)

An established Indian School ERP, 1000+ schools including Indian Navy schools. Offers 20+ modules:

Student Attendance, Staff Attendance, Admission Management, Fee Management, Student Management, Staff Management, Transport Management, Library Management, Examination Management, Homework/Assignment Management, Timetable Management, Communication (SMS/Email/Notice), Alumni Management, Lesson Planning, Front Office/Inquiry Management, Hostel Management, Visitor Management, Report Card Generation, Certificate Management, HR & Payroll.

Plus: mobile app (parent + admin), live admin dashboard with stats/charts, QR-based flows (attendance, admission, visitor entry), multi-branch/group school support.

**Their model:** subscription-based SaaS, pricing not public. Positioned as the "Operating System for Schools."

---

## 3. Existing Foundation (Already Built — Reusable)

- **Play Place International School management system** — React + Supabase, 3 portals (public site, admin panel, parent portal)
- **EduQuery** — multi-tenant SaaS education query portal for schools AND coaching institutes, full Supabase backend, WhatsApp deep-link routing/escalation flows
- **QR-based attendance system** — built for a coaching institute
- Strong hands-on experience: React, Tailwind CSS, Framer Motion, GSAP, Supabase (deep), Node.js (learning)

These mean the project is **not starting from zero** — multi-tenant architecture, Supabase patterns, and QR attendance logic can all be reused.

---

## 4. Recommended Tech Stack

| Layer Tool Reason                              |                                             |                                                          |
| ---------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| Frontend (admin + teacher panel)               | React + Tailwind CSS                        | Existing strength                                        |
| Parent-facing app                              | React Native (or start as PWA)              | One codebase, upgrade to native later                    |
| Backend + Database                             | Supabase (PostgreSQL)                       | Existing strength — auth, DB, storage, realtime built in |
| Extra backend logic (PDFs, webhooks, WhatsApp) | Node.js + Express                           | Currently being learned                                  |
| Fee payments                                   | Razorpay                                    | Standard in Indian schools, UPI/card support             |
| SMS/WhatsApp alerts                            | WhatsApp Business API (Interakt or Gupshup) | Cheaper than SMS, higher parent read-rate                |
| QR attendance                                  | Reuse existing QR attendance project        | Already built                                            |
| Hosting                                        | Vercel (frontend) + Supabase (backend)      | Low cost, low maintenance for a solo dev                 |
| File storage                                   | Supabase Storage                            | Already integrated                                       |

**Hosting decision made:** Staying on Supabase + Vercel rather than a Hostinger VPS for now — VPS would work technically (shared hosting would NOT — it can't run Node.js/a real DB) but adds server-admin responsibility and security risk around student data that isn't worth it until there are 5-10+ paying clients and Supabase costs cross \~₹8,000-10,000/month.

---

## 5. Full Feature List

### A. Core ERP features (built once, labeled differently per client type)

| # Feature School label Coaching label  |                            |                             |                                      |
| -------------------------------------- | -------------------------- | --------------------------- | ------------------------------------ |
| 1                                      | Student/Learner Management | Student records             | Learner records                      |
| 2                                      | Attendance                 | Class attendance            | Batch/session attendance             |
| 3                                      | Staff Management           | Teacher profiles            | Faculty profiles                     |
| 4                                      | Group Management           | Class & Section             | Batch                                |
| 5                                      | Admission/Enrollment       | Yearly admission            | Anytime enrollment                   |
| 6                                      | Fee Management             | Annual fee structure        | Course fee + installments            |
| 7                                      | Timetable                  | Class timetable             | Batch schedule                       |
| 8                                      | Exams & Tests              | Exams, Report cards         | Test series, Rank lists              |
| 9                                      | Homework/Assignments       | Homework                    | Practice sheets                      |
| 10                                     | Communication              | SMS/Email/Notice to parents | SMS/Email/Notice to students/parents |
| 11                                     | Front Office/Inquiry       | Visitor & inquiry log       | Lead/inquiry log                     |
| 12                                     | Certificate Generation     | Certificates                | Certificates                         |
| 13                                     | HR & Payroll               | Staff salary                | Faculty salary                       |

**Optional add-ons (toggle ON only for schools):** Transport Management, Library Management, Hostel Management, Alumni Management, Visitor Management (gate pass), Lesson Planning.

### B. SaaS / Multi-tenant features

- Super Admin Panel (manage all clients from one place)
- Multi-tenant database (each client's data fully isolated)
- Feature toggles per client (turn modules ON/OFF per school/coaching centre)
- Custom labels per client (set "Class" vs "Batch" once per client)
- Billing & subscription system (auto monthly/yearly charges, renewal reminders)
- Self-onboarding flow (new client can set up in a day)
- Usage dashboard (active clients, revenue, growth)

### C. Coaching-centre flexibility features

- Many-to-many student-batch relationship (one student in multiple batches)
- Flexible enrollment dates (join anytime, course runs from join date, not fixed academic year)
- Lead/Inquiry CRM pipeline: New Inquiry → Demo Given → Follow-up → Enrolled/Lost
- Test series & rank comparison module
- Installment-based fee plans

### D. Differentiator features (vs. Scientific Study)

- AI WhatsApp assistant — instant AI answers to parent/student queries (fees, exam dates, etc.)
- AI-written report summaries — auto-generated plain-language performance summary, not just marks
- Fast local/personal support — same-day fixes, direct access to the developer (vs. big company ticket system)
- Lightweight, no feature bloat — only what a small school/coaching centre actually needs
- Fast per-client customization — since it's owned code, client-specific requests can ship in days

### E. Mobile/App layer

- Parent/Student app (or PWA to start): attendance, fees, results, notifications
- Admin app: quick approvals, attendance, on-the-go dashboard
- Push notifications: fee dues, exam results, announcements

---

## 6. Architecture Principle (Critical)

Build the **settings/config layer first**, even before launching to the first school:

- Labels stored as per-client config (not hardcoded text)
- Feature toggles per client from day one
- Flexible enrollment dates and many-to-many student-batch relationships built into the database from the start

Reasoning: retrofitting multi-client flexibility after building a single-school-only version typically means rebuilding half the system. Planning it into the data model now costs about 1-2 extra weeks; doing it later costs much more.

---

## 7. Timeline (Solo Developer)

**Phase 1 — Single-school MVP (\~11-13 weeks / 2.5-3 months):**

1. Setup + core database + role-based login (\~1 week)
2. Student, staff & attendance modules, incl. QR reuse (\~2-3 weeks)
3. Fee management + Razorpay integration (\~2 weeks)
4. Admissions, timetable & exams/report cards (\~3 weeks)
5. Parent communication via WhatsApp + parent portal (\~2 weeks)
6. Testing + demo polish (\~1 week)

**Phase 2 — SaaS conversion (\~5-7 additional weeks):**

- Multi-tenant database conversion (\~2-3 weeks)
- Super admin panel (\~1-2 weeks)
- Billing/subscription system (\~1-2 weeks)
- Self-onboarding flow (\~1 week)

**Phase 3 — Coaching-centre flexibility (\~1-2 additional weeks if planned early):**

- Config/label system, flexible batch & enrollment logic (best done alongside Phase 1, not after)

**Total to full SaaS with both school + coaching support: \~4-4.5 months solo**, less than that if reusing existing EduQuery/Play Place/QR code directly.

---

## 8. Cost Estimate

**Cash costs (approximate, India-based, solo dev):**

| Item Cost                                                                       |                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------- |
| Business registration (LLP/Pvt Ltd)                                             | ₹5,000-15,000 one-time                         |
| GST registration                                                                | Free-₹2,000                                    |
| Terms of Service + Privacy Policy (proper review needed — handles student data) | ₹3,000-10,000 one-time                         |
| Domain + SSL                                                                    | ₹1,000-1,500/year                              |
| Supabase hosting                                                                | Free tier → ₹2,000-8,000/month as it scales    |
| WhatsApp Business API                                                           | ₹1,000-5,000/month, scales with message volume |
| Razorpay                                                                        | Free setup, \~2% per transaction               |
| Basic marketing materials                                                       | ₹5,000-20,000 (optional early on)              |

**Rough total to launch: ₹15,000-40,000 cash**, growing monthly cost of \~₹3,000-10,000 as more clients are added.

**Market comparison (if hiring devs instead):** a small team (1 full-stack dev + 1 designer) would typically cost ₹3-6 lakh over 4-5 months for equivalent scope in India — building it solo avoids most of this cash cost, at the expense of personal time.

**Pricing to charge clients:** Scientific Study's exact pricing isn't public; general Indian school-ERP market range is roughly ₹50-150 per student/year or ₹50,000-2,00,000/year flat, depending on school size — treat as a rough market reference, not a confirmed number. As a solo dev with lower overhead, undercutting by 40-60% (e.g., \~₹40,000-70,000/year + a one-time ₹15,000-25,000 setup fee for a mid-size school) is a plausible competitive starting point, to be validated against what the target school currently pays.

---

## 9. Open Strategic Notes

- Recommended first step before building: ask the target school directly what they dislike about their current ERP (slow support, confusing UI, missing feature) — that becomes the strongest pitch angle.
- Recommended sequencing: build and sell the single-school version first, get one paying client locked in, THEN invest the extra weeks into full SaaS conversion — so the first client's payment partly funds that conversion.
- Do not build all 20 Scientific-Study-parity modules before pitching; build the 6-7 most-used ones (attendance, fees, admissions, exams, timetable, parent communication) plus 1-2 AI differentiators, and pitch that as an MVP with "more coming in phase 2."