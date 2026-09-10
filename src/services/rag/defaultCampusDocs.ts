import { KnowledgeDocument } from './ragTypes';

export const DEFAULT_CAMPUS_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-cbse-academic-2026',
    title: 'CBSE & NEP 2020 Academic, Assessment & Attendance Manual',
    category: 'academics',
    targetRoles: ['all', 'admin', 'teacher', 'parent', 'student'],
    summary: 'Official criteria for 8-point grading, 75% attendance rule, term weightage, and holistic progress cards.',
    author: 'Academic Council & CBSE Board Secretariat',
    createdAt: '2026-01-15',
    content: `
# CBSE & NEP 2020 Academic and Assessment Guidelines

## Section 1: The 8-Point Scholastic Grading Scale
In alignment with CBSE secondary school regulations, academic performance across all subjects is evaluated on a standardized 8-point scale:
- Grade A1: Top 1/8th of passed candidates (91% - 100% marks). Grade Point: 10.0. Indicative Performance: Outstanding.
- Grade A2: Next 1/8th of passed candidates (81% - 90% marks). Grade Point: 9.0. Indicative Performance: Excellent.
- Grade B1: Next 1/8th of passed candidates (71% - 80% marks). Grade Point: 8.0. Indicative Performance: Very Good.
- Grade B2: Next 1/8th of passed candidates (61% - 70% marks). Grade Point: 7.0. Indicative Performance: Good.
- Grade C1: Next 1/8th of passed candidates (51% - 60% marks). Grade Point: 6.0. Indicative Performance: Satisfactory.
- Grade C2: Next 1/8th of passed candidates (41% - 50% marks). Grade Point: 5.0. Indicative Performance: Average.
- Grade D: Next 1/8th of passed candidates (33% - 40% marks). Grade Point: 4.0. Minimum Qualifying Grade for promotion.
- Grade E: Below 33% marks. Needs Improvement / Supplementary examination required.

## Section 2: Attendance Mandate for Board & Term Examinations
- A minimum of 75% overall physical attendance is strictly mandatory for any student to be eligible for Final Annual or Board Examinations.
- Medical Condensation: Up to 15% concession may only be granted by the Chairman / Principal upon submission of verified medical certificates within 7 calendar days of resuming classes.
- Automatic SMS and WhatsApp warnings are triggered to parents when student attendance falls below 80% and 75% thresholds via the EduNexus notification engine.

## Section 3: Term Weightages and NEP 2020 Holistic Progress Cards (HPC)
- Term 1 Examination carries 40% composite weightage (Pen-paper test: 30%, Internal Continuous Assessment: 10%).
- Term 2 Examination carries 60% composite weightage (Year-end cumulative test: 40%, Projects, Portfolios, and Lab Practicals: 20%).
- NEP 2020 360-degree assessment incorporates Self-Evaluation, Peer Review, and Teacher Formative Remarks evaluating critical thinking, empathy, and computational skills.
    `.trim()
  },
  {
    id: 'doc-fee-policy-byok',
    title: 'Tuition Fee Structure, BYOK Payment Gateway & Dues Policy',
    category: 'fees_finance',
    targetRoles: ['all', 'admin', 'accountant', 'parent'],
    summary: 'Direct school settlement rules via Razorpay BYOK, installment dates, sibling discounts, and late fee schedules.',
    author: 'Office of Finance & Accounts',
    createdAt: '2026-02-01',
    content: `
# Institutional Fee Policy and Direct Settlement Rules

## Section 1: Two-Tier Payment & BYOK Architecture
- EduNexus implements a 100% Bring-Your-Own-Key (BYOK) architecture for all parent tuition payments.
- When parents pay tuition fees via UPI, NetBanking, Debit/Credit Card, or EMI, the funds settle DIRECTLY into the school's verified corporate bank account via the school's own Razorpay or Cashfree merchant credentials.
- EduNexus SaaS charges 0% transaction commission on student tuition.
- Educational tuition fees are fully exempt from Goods and Services Tax (GST) under Indian Ministry of Finance Notification No. 12/2017-Central Tax.

## Section 2: Fee Installment Schedules & Grace Periods
Annual academic fees are billed across 4 quarterly installments:
- Quarter 1 (April - June): Due by April 15th (Grace period until April 30th).
- Quarter 2 (July - September): Due by July 15th (Grace period until July 31st).
- Quarter 3 (October - December): Due by October 15th (Grace period until October 31st).
- Quarter 4 (January - March): Due by January 15th (Grace period until January 31st).
- Late Fee Charges: A flat penalty of ₹50 per day is calculated after the grace period ends, capped at a maximum of ₹1,500 per installment.

## Section 3: Concessions, Scholarships and 3-Copy Invoicing
- Sibling Concession: A 15% waiver on annual tuition fee is provided to the younger sibling enrolled simultaneously in the school.
- Merit Concession: Top 3 rank holders in the annual board examinations receive a 50% academic scholarship for the following academic year.
- Upon successful payment, the EduNexus accounting desk automatically generates a tamper-evident, 3-copy GST-compliant tax receipt (School Copy, Parent Copy, Auditor Copy) with verifiable digital QR codes.
    `.trim()
  },
  {
    id: 'doc-transport-gps-protocols',
    title: 'School Bus Fleet, Live GPS Telemetry & Student Safety Protocols',
    category: 'transport',
    targetRoles: ['all', 'admin', 'parent', 'student'],
    summary: 'Rules for live GPS tracking, 5-second telemetry updates, speed governors, geofencing, and pickup authorization.',
    author: 'Department of Transport and Campus Security',
    createdAt: '2026-01-20',
    content: `
# Fleet Transport and GPS Tracking Operations

## Section 1: Live Vehicle Telemetry & Geofencing
- Every registered school bus is fitted with an AIS-140 certified GPS locator transmitting live coordinate telemetry every 5 seconds to the EduNexus Fleet Engine.
- Geofenced Proximity Alerts: Automated WhatsApp and push alerts are sent to parents when the bus approaches within a 1.5 km radius or 10 minutes of their designated stop.
- Speed Governors: School buses are hard-governed to a maximum speed limit of 40 km/h in urban corridors and 50 km/h on expressways. Instant SOS alerts are flagged on the Principal dashboard if speed exceeds 50 km/h.

## Section 2: Safe Boarding and Guardian QR Verification
- Drivers and conductors carry a handheld NFC/QR terminal. Students scan their digital or physical smart ID upon boarding and deboarding.
- Pickup Authorization: Only parents or guardians bearing the digital Parent Pickup Pass inside the EduNexus Parent Portal are permitted to receive pre-primary and primary students at bus stops.
- CCTV Surveillance: Two 1080p interior and road-facing cameras record continuously during transit with 30-day cloud backups.
    `.trim()
  },
  {
    id: 'doc-hostel-residential-rules',
    title: 'Hostel Allotment, Mess Dining & Residential Boarding Bylaws',
    category: 'hostel',
    targetRoles: ['all', 'admin', 'parent', 'student'],
    summary: 'Hostel room allotments, mandatory curfew timings, mess meal rotation, night study hours, and leave pass approvals.',
    author: 'Hostel Warden Committee',
    createdAt: '2026-01-28',
    content: `
# Residential Campus and Boarding Rules

## Section 1: Room Allocation & Amenities
- Students are accommodated in double and triple occupancy rooms equipped with biometric electronic access locks, ergonomic study desks, high-speed WiFi filtered via firewall, and individual lockers.
- Room cleanliness inspections are conducted bi-weekly by the Chief Warden. Smoking, vaping, and unauthorized electrical appliances (heaters, induction plates) are strictly prohibited.

## Section 2: Daily Timings and Curfew Hours
- Morning Roll Call: 06:30 AM in the common quadrangle.
- Breakfast: 07:00 AM to 08:15 AM.
- Evening Return Curfew: All hostel residents must return inside hostel perimeters by 07:30 PM in winter and 08:00 PM in summer.
- Silent Study Hours: 09:00 PM to 11:00 PM. High-volume sound and corridor loitering are prohibited.

## Section 3: Mess Nutrition and Digital Outing Passes
- The hostel mess operates under certified FSSAI food safety norms with a 4-week rotating nutritional menu offering balanced vegetarian and non-vegetarian options.
- Outing & Weekend Gate Pass: Weekend outings require a digital Outstation Pass approved by both the parent through the Parent Portal OTP and the Chief Warden.
    `.trim()
  },
  {
    id: 'doc-coaching-jee-neet-system',
    title: 'Coaching Academy, Test Series Rubric & JEE/NEET Rank Engine',
    category: 'coaching',
    targetRoles: ['all', 'admin', 'teacher', 'student'],
    summary: 'Guidelines for JEE Main/Advanced, NEET-UG test series, OMR optical scoring, negative marking, and AIR calculations.',
    author: 'Directorate of Competitive Examinations',
    createdAt: '2026-02-10',
    content: `
# Coaching Division & National Competitive Testing Engine

## Section 1: Batch Structure & Academic Tracks
- EduNexus Coaching Engine manages three distinct student cohorts:
  - Nurture Batch (Class 11 Foundation for JEE Main/Advanced & NEET).
  - Enthuse Batch (Class 12 Rigorous Target Exam preparation).
  - Leader / Repeater Batch (Full-time intensive dropper program).
- Dynamic batch shuffling occurs quarterly based on cumulative test series percentile ratings to foster healthy academic motivation.

## Section 2: Standardized Examination Marking Scheme
- JEE Main Pattern: Physics, Chemistry, Mathematics (30 questions each). Section A (MCQs: +4 for correct, -1 for incorrect, 0 for unattempted). Section B (Numerical: +4 for correct, -1 for incorrect).
- NEET-UG Pattern: Physics (45), Chemistry (45), Biology (90). Total 720 marks. (+4 for correct, -1 for incorrect response).
- Instant OMR Evaluation: The system processes camera-scanned physical OMR response sheets in under 0.8 seconds per sheet using the integrated computer vision engine.

## Section 3: All-India Rank (AIR) and Negative-Marking Diagnostics
- The Analytics Engine provides instant student scorecards featuring National Percentile, Subject-wise Accuracy Index, Time-per-Question Heatmap, and specific weak conceptual tags (e.g., Organic Reaction Mechanisms, Rotational Mechanics).
- Faculty doubt-resolution counters are scheduled daily between 04:00 PM and 06:30 PM.
    `.trim()
  },
  {
    id: 'doc-gate-security-turnstiles',
    title: 'Smart Gate QR Scanner Kiosk & Biometric Security Framework',
    category: 'gate_security',
    targetRoles: ['all', 'admin', 'teacher', 'parent', 'student'],
    summary: 'Turnstile gate operations, rapid QR verification, real-time arrival logs, and visitor digital gate passes.',
    author: 'Campus Security & Systems Integration',
    createdAt: '2026-02-15',
    content: `
# Campus Access Control & Gate Scanner Operations

## Section 1: High-Speed Gate QR and Biometric Attendance
- Security gates are equipped with EduNexus Smart Kiosks utilizing high-definition wide-angle optical cameras for sub-second QR code reading and optional facial recognition punch-in.
- Student ID Verification: As a student scans their digital or badge QR, the kiosk screen displays the student photograph, grade, roll number, and emergency contact details to the guard station.
- Real-Time Parent Notification: Scanning 'IN' immediately triggers an automated notification to the parent's registered mobile device: "Your child has arrived safely at school at 07:48 AM."

## Section 2: Visitor Digital Passes & Vendor Verification
- All campus visitors, vendors, and contractors must present a government-issued photo identity (Aadhaar / Voter ID) at the security desk.
- A single-use digital e-pass with a time-limited 4-hour expiration QR is issued and SMS-dispatched to the visitor's phone.
- The host department head must confirm entry approval inside their staff portal before visitor entry is authorized past the main foyer.
    `.trim()
  },
  {
    id: 'doc-examination-promotion-bylaws',
    title: 'School Examination, Promotion Bylaws & Hall Ticket Rules',
    category: 'academics',
    targetRoles: ['all', 'admin', 'teacher', 'parent', 'student'],
    summary: 'Minimum qualifying marks, re-examination rules, admit card eligibility criteria, and board submission timelines.',
    author: 'Examination Controller',
    createdAt: '2026-01-10',
    content: `
# Examination Bylaws and Promotion Standards

## Section 1: Qualifying Marks & Promotion Criteria
- A student must obtain a minimum of 33% marks in theory and 33% in practicals separately in each subject to qualify for promotion to the subsequent standard.
- Compartment / Supplementary Exams: Students failing in a maximum of two subjects are granted one opportunity to appear in the Supplementary Examination held in the first week of July.
- Unfair Means Code: Possessing mobile phones, smartwatches, or handwritten cheat materials inside the examination hall leads to automatic paper cancellation and disciplinary referral.

## Section 2: Admit Card / Hall Ticket Clearance
- Digital Admit Cards are published 14 days prior to term commencement on the Student & Parent portals.
- Prerequisites for Admit Card Release:
  - 100% clearance of outstanding tuition and transport dues for the respective quarter.
  - Verification of 75% minimum physical attendance.
  - Return of overdue library books and laboratory clearance certificates.
    `.trim()
  },
  {
    id: 'doc-staff-hr-payroll-rules',
    title: 'Faculty HR, Biometric Punching, Leaves & Payroll Bylaws',
    category: 'policies',
    targetRoles: ['all', 'admin', 'teacher', 'accountant'],
    summary: 'Biometric shift timings, casual/earned leaves, salary slip generation on 1st of month, and PF deductions.',
    author: 'Directorate of Human Resources',
    createdAt: '2026-01-05',
    content: `
# Faculty and Administrative Staff Bylaws

## Section 1: Working Hours & Biometric Punching
- Morning reporting time for instructional faculty is 07:45 AM. Staff arriving after 08:00 AM are marked with a 'Late In' tag. Three consecutive late punches result in half a day deducted from Casual Leave.
- Standard daily instructional workload consists of 6 teaching periods and 2 lesson-planning / collaborative periods.

## Section 2: Leave Quotas and Approvals
- Casual Leave (CL): 12 days per academic calendar year.
- Medical Leave (ML): 10 days per academic calendar year (medical certificate required for absences exceeding 2 consecutive days).
- Earned Leave (EL): 15 days accrued for non-vacation administrative personnel.
- All leave applications must be submitted digitally through the Teacher Portal at least 48 hours prior to planned leave.

## Section 3: Payroll Processing & Deductions
- Payroll is finalized on the 28th of every month and disbursed via NEFT/RTGS directly to faculty salary accounts on the 1st of each calendar month.
- Statutory deductions include Provident Fund (PF) at 12%, Professional Tax, and applicable TDS based on chosen Income Tax regime.
- Digitally signed payslips are available for download in the Teacher and Accountant portals.
    `.trim()
  }
];
