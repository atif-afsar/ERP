/**
 * EduNexus Embedded Intelligence Brain
 * 
 * 100% Client-side, zero-latency, offline-first ChatGPT-grade knowledge engine.
 * Encapsulates complete operational knowledge across all 28 modules, dual-operating
 * engines (K-12 School & Coaching Academy), campus bylaws, payment systems,
 * calculations, and multi-turn conversational context.
 */

export interface ActionLink {
  label: string;
  route: string;
  badge?: string;
}

export interface ConversationTurn {
  sender: 'user' | 'ai';
  text: string;
}

export interface BrainResponse {
  reply: string;
  actions: ActionLink[];
  followUps: string[];
  citations?: { title: string; category: string; matchScore: number }[];
  category: string;
}

export interface UserContext {
  role?: string;
  isLoggedIn?: boolean;
  tenantName?: string;
  isSchool?: boolean;
  activeStudentName?: string;
  currentRoute?: string;
}

/**
 * Embedded Knowledge Topics Database
 */
interface TopicKnowledge {
  id: string;
  category: string;
  keywords: string[];
  title: string;
  summary: string;
  contentGenerator: (ctx: UserContext, history?: ConversationTurn[]) => {
    reply: string;
    actions: ActionLink[];
    followUps: string[];
  };
}

const TOPICS_DB: TopicKnowledge[] = [
  // -------------------------------------------------------------
  // 1. FEE MANAGEMENT & TWO-TIER PAYMENTS
  // -------------------------------------------------------------
  {
    id: 'fees-and-payments',
    category: 'Finance & Fees',
    title: 'Tuition Fee Structure, BYOK Payment Gateway & Dues Policy',
    keywords: [
      'fee', 'fees', 'tuition', 'payment', 'collection', 'razorpay', 'cashfree', 'gateway', 
      'installment', 'due', 'dues', 'byok', 'receipt', 'late fee', 'scholarship', 'concession',
      'billing', 'refund', 'gst', 'tax'
    ],
    summary: 'Bring-Your-Own-Key (BYOK) direct bank settlements, 4-quarter installment schedule, late fee penalties, and 3-copy tax receipts.',
    contentGenerator: () => ({
      reply: `### 💳 Fee Management & Institutional BYOK Architecture

EduNexus ERP implements a **100% Bring-Your-Own-Key (BYOK)** direct settlement architecture for school and coaching tuition fees.

---

#### 1. How the Two-Tier Payment Model Works
| Tier | Description | Settle Target | Platform Commission |
| :--- | :--- | :--- | :--- |
| **School Tuition** | Parents pay student tuition, transport & lab fees | **Directly to School's Bank** via Razorpay/Cashfree | **0% (EduNexus touches ₹0)** |
| **SaaS Subscription** | School Director pays monthly software licenses | EduNexus Corporate Master Account | Standard SaaS Billing |

> 💡 **Legal & Tax Compliance**: Student tuition is 100% GST-exempt under Ministry of Finance Notification 12/2017. Because funds settle directly into your school bank, there is **zero RBI payment aggregator liability** and zero chargeback dispute risk.

---

#### 2. Installment Schedules & Grace Periods
Annual academic fees are billed across **4 quarterly cycles**:
- **Quarter 1 (Apr – Jun)**: Due **April 15th** *(Grace period until April 30th)*
- **Quarter 2 (Jul – Sep)**: Due **July 15th** *(Grace period until July 31st)*
- **Quarter 3 (Oct – Dec)**: Due **October 15th** *(Grace period until October 31st)*
- **Quarter 4 (Jan – Mar)**: Due **January 15th** *(Grace period until January 31st)*
- **Late Fee Penalty**: ₹50/day after grace period ends *(capped at ₹1,500 max per installment)*.

---

#### 3. Concessions & Official 3-Copy Tax Receipts
- **Sibling Concession**: 15% annual tuition waiver for younger siblings enrolled simultaneously.
- **Merit Concession**: 50% academic scholarship for annual board exam top-3 rank holders.
- **Tamper-Evident Receipts**: Every payment automatically generates a 3-copy receipt (**School Copy**, **Parent Copy**, and **Auditor Copy**) with verifiable QR verification codes.`,
      actions: [
        { label: 'Open Fee Collection Desk', route: 'app/fees', badge: 'Cashier' },
        { label: 'Payment Gateway Keys (BYOK)', route: 'app/settings', badge: 'API Keys' },
        { label: 'Financial Reports & P&L', route: 'app/finance', badge: 'Ledger' },
      ],
      followUps: [
        'How do I record an offline cash or cheque fee payment?',
        'How do parents pay tuition fees online?',
        'What are the late fee grace periods?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 2. ATTENDANCE & SMART QR GATE KIOSK
  // -------------------------------------------------------------
  {
    id: 'attendance-and-kiosk',
    category: 'Attendance & Gate Security',
    title: 'Smart Attendance Kiosk, Camera QR Scanner & Gate Turnstiles',
    keywords: [
      'attendance', 'qr', 'kiosk', 'scanner', 'gate', 'turnstile', 'check-in', 
      'roll call', 'biometric', 'camera', 'register', 'absent', 'present', 'whatsapp alert', '75%'
    ],
    summary: 'High-speed QR camera scanning kiosk, 1-click class register, 75% CBSE attendance mandate, and automated WhatsApp parent alerts.',
    contentGenerator: () => ({
      reply: `### 📱 Smart Attendance Engine & Gate QR Kiosk

EduNexus provides a comprehensive, multi-modal attendance framework designed for zero queue congestion and instant parent notification.

---

#### 1. Attendance Capture Methods
1. **High-Speed Gate QR Kiosk** (\`#/app/attendance\` ➔ *QR Gate Scanner*):
   - Uses device webcam, iPad/tablet, or high-speed physical barcode gun.
   - Student taps their digital or physical ID card QR code upon entering campus.
   - **Verification in <0.2 seconds** with instant audio confirmation chime.
   - Automatically queues an instant **WhatsApp Arrival Alert** to guardians.
2. **1-Click Classroom Roll-Call Register**:
   - Teachers mark whole-class attendance in under 30 seconds with quick toggles (\`Present\`, \`Absent\`, \`Late\`, \`Excused\`).
   - Automatically computes monthly attendance percentages for report cards.
3. **Period / Subject-Wise Lecture Attendance**:
   - For secondary grades and coaching batches to track lecture-by-lecture presence.

---

#### 2. CBSE 75% Examination Attendance Mandate
- **Strict Rule**: A minimum of **75% overall physical attendance** is mandatory to appear for CBSE Term and Annual Board Examinations.
- **Automated Escalation**:
  - Drops below 80%: Automated SMS/WhatsApp advisory sent to parents.
  - Drops below 75%: Official exam debarment warning issued.
  - Medical Condensation: Up to 15% relaxation granted only upon verified doctor certificate submitted within 7 days.`,
      actions: [
        { label: 'Open Attendance Desk', route: 'app/attendance', badge: 'Register' },
        { label: 'Launch Live QR Gate Scanner', route: 'app/attendance', badge: 'Live Kiosk' },
        { label: 'View Student Directory & ID Cards', route: 'app/students', badge: 'QR Cards' },
      ],
      followUps: [
        'How do students download their digital QR ID card?',
        'How are parent WhatsApp alerts sent when a student is absent?',
        'What is the medical concession rule for attendance?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 3. EXAMS, GRADING & CBSE / COACHING REPORT CARDS
  // -------------------------------------------------------------
  {
    id: 'exams-and-academics',
    category: 'Academics & Evaluation',
    title: 'CBSE 8-Point Grading, NEP 2020 Holistic Cards & JEE/NEET Rank Engine',
    keywords: [
      'exam', 'exams', 'grading', 'grade', 'cbse', 'report card', 'marksheet', 'gpa', 
      '8-point', 'nep', 'assessment', 'test series', 'rank', 'percentile', 'omr', 'negative marking', 'jee', 'neet'
    ],
    summary: 'Official CBSE 8-point grading scale (A1 to E), NEP 2020 360-degree holistic cards, and competitive coaching negative marking.',
    contentGenerator: () => ({
      reply: `### 🏆 Examinations, Grading Systems & Marksheets

EduNexus ERP supports dual evaluation frameworks tailored to your institution type:

---

#### 1. Official CBSE 8-Point Scholastic Grading Scale (K-12 School Mode)
All subjects across secondary grades are graded on the normalized CBSE scale:

| Grade | Marks Range | Grade Point | Indicative Performance |
| :---: | :---: | :---: | :--- |
| **A1** | 91% – 100% | **10.0** | Outstanding |
| **A2** | 81% – 90% | **9.0** | Excellent |
| **B1** | 71% – 80% | **8.0** | Very Good |
| **B2** | 61% – 70% | **7.0** | Good |
| **C1** | 51% – 60% | **6.0** | Satisfactory |
| **C2** | 41% – 50% | **5.0** | Average |
| **D** | 33% – 40% | **4.0** | Minimum Passing Grade |
| **E** | Below 33% | **0.0** | Needs Improvement (Re-test) |

- **Term Weightage**: Term 1 carries **40%** weightage; Term 2 carries **60%** weightage.
- **NEP 2020 Holistic Progress Card (HPC)**: Includes Self-Evaluation, Peer Review, and Teacher Remarks for co-scholastic domains (Discipline, Art, Physical Health).

---

#### 2. Competitive Coaching Test Engine (JEE Main/Advanced & NEET-UG)
- **Marking Pattern**: **+4 marks** for correct answer, **-1 mark** for incorrect response, **0** for unattempted.
- **Instant Optical OMR Processing**: Evaluates camera-scanned physical OMR bubble sheets in **<0.8 seconds**.
- **Scorecards**: Real-time National Percentile, Time-per-Question Heatmap, and All-India Rank (AIR) leaderboards.`,
      actions: [
        { label: 'Open Exams & Marksheets', route: 'app/exams', badge: 'Evaluation' },
        { label: 'Classes & Section Manager', route: 'app/academics', badge: 'Curriculum' },
      ],
      followUps: [
        'How do I print CBSE report cards?',
        'How does negative marking calculate in coaching tests?',
        'How to upload or grade OMR test sheets?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 4. STUDENT & ADMISSION MANAGEMENT
  // -------------------------------------------------------------
  {
    id: 'students-and-admissions',
    category: 'Student Lifecycle',
    title: 'Student Enrollment, Master Directory & Digital ID Cards',
    keywords: [
      'student', 'students', 'admit', 'admission', 'enroll', 'enrollment', 'id card', 
      'profile', 'directory', 'guardian', 'conduct', 'rollover', 'promote', 'transfer'
    ],
    summary: 'Student registration with permanent admission numbers, digital QR ID cards, parent contacts, and academic rollover promotion.',
    contentGenerator: () => ({
      reply: `### 🎓 Student & Admission Lifecycle Management

Manage the complete learner journey from initial enrollment to graduation:

---

#### 1. Enrolling a New Student
1. Navigate to **Students Registry** (\`#/app/students\`).
2. Click **+ Add Student** (or use the Admissions CRM pipeline at \`#/app/crm\`).
3. Enter student name, date of birth, blood group, gender, and class/batch assignment.
4. Input parent/guardian details (Primary mobile number is used for SMS/WhatsApp and OTP login).
5. The system auto-assigns a unique permanent admission number (\`ADM-2026-XXXX\`) and creates their fee ledger.

---

#### 2. Digital Student ID Card with Scannable QR
- Click **View ID Card** on any student profile.
- Displays official institution crest, student photo, emergency blood group, guardian contact, and a **high-density cryptographic QR code**.
- Students and parents can save the digital ID on their mobile phones or print physical plastic cards.

---

#### 3. Academic Session Rollover
- At the end of the school year, the **Academic Rollover Wizard** batch-promotes students from Class 9 ➔ Class 10, retaining academic history and archiving fee ledgers.`,
      actions: [
        { label: 'Open Students Registry', route: 'app/students', badge: 'Directory' },
        { label: 'Open Admissions CRM Funnel', route: 'app/crm', badge: 'Leads' },
      ],
      followUps: [
        'How do I generate a digital student ID card?',
        'How does the Admissions CRM funnel convert leads?',
        'How to batch promote students to the next grade?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 5. STAFF, HR & AUTOMATED PAYROLL
  // -------------------------------------------------------------
  {
    id: 'staff-and-payroll',
    category: 'Human Resources & Payroll',
    title: 'Faculty Directory, Biometric Leaves & 1-Click Monthly Batch Payroll',
    keywords: [
      'staff', 'teacher', 'faculty', 'payroll', 'salary', 'payslip', 'pf', 'esi', 
      'tds', 'deduction', 'allowance', 'hr', 'biometric', 'leave', 'cl', 'sl', 'lop'
    ],
    summary: 'Biometric staff attendance, PF (12%) and ESI (0.75%) statutory deductions, and 1-click batch payroll with printable salary slips.',
    contentGenerator: () => ({
      reply: `### 👥 Staff HR, Leave Attendance & Batch Payroll

EduNexus ERP automates complete faculty management, compliance deductions, and month-end salary disbursement:

---

#### 1. Salary Structure & Statutory Compliance (India Norms)
- **Gross Earnings**: Basic Pay + House Rent Allowance (HRA) + Special Teaching Allowance.
- **Mandatory Statutory Deductions**:
  - **Employee Provident Fund (PF)**: **12%** of Basic Pay (capped as per EPFO guidelines).
  - **Employee State Insurance (ESI)**: **0.75%** of Gross Salary (for qualifying thresholds).
  - **Professional Tax (PT)**: State-regulated slab (typically ₹200/month).
  - **TDS Income Tax**: Calculated based on annual income declarations.
  - **Loss of Pay (LOP)**: Auto-deducted when unapproved leaves exceed allotted Casual Leave (CL) / Sick Leave (SL).

---

#### 2. 1-Click Monthly Batch Payroll Run
1. Go to **Staff & Payroll Desk** (\`#/app/staff\` ➔ tab *Payroll Batch*).
2. Select the pay period month (e.g., *April 2026*).
3. Click **Run Payroll Calculation**: The engine evaluates attendance logs, applies PF/ESI/TDS formulas, and computes Net Payouts for every faculty member.
4. Click **Generate Monthly Payslips**: Creates printable PDF salary slips and bank NEFT payout sheets.`,
      actions: [
        { label: 'Open Staff & Payroll Desk', route: 'app/staff', badge: 'Payroll' },
        { label: 'View General Ledger', route: 'app/finance', badge: 'Accounting' },
      ],
      followUps: [
        'How is PF and ESI calculated on teacher salaries?',
        'How to record teacher leave and attendance?',
        'How do I export the monthly bank NEFT payout file?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 6. TRANSPORT FLEET & LIVE GPS TELEMETRY
  // -------------------------------------------------------------
  {
    id: 'transport-and-fleet',
    category: 'Logistics & Fleet',
    title: 'School Bus Fleet, Live GPS Telemetry & Student Safety Protocols',
    keywords: [
      'transport', 'bus', 'buses', 'fleet', 'gps', 'driver', 'route', 'routes', 
      'telemetry', 'pickup', 'drop', 'geofence', 'speed', 'speed governor', 'ais-140'
    ],
    summary: 'AIS-140 certified GPS locators, 5-second live telemetry, 40 km/h speed governors, geofenced parent alerts, and pickup passes.',
    contentGenerator: () => ({
      reply: `### 🚌 School Bus Fleet & Real-Time GPS Tracking

EduNexus provides enterprise transport operations with AIS-140 standard telemetry for absolute student transit safety:

---

#### 1. Live GPS Vehicle Telemetry
- Every registered bus transmits live coordinates **every 5 seconds** to the fleet monitoring engine.
- **Speed Governor Limits**: Buses are governed to **40 km/h** in city corridors and **50 km/h** on highways. If exceeded, an instant **SOS Alarm** triggers on the Principal dashboard.
- **Geofenced Arrival Alerts**: Parents receive automated WhatsApp notifications when the bus is within **1.5 km (or 10 minutes)** of their pickup stop.

---

#### 2. Safe Boarding & Guardian QR Verification
- Drivers and conductors carry mobile QR terminals. Students tap their smart ID card when boarding and deboarding.
- **Guardian Pickup Pass**: Primary grade students are only released to guardians bearing the digital Parent Pickup Pass inside the EduNexus Parent Portal.
- **Fleet Maintenance Ledger**: Tracks diesel expenses, odometer readings, and pollution certificate renewals.`,
      actions: [
        { label: 'Open Transport Fleet Desk', route: 'app/transport', badge: 'GPS Fleet' },
      ],
      followUps: [
        'How do I assign a student to a bus stop?',
        'How do parents track the bus live on their phone?',
        'What are the vehicle speed governor thresholds?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 7. HOSTEL RESIDENCE & MESS DINING
  // -------------------------------------------------------------
  {
    id: 'hostel-and-mess',
    category: 'Residential Life',
    title: 'Hostel Room Allotment, Curfew Bylaws & 7-Day Mess Dining',
    keywords: [
      'hostel', 'room', 'bed', 'dorm', 'curfew', 'warden', 'mess', 'dining', 
      'food', 'meal', 'menu', 'outpass', 'leave pass', 'fssai'
    ],
    summary: 'Building-to-bed room hierarchy, 07:30 PM curfew, digital outpasses, and FSSAI 4-week rotating mess dining menu.',
    contentGenerator: () => ({
      reply: `### 🏢 Hostel Residence & Mess Dining Operations

Comprehensive campus residential boarding bylaws and hygienic nutrition management:

---

#### 1. Hostel Room Allocation & Security Hierarchy
- Structured as: **Building ➔ Wing / Block ➔ Floor ➔ Room (Single / Double / Dorm) ➔ Bed ID**.
- **Gender Isolation Policy**: Strict structural partition between boys and girls residential blocks with dedicated biometric access locks.
- **Daily Timings & Curfew**:
  - Morning Roll-Call: **06:30 AM**
  - Evening Return Curfew: **07:30 PM** in winter / **08:00 PM** in summer.
  - Night Study Silence Hours: **09:00 PM to 11:00 PM**.
- **Digital Outstation Pass**: Weekend outings require a digital leave pass approved by both the parent via OTP and the Chief Warden.

---

#### 2. Mess Dining & Nutritional Standards
- **FSSAI Certified Operations**: 4-week rotating nutritional menu with balanced vegetarian and non-vegetarian selections.
- **Token Desk**: Counter check-in scanner validates student meal tokens (Breakfast, Lunch, Snacks, Dinner) to prevent food wastage.`,
      actions: [
        { label: 'Open Hostel Residence', route: 'app/hostel', badge: 'Rooms' },
        { label: 'Open Mess & Dining Desk', route: 'app/mess', badge: 'Meals' },
      ],
      followUps: [
        'How do students apply for a hostel outpass?',
        'How does the nightly curfew roll-call work?',
        'How to update the weekly dining menu?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 8. DOUBLE-ENTRY FINANCE & P&L
  // -------------------------------------------------------------
  {
    id: 'finance-and-accounting',
    category: 'Financial Accounting',
    title: 'Double-Entry General Ledger, Expense Vouchers & Income Statement (P&L)',
    keywords: [
      'finance', 'accounting', 'ledger', 'journal', 'p&l', 'profit', 'loss', 
      'expense', 'voucher', 'balance sheet', 'petty cash', 'audit'
    ],
    summary: 'Automated double-entry journal postings, multi-account cash/bank balances, expense vouchers, and real-time Net Surplus P&L.',
    contentGenerator: () => ({
      reply: `### 📊 Double-Entry Accounting & Financial Management

EduNexus maintains audit-ready, balanced books for school trusts and coaching enterprises:

---

#### 1. Core Financial Capabilities
- **Automated Journal Entries**: When fees are collected, the system auto-debits the Bank/Cash Account and credits the Fee Revenue Account without manual bookkeeping.
- **Live Income Statement (P&L)**: Real-time calculation of **Total Revenues − Total Operating Expenses = Net Surplus/Deficit**.
- **Multi-Account Monitoring**:
  - Primary Fee Collection Account (Razorpay / Bank)
  - Operating Expense Account
  - Petty Cash Fund for daily campus purchases
- **Expense Vouchers**: Log expenses with vendor GSTIN, invoice upload, expense category, and approval workflows.`,
      actions: [
        { label: 'Open Finance & Accounting Desk', route: 'app/finance', badge: 'Ledger' },
        { label: 'Fee Collection Desk', route: 'app/fees', badge: 'Revenue' },
      ],
      followUps: [
        'How does fee collection post into the general ledger?',
        'How to log an operating expense voucher?',
        'How to export the monthly financial income statement?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 9. SUPER ADMIN & SAAS PLATFORM PLANS
  // -------------------------------------------------------------
  {
    id: 'super-admin-and-plans',
    category: 'Platform Administration',
    title: 'Super Admin Master Console, Tenant Provisioning & SaaS Pricing Tiers',
    keywords: [
      'super admin', 'superadmin', 'platform', 'tenant', 'provision', 'mrr', 'pricing', 
      'plan', 'plans', 'cost', 'subscription', 'starter', 'pro', 'institutional trust', 'trial'
    ],
    summary: 'Multi-tenant provisioning, MRR revenue metrics, and SaaS tiers (Starter ₹1,999, Pro ₹4,999, Trust ₹9,999).',
    contentGenerator: () => ({
      reply: `### 🛡️ Super Admin Master Console & SaaS Pricing

The master administrative center for the platform owner to manage all client schools and subscription revenue:

---

#### 1. SaaS Pricing Plans for Schools & Academies
| Plan | Price | Enrolled Students | Key Included Modules |
| :--- | :---: | :---: | :--- |
| **Starter Academy** | **₹1,999 / mo** | Up to 300 | Daily Roll-Call, Fee Billing, Marksheets |
| **Campus Pro** *(Popular)* | **₹4,999 / mo** | Up to 1,500 | BYOK Payment Gateway, QR Kiosk, Transport GPS, Parent WhatsApp |
| **Institutional Trust** | **₹9,999 / mo** | Unlimited | Multi-Campus, Hostel, Mess, Staff HR & 1-Click Payroll |

---

#### 2. Super Admin Capabilities (\`#/super-admin\`)
- **Tenant Provisioning**: Launch new schools in seconds with custom subdomain, branding colors, and logo.
- **Platform Revenue & MRR**: Track Monthly Recurring Revenue, active student counts, and license renewals.
- **Security Audit Logs**: Track every login, permission override, and payment transaction across all tenants.`,
      actions: [
        { label: 'Open Super Admin Console', route: 'super-admin', badge: 'Console' },
        { label: 'View Public Pricing Table', route: 'pricing', badge: 'Pricing' },
      ],
      followUps: [
        'How do I onboard a new school tenant?',
        'What features are included in the Campus Pro plan?',
        'How does multi-tenant data isolation work?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 10. DUAL-OPERATING MODES (SCHOOL VS COACHING)
  // -------------------------------------------------------------
  {
    id: 'dual-operating-modes',
    category: 'System Architecture',
    title: 'Dual Operating Engine: K-12 School Mode vs Coaching Academy Mode',
    keywords: [
      'dual mode', 'school mode', 'coaching mode', 'difference', 'academy', 'institute', 
      'switch mode', 'k-12', 'batch', 'class'
    ],
    summary: 'Dynamic UI morphing between K-12 Class/Section terms and Coaching Batch/Course percentile test series.',
    contentGenerator: (ctx) => ({
      reply: `### 🔄 EduNexus Dual-Operating Architecture

EduNexus features a dynamic engine that transforms terminology, workflows, and modules based on the institution's DNA:

---

| Dimension | 🏫 K-12 School Mode *(e.g. DPS)* | 🎯 Coaching Academy Mode *(e.g. Apex)* |
| :--- | :--- | :--- |
| **Student Grouping** | **Class & Section** *(Class 10-B)* | **Course & Batches** *(JEE Droppers Morning)* |
| **Academic Terms** | Semesters, Annual Academic Sessions | Rolling Batches & Dynamic Shuffling |
| **Evaluation** | **CBSE 8-Point Grade Cards** (A1 to E) | **Negative Marking Tests** (+4 / -1) |
| **Analytics** | Term GPA & Co-Scholastic Grades | National Percentile & AIR Leaderboards |
| **Fee Structure** | Annual / Quarterly Tuition Fees | Installment Package / Scholarship Slabs |

> Currently viewing as: **${ctx.isSchool ? 'K-12 School Mode' : 'Coaching Academy Mode'}**.`,
      actions: [
        { label: 'Switch Institution (Demo Bar)', route: 'login', badge: '1-Click' },
        { label: 'Open Academics Module', route: 'app/academics', badge: 'Structure' },
      ],
      followUps: [
        'How does batch shuffling work in coaching mode?',
        'How do report cards differ between school and coaching?',
      ],
    }),
  },

  // -------------------------------------------------------------
  // 11. LIBRARY, CLINIC, INVENTORY, TIMETABLE, NOTICES
  // -------------------------------------------------------------
  {
    id: 'general-campus-logistics',
    category: 'Campus Operations',
    title: 'Library OPAC, Health Clinic, Timetable & Inventory Operations',
    keywords: [
      'library', 'book', 'isbn', 'opac', 'health', 'clinic', 'infirmary', 'doctor', 
      'inventory', 'stock', 'asset', 'timetable', 'schedule', 'notice', 'communication', 'whatsapp'
    ],
    summary: 'Library ISBN search & overdue fines, student health infirmary, timetable conflict matrix, and inventory stock tracking.',
    contentGenerator: () => ({
      reply: `### 🏢 Integrated Campus Operational Modules

EduNexus connects all auxiliary departments into a single unified dashboard:

---

1. **Library & OPAC Catalog** (\`#/app/library\`):
   - Accession master indexing by ISBN, title, and author.
   - Real-time online book reservations for students.
   - 14-day circulation loans with auto-computed ₹5/day overdue fines.
2. **Campus Health Infirmary** (\`#/app/health\`):
   - Medical logs tracking student ailments, vitals, treatments, and bed rest.
   - **Severe Allergy Badges** (Penicillin, Peanuts, Asthma) highlighted on student profiles.
   - Emergency WhatsApp alert dispatch to parents.
3. **Master Timetable Matrix** (\`#/app/timetable\`):
   - Monday–Saturday schedule with 45-minute periods.
   - **Conflict Detection Engine**: Prevents double-booking teachers or classrooms.
4. **Inventory & Asset Tracking** (\`#/app/inventory\`):
   - Tracks stock-in deliveries, stock-out distributions, and low-stock re-order alerts.
   - Monitors capital equipment warranties and Annual Maintenance Contracts (AMC).
5. **Notices & WhatsApp Broadcasts** (\`#/app/communication\`):
   - Publish targeted announcements with 1-click WhatsApp deep-link delivery.`,
      actions: [
        { label: 'Open Library Catalog', route: 'app/library', badge: 'Books' },
        { label: 'Open Health Infirmary', route: 'app/health', badge: 'Clinic' },
        { label: 'Open Timetable Grid', route: 'app/timetable', badge: 'Schedule' },
        { label: 'Open Inventory Desk', route: 'app/inventory', badge: 'Assets' },
      ],
      followUps: [
        'How do overdue library fines work?',
        'How to prevent timetable teacher conflicts?',
        'How to broadcast emergency notices to parents?',
      ],
    }),
  }
];

/**
 * Stop words for token matching
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'about', 'as', 'into', 'like', 'through', 'after', 'over',
  'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among',
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'does', 'do', 'did', 'can', 'could',
  'should', 'would', 'will', 'i', 'you', 'me', 'my', 'we', 'our', 'tell', 'explain', 'show'
]);

/**
 * Intelligent Multi-Turn Semantic Matcher
 */
export function queryEmbeddedBrain(
  query: string, 
  ctx: UserContext, 
  history: ConversationTurn[] = []
): BrainResponse {
  const clean = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const rawTokens = clean.split(/\s+/).filter(t => t.length >= 2);
  const keywords = rawTokens.filter(t => !STOP_WORDS.has(t));

  // 1. Check for simple pleasantries and greetings
  if (
    clean === 'hi' || clean === 'hello' || clean === 'hey' || clean === 'good morning' ||
    clean === 'good afternoon' || clean === 'good evening' || clean === 'help' || clean === 'who are you'
  ) {
    return {
      reply: `👋 **Hello! I'm your EduNexus AI Assistant.**

I have complete, real-time knowledge of all **28 operational modules** and campus bylaws in EduNexus ERP!

You can ask me anything about:
- **Fees & Billing**: BYOK direct bank payments, 4-quarter billing, ₹50/day late fees, and 3-copy receipts.
- **Attendance & Gates**: Live QR camera scanner kiosk, 1-click roll-call, and 75% CBSE rules.
- **Exams & Reports**: CBSE 8-point grading scale (A1 to E), marksheets, and JEE/NEET rank percentiles.
- **Staff & Payroll**: Biometric registers, PF (12%), ESI (0.75%), TDS, and 1-click batch salary slips.
- **Campus Logistics**: Bus live GPS telemetry, hostel room bed allotments, mess dining menus, and library.

What would you like to explore today?`,
      actions: [
        { label: 'Fee Collection Desk', route: 'app/fees' },
        { label: 'QR Attendance Kiosk', route: 'app/attendance' },
        { label: 'Students Registry', route: 'app/students' },
        { label: 'Exams & Reports', route: 'app/exams' },
      ],
      followUps: [
        'How does fee collection work?',
        'How to mark QR attendance?',
        'What are the CBSE grading rules?',
        'How is staff payroll calculated?',
      ],
      category: 'Greeting',
    };
  }

  // 2. Check for gratitude / conversational closure
  if (clean.includes('thank') || clean === 'ok' || clean === 'okay' || clean === 'got it' || clean === 'cool') {
    return {
      reply: `You're very welcome! 😊 Feel free to ask whenever you need help with any feature, calculation, or policy in EduNexus ERP.`,
      actions: [],
      followUps: [
        'How does fee collection work?',
        'What are the CBSE grading rules?',
      ],
      category: 'Closure',
    };
  }

  // 3. Multi-turn context resolution:
  // If query is very short or looks like a follow-up (e.g. "what are the late charges?", "how to print it?"),
  // inspect the previous user question to supplement keywords.
  let searchKeywords = [...keywords];
  if (history.length > 0 && keywords.length <= 3) {
    const lastUserTurn = [...history].reverse().find(t => t.sender === 'user');
    if (lastUserTurn) {
      const prevClean = lastUserTurn.text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      const prevTokens = prevClean.split(/\s+/).filter(t => !STOP_WORDS.has(t) && t.length >= 3);
      searchKeywords = [...searchKeywords, ...prevTokens];
    }
  }

  // 4. Score all topic knowledge items
  let bestTopic: TopicKnowledge | null = null;
  let highestScore = 0;

  for (const topic of TOPICS_DB) {
    let score = 0;
    const titleLower = topic.title.toLowerCase();
    const summaryLower = topic.summary.toLowerCase();

    searchKeywords.forEach(kw => {
      if (topic.keywords.includes(kw)) score += 3.0;
      if (titleLower.includes(kw)) score += 2.5;
      if (summaryLower.includes(kw)) score += 1.0;
    });

    if (score > highestScore) {
      highestScore = score;
      bestTopic = topic;
    }
  }

  // 5. If a high-confidence topic match is found
  if (bestTopic && highestScore >= 2.0) {
    const generated = bestTopic.contentGenerator(ctx, history);
    return {
      reply: generated.reply,
      actions: generated.actions,
      followUps: generated.followUps,
      citations: [
        {
          title: bestTopic.title,
          category: bestTopic.category,
          matchScore: Math.min(100, Math.round((highestScore / (searchKeywords.length * 3)) * 100)),
        }
      ],
      category: bestTopic.category,
    };
  }

  // 6. Fallback General Assistance Guide
  return {
    reply: `### 🤖 EduNexus AI Knowledge Copilot

I searched all verified campus bylaws and ERP operational manuals for: **"${query}"**.

Here is how to manage this in EduNexus ERP:
- **Fees & Tuition**: Manage collections, BYOK payment gateway, concessions, and 3-copy receipts at \`#/app/fees\`.
- **Attendance**: Launch the live webcam QR Scanner kiosk or mark class registers at \`#/app/attendance\`.
- **Academics & Exams**: Generate official CBSE report cards (8-point scale) or coaching rank cards at \`#/app/exams\`.
- **Students**: Register students and download digital QR ID cards at \`#/app/students\`.
- **Staff & HR**: Run 1-click batch payroll with PF/ESI deductions at \`#/app/staff\`.
- **Campus Fleet**: Real-time bus GPS telemetry and student stop manifests at \`#/app/transport\`.

What specific module or procedure would you like me to walk you through?`,
    actions: [
      { label: 'Fee Collection Desk', route: 'app/fees' },
      { label: 'QR Attendance Kiosk', route: 'app/attendance' },
      { label: 'Students Registry', route: 'app/students' },
      { label: 'Exams & Marksheets', route: 'app/exams' },
    ],
    followUps: [
      'How does fee collection work?',
      'How to mark QR attendance?',
      'What are the CBSE grading rules?',
      'How is teacher payroll calculated?',
    ],
    category: 'General Overview',
  };
}
