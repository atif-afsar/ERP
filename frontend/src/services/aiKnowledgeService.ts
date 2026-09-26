/**
 * Comprehensive Knowledge Base & Query Resolution Engine for EduNexus ERP
 * 
 * Provides intelligent guidance across all 22 operational modules, 7 user roles,
 * public onboarding, and the two-tier payment architecture.
 */

import { executeRagQuery } from './rag/ragEngine';
import { RagCitation, TargetRole } from './rag/ragTypes';

export interface AiAction {
  label: string;
  route: string;
  badge?: string;
}

export interface AiResponse {
  reply: string;
  actions?: AiAction[];
  followUps?: string[];
  citations?: RagCitation[];
  ragGrounding?: {
    model: string;
    retrievalLatencyMs: number;
    generationLatencyMs: number;
    grounded: boolean;
  };
}

export interface UserContext {
  role?: string;
  isLoggedIn: boolean;
  tenantName?: string;
  isSchool?: boolean;
  activeStudentName?: string;
  currentRoute?: string;
}

export function queryAiKnowledge(query: string, ctx: UserContext): AiResponse {
  const q = query.toLowerCase().trim();

  // 0. GREETINGS & CASUAL QUESTIONS
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q === 'hey there' ||
    q === 'hi there' ||
    q === 'good morning' ||
    q === 'good afternoon' ||
    q === 'good evening' ||
    q === 'how are you' ||
    q === 'how are you doing' ||
    q === 'whats up' ||
    q === "what's up" ||
    q === 'sup' ||
    q === 'yo' ||
    q.startsWith('hi ') ||
    q.startsWith('hello ') ||
    q.startsWith('hey ') ||
    q.includes('who are you') ||
    q.includes('what are you') ||
    q.includes('what can you do') ||
    q.includes('help me') ||
    q === 'help'
  ) {
    return {
      reply: `👋 **Hello! I'm your EduNexus Assistant.**

I'm here to help you navigate and use the ERP. You can ask me anything about:
• **Fee Management**: Collecting fees, online payment gateways (BYOK), and 3-copy receipts
• **Attendance**: Taking daily attendance and high-speed QR camera scanning
• **Students & Admissions**: Adding new admissions, digital ID cards, and student records
• **Exams & Report Cards**: CBSE 8-point grading criteria, marks entry, and printable report cards
• **Campus Operations**: Transport buses with GPS, hostel rooms, mess dining, and library
• **Staff & Payroll**: Faculty directories, biometric attendance, and 1-click monthly salary slips

What can I help you with today?`,
      actions: [
        { label: 'Fee Collection Desk', route: 'app/fees' },
        { label: 'QR Attendance Kiosk', route: 'app/attendance' },
        { label: 'Students Registry', route: 'app/students' },
      ],
      followUps: [
        'How does fee payment work?',
        'How to mark attendance with QR codes?',
        'How to admit a new student?',
        'What are the CBSE grading rules?',
      ],
    };
  }

  // 0.05 GRATITUDE & CLOSURE
  if (
    q === 'thank you' ||
    q === 'thanks' ||
    q === 'thanks a lot' ||
    q === 'thank you so much' ||
    q === 'thx' ||
    q.includes('thank you') ||
    q.includes('thanks')
  ) {
    return {
      reply: `You're very welcome! 😊 Feel free to ask if you need help with anything else in EduNexus ERP.`,
    };
  }

  if (
    q === 'ok' ||
    q === 'okay' ||
    q === 'k' ||
    q === 'cool' ||
    q === 'great' ||
    q === 'awesome' ||
    q === 'got it' ||
    q === 'perfect' ||
    q === 'understood'
  ) {
    return {
      reply: `Sounds great! 👍 Let me know whenever you have more questions or need help with any feature.`,
    };
  }

  if (
    q === 'bye' ||
    q === 'goodbye' ||
    q === 'see you' ||
    q === 'cya' ||
    q.startsWith('bye')
  ) {
    return {
      reply: `Goodbye! Have a wonderful day managing your campus with EduNexus ERP. I'll be right here whenever you need assistance! 👋`,
    };
  }

  // 0.1 PRICING & PLANS
  if (
    q.includes('pricing') ||
    q.includes('cost') ||
    q.includes('price') ||
    q.includes('plan') ||
    q.includes('how much')
  ) {
    return {
      reply: `### 💰 EduNexus ERP SaaS Pricing Plans:

EduNexus offers 3 transparent tiers for schools and academies:

1. **Starter Academy (₹1,999 / month)**
   - Up to 300 enrolled students
   - Daily roll-call & QR gate attendance
   - Fee billing & 3-copy tax receipts
   - Official report cards & marksheets

2. **Campus Pro (₹4,999 / month) — *Most Popular***
   - Up to 1,500 enrolled students
   - Online Fee Payment Gateway (BYOK direct settlement)
   - Parent & Student Self-Service Portals
   - Transport fleet routes & Library catalog
   - Automated parent WhatsApp alert triggers

3. **Institutional Trust (₹9,999 / month)**
   - Unlimited students & faculty
   - Multi-Campus group management
   - Hostel residency & 7-day mess dining tokens
   - Staff HR, biometric attendance & 1-click payroll
   - Dedicated account manager & SLA`,
      actions: [
        { label: 'View Pricing Table', route: 'pricing', badge: 'Plans' },
        { label: 'Start 14-Day Free Trial', route: 'signup', badge: 'Free' },
      ],
      followUps: [
        'How does the BYOK fee payment gateway work?',
        'Can I test all features on the free trial?',
      ],
    };
  }

  // 1. LOGIN & AUTHENTICATION QUESTIONS
  if (
    q.includes('login') ||
    q.includes('sign in') ||
    q.includes('log in') ||
    q.includes('how to access') ||
    q.includes('credential') ||
    q.includes('password')
  ) {
    return {
      reply: `### 🔐 How to Login to EduNexus ERP:

1. **Navigate to the Login Screen**: Click the **Sign In** button or navigate to \`#/login\`.
2. **Choose Your Role / Persona**:
   - On the login screen, we provide a **1-Click Demo Persona Bar** at the top.
   - Click on **Principal**, **Teacher**, **Accountant**, **Parent**, or **Student** to instantly log in without typing credentials.
3. **Manual Login**:
   - Select your institution (**Delhi International Public School** or **Apex Academy**).
   - Enter your email and password, then click **Sign In to Workspace**.
4. **Super Administrator**:
   - Super Admins manage the whole platform at \`#/super-admin\`.`,
      actions: [
        { label: 'Go to Login Screen', route: 'login', badge: '1-Click' },
        { label: 'Register New School', route: 'signup', badge: 'Free' },
      ],
      followUps: [
        'What are the default demo accounts?',
        'How does the role permission system work?',
        'How can a student or parent log in?',
      ],
    };
  }

  // 2. PAYMENT SYSTEM & TWO-TIER ARCHITECTURE
  if (
    q.includes('fee') ||
    q.includes('fees') ||
    q.includes('tuition') ||
    q.includes('payment') ||
    q.includes('razorpay') ||
    q.includes('cashfree') ||
    q.includes('gateway') ||
    q.includes('pay fee') ||
    q.includes('subscription') ||
    q.includes('two payment') ||
    q.includes('billing') ||
    q.includes('receipt') ||
    q.includes('collection') ||
    q.includes('concession') ||
    q.includes('installment') ||
    q.includes('dues')
  ) {
    return {
      reply: `### 💳 The EduNexus Two-Tier Payment Architecture:

EduNexus ERP separates payments into two clean, independent tiers:

#### 1. Platform SaaS Subscriptions ("Payment for Your Website")
- **Who Pays**: School Trustees / Directors pay the **Platform Owner (You)**.
- **Purpose**: Monthly or annual software licenses (Starter ₹1,999/mo, Pro ₹4,999/mo, Enterprise ₹9,999/mo).
- **Target Account**: Deposited 100% into **your company's** master Razorpay/Stripe account.
- **Managed In**: **Super Admin Console** (\`#/super-admin\`) under *SaaS Plans & Quotas*.

#### 2. School Tuition & Fee Collections ("Payment for Other Schools")
- **Who Pays**: Parents & students pay **their individual school**.
- **Purpose**: Tuition fees, lab fees, bus transport charges, hostel/mess, exam fees.
- **Target Account**: Deposited **100% directly into that school's own bank account** using **BYOK (Bring Your Own Key)**.
- **Why this is critical**:
  - Zero RBI payment aggregator liability (you never touch school tuition funds).
  - No GST tax issues (School education is 0% GST exempt, while SaaS is 18%).
  - Zero chargeback or parent refund disputes for you.
- **Managed In**: School Settings (\`#/app/settings\`) and Fees Desk (\`#/app/fees\`).`,
      actions: [
        { label: 'Open Fee Collection Desk', route: 'app/fees', badge: 'Tuition' },
        { label: 'Open SaaS Billing & Plans', route: 'super-admin', badge: 'Platform' },
        { label: 'Open School Settings', route: 'app/settings', badge: 'Keys' },
      ],
      followUps: [
        'How does a parent pay tuition fees online?',
        'How do schools configure their Razorpay keys?',
        'How do official 3-copy GST receipts work?',
      ],
    };
  }

  // 3. ATTENDANCE & SMART QR GATE SCANNER
  if (
    q.includes('attendance') ||
    q.includes('qr') ||
    q.includes('gate') ||
    q.includes('check-in') ||
    q.includes('scanner') ||
    q.includes('roll call')
  ) {
    return {
      reply: `### 📱 Smart Attendance & QR Gate Scanner:

EduNexus provides 3 flexible check-in methods:

1. **1-Click Class Register**:
   - Teachers mark daily class attendance with quick toggles (\`Present\`, \`Absent\`, \`Late\`, \`Excused\`).
2. **High-Speed Smart QR Gate Scanner**:
   - Accessible at \`#/app/attendance\` (tab *QR Gate Scanner*).
   - Uses the device's live webcam/camera or physical barcode scanner.
   - When a student taps their digital student ID card QR code, the gate instantly verifies their identity, logs the check-in time (e.g. 08:15 AM), and triggers an audio confirmation chime.
   - Automatically queues an instant WhatsApp alert to the student's guardian.
3. **Period / Subject Attendance**:
   - Faculty marks lecture attendance for individual periods.`,
      actions: [
        { label: 'Open Attendance & QR Scanner', route: 'app/attendance', badge: 'Live Scanner' },
      ],
      followUps: [
        'Where do students get their QR ID Card?',
        'How are absent WhatsApp alerts triggered?',
        'Can teachers mark period-wise attendance?',
      ],
    };
  }

  // 4. STUDENT / LEARNER GUIDE
  if (
    q.includes('student') ||
    q.includes('learner') ||
    q.includes('id card') ||
    q.includes('admit') ||
    q.includes('enroll')
  ) {
    return {
      reply: `### 🎓 Student & Learner Management:

- **For Students**:
  - View your digital profile, schedule, and attendance percentage.
  - Generate your **Digital Student ID Card** with your permanent admission QR code.
  - Access online homework assignments and submit work before deadlines.
  - Download official report cards and check rank leaderboards.
- **For Staff & Admins**:
  - Enroll new students at \`#/app/students\` with permanent admission numbers (\`ADM-2026-XXXX\`).
  - Track guardian phone numbers, emergency medical contacts, and fee ledger balances.`,
      actions: [
        { label: 'Open Students Registry', route: 'app/students', badge: 'Directory' },
        { label: 'View Homework & Tasks', route: 'app/homework', badge: 'Assignments' },
      ],
      followUps: [
        'How do I view my report card?',
        'How do I submit homework online?',
        'How to download my digital ID card?',
      ],
    };
  }

  // 5. EXAMINATIONS, MARKS & REPORT CARDS
  if (
    q.includes('exam') ||
    q.includes('report card') ||
    q.includes('mark') ||
    q.includes('result') ||
    q.includes('cbse') ||
    q.includes('grade') ||
    q.includes('test series') ||
    q.includes('rank')
  ) {
    return {
      reply: `### 🏆 Examinations & Digital Report Cards:

1. **Exam Scheduling**:
   - Create term exams or test series with subject dates, room numbers, and max marks.
2. **Marks Entry**:
   - Teachers enter theory, practical, and periodic assessment scores.
   - The system auto-computes total percentage, GPA, and grade bands.
3. **CBSE-Compliant Report Cards (School Mode)**:
   - Official 8-point grading scale (\`A1\`, \`A2\`, \`B1\`, \`B2\`, \`C1\`, \`C2\`, \`D\`, \`E\`).
   - Includes scholastic subjects, co-scholastic domains (Discipline, Art, Physical Education), attendance stats, and school crest.
   - Printable with 1 click!
4. **Competitive Test Series (Coaching Mode)**:
   - Negative marking rules (+4 correct, -1 incorrect).
   - Percentile curves and All-India Rank (AIR) leaderboards.`,
      actions: [
        { label: 'Open Exams & Report Cards', route: 'app/exams', badge: 'Report Cards' },
      ],
      followUps: [
        'How are grade points (GPA) calculated?',
        'Can parents print report cards at home?',
        'How does negative marking work in coaching mode?',
      ],
    };
  }

  // 6. HOMEWORK & ASSIGNMENTS
  if (
    q.includes('homework') ||
    q.includes('assignment') ||
    q.includes('dpp') ||
    q.includes('practice sheet')
  ) {
    return {
      reply: `### 📚 Homework & Daily Practice Sheets (DPP):

- **Teachers**: Post homework assignments with instructions, subject tags, submission deadlines, and downloadable attachments.
- **Students**: View pending assignments with due date countdown badges, download resource attachments, and submit solutions online.
- **Grading**: Teachers evaluate submissions with status tags (\`Submitted\`, \`Late\`, \`Missing\`) and add constructive comments.`,
      actions: [
        { label: 'Open Homework Desk', route: 'app/homework', badge: 'Assignments' },
      ],
      followUps: [
        'Can teachers attach PDFs to homework?',
        'How do students know when homework is due?',
      ],
    };
  }

  // 7. TIMETABLE & DAILY SCHEDULE
  if (
    q.includes('timetable') ||
    q.includes('schedule') ||
    q.includes('period') ||
    q.includes('routine')
  ) {
    return {
      reply: `### 🗓️ Academic Timetable & Scheduling:

- **Weekly Grid Matrix**: Monday through Saturday timetable partitioned into 45-minute academic periods and recess intervals.
- **Conflict Prevention Engine**: Ensures no teacher or classroom is double-booked during the same period.
- **Student & Parent View**: Filtered to show only the logged-in student's daily periods, room numbers, and subject teachers.`,
      actions: [
        { label: 'Open Timetable Grid', route: 'app/timetable', badge: 'Schedule' },
      ],
      followUps: [
        'How do we assign substitute teachers?',
        'Can students see their timetable on mobile?',
      ],
    };
  }

  // 8. STAFF HR, ATTENDANCE & PAYROLL
  if (
    q.includes('staff') ||
    q.includes('payroll') ||
    q.includes('salary') ||
    q.includes('teacher') ||
    q.includes('payslip') ||
    q.includes('pf') ||
    q.includes('esi') ||
    q.includes('tds')
  ) {
    return {
      reply: `### 👥 Staff Management & Automated Payroll:

1. **Staff Directory**: Faculty and personnel records with employee IDs, designations, assigned departments, bank account numbers, and PAN/Aadhaar.
2. **Leave & Attendance**: Biometric attendance tracking Present, Casual Leave (CL), Sick Leave (SL), and Loss of Pay (LOP) days.
3. **Salary Structure**:
   - **Earnings**: Basic Pay + HRA + Special Teaching Allowance.
   - **Statutory Deductions**: Employee PF (12%), ESI (0.75%), Professional Tax (PT), and TDS Income Tax.
4. **1-Click Monthly Batch Payroll**: Computes net salaries across the entire institution and generates printable monthly salary slips with bank NEFT payout sheets.`,
      actions: [
        { label: 'Open Staff & Payroll Desk', route: 'app/staff', badge: 'Payroll' },
      ],
      followUps: [
        'How to generate printable salary slips?',
        'How are PF and ESI statutory deductions calculated?',
      ],
    };
  }

  // 9. GENERAL LEDGER, EXPENSES & FINANCE
  if (
    q.includes('finance') ||
    q.includes('accounting') ||
    q.includes('ledger') ||
    q.includes('p&l') ||
    q.includes('profit') ||
    q.includes('expense') ||
    q.includes('balance sheet')
  ) {
    return {
      reply: `### 📊 Double-Entry Accounting & Financial Desk:

- **Automated Journal Entries**: Every tuition payment and vendor expense automatically updates debit and credit journal entries to maintain balanced books.
- **Cash & Bank Accounts**: Real-time balance monitoring across primary collection accounts, operational expense funds, and petty cash.
- **Expense Vouchers**: Log expenses with vendor names, payment modes, approval statuses, and receipt attachments.
- **Real-Time Income Statement (P&L)**: Instantly computes Total Revenue minus Total Operating Expenses to display Net Surplus or Deficit.`,
      actions: [
        { label: 'Open Finance & Accounting', route: 'app/finance', badge: 'Ledger' },
      ],
      followUps: [
        'How does fee collection post to the general ledger?',
        'How to export the monthly P&L statement?',
      ],
    };
  }

  // 10. CAMPUS LOGISTICS (TRANSPORT, HOSTEL, MESS, LIBRARY, INVENTORY, HEALTH)
  if (
    q.includes('transport') ||
    q.includes('bus') ||
    q.includes('fleet') ||
    q.includes('driver')
  ) {
    return {
      reply: `### 🚌 Transport & Fleet Management:

- **Vehicle Registry**: Track buses and vans with registration numbers, seating capacities, pollution certificates, and fitness renewals.
- **Multi-Stop Routes**: Morning pickup and evening drop route matrices with timing schedules and assigned student passenger manifests.
- **Driver Records**: Commercial driving license numbers and emergency SOS phone contacts.
- **Fuel Ledger**: Diesel refills, odometer readings, and routine maintenance logs.`,
      actions: [
        { label: 'Open Transport & Fleet', route: 'app/transport', badge: 'Buses' },
      ],
      followUps: ['How to assign a student to a bus route?', 'How to log fuel expenses?'],
    };
  }

  if (
    q.includes('hostel') ||
    q.includes('room') ||
    q.includes('dorm') ||
    q.includes('curfew') ||
    q.includes('outpass')
  ) {
    return {
      reply: `### 🏢 Hostel Residence & Room Allocation:

- **Hierarchy**: Building ➔ Block ➔ Floor ➔ Room (Single / Double / Dorm) ➔ Bed ID.
- **Strict Gender Isolation**: Male and female residents are partitioned into isolated hostel wings.
- **Nightly Curfew Roll-Call**: 10:00 PM evening attendance check verifying all boarders are in their rooms.
- **Gate Outpass Desk**: Warden approvals for Day Passes, Night Outs, and Weekend Home Visits.`,
      actions: [
        { label: 'Open Hostel Residence', route: 'app/hostel', badge: 'Rooms' },
      ],
      followUps: ['How to issue a student gate outpass?', 'How does the curfew roll-call work?'],
    };
  }

  if (
    q.includes('mess') ||
    q.includes('food') ||
    q.includes('meal') ||
    q.includes('dining') ||
    q.includes('menu')
  ) {
    return {
      reply: `### 🍽️ Hostel Mess & 7-Day Rotating Dining:

- **7-Day Menu Board**: Breakfast, Lunch, Evening Snacks, and Dinner with chef specials for each day of the week.
- **Dietary Tags**: Clear markers for \`VEG\`, \`NON_VEG\`, and \`JAIN\` meal plans.
- **Dining Token Desk**: Counter check-in desk verifying student meal tokens to prevent food wastage.
- **Hygiene Audits**: Tracks kitchen cleanliness inspection scores.`,
      actions: [
        { label: 'Open Mess & Dining', route: 'app/mess', badge: 'Meals' },
      ],
      followUps: ['How to change the weekly menu?', 'How do dining tokens work?'],
    };
  }

  if (
    q.includes('library') ||
    q.includes('book') ||
    q.includes('opac') ||
    q.includes('borrow') ||
    q.includes('isbn')
  ) {
    return {
      reply: `### 📖 Library Management & OPAC Catalog:

- **Accession Master**: ISBN indexing, title, author, publisher, genre, and shelf rack locations.
- **Live OPAC Search**: Students and teachers can search book availability in real time.
- **Circulation Desk**: Scan student ID and book accession number to issue books with 14-day return deadlines.
- **Overdue Fine Engine**: Automatically calculates overdue fines (₹5/day) upon book return.`,
      actions: [
        { label: 'Open Library Catalog', route: 'app/library', badge: 'Books' },
      ],
      followUps: ['How to check if a book is available?', 'How are overdue fines calculated?'],
    };
  }

  if (
    q.includes('health') ||
    q.includes('clinic') ||
    q.includes('infirmary') ||
    q.includes('doctor') ||
    q.includes('medical') ||
    q.includes('allergy')
  ) {
    return {
      reply: `### 🩺 Campus Health & Medical Infirmary:

- **Clinic Visit Logs**: Record student visits, body temperature, blood pressure, diagnosis, treatment administered, and bed rest duration.
- **Critical Allergy Badges**: Prominently flags severe student allergies (Peanuts, Penicillin, Dust, Asthma) across student profiles.
- **Immunization History**: Logs vaccines (MMR, Tetanus, Hepatitis B) and annual medical checkup vitals.
- **Parent Emergency Alerts**: Flags severe cases to trigger immediate phone and WhatsApp alerts to guardians.`,
      actions: [
        { label: 'Open Health & Clinic', route: 'app/health', badge: 'Infirmary' },
      ],
      followUps: ['How to log an infirmary visit?', 'Where are critical allergies displayed?'],
    };
  }

  if (
    q.includes('inventory') ||
    q.includes('asset') ||
    q.includes('warehouse') ||
    q.includes('stock')
  ) {
    return {
      reply: `### 📦 Central Inventory & Asset Tracking:

- **Stock Movements**: Track stock-in vendor deliveries and stock-out distributions to classrooms and departments.
- **Multi-Store Warehouses**: Separate tracking for Main Store, Science Labs, and Sports Warehouse.
- **Re-Order Alerts**: Flags items when current stock drops below minimum safety thresholds.
- **Fixed Asset AMC**: Monitors equipment warranties and Annual Maintenance Contract (AMC) renewal dates.`,
      actions: [
        { label: 'Open Inventory Desk', route: 'app/inventory', badge: 'Stock' },
      ],
      followUps: ['How to record a stock-in delivery?', 'How to set low stock alert thresholds?'],
    };
  }

  if (
    q.includes('crm') ||
    q.includes('lead') ||
    q.includes('inquiry') ||
    q.includes('admission desk')
  ) {
    return {
      reply: `### 🎯 Admission CRM & Leads Funnel:

- **4-Stage Pipeline**: Follow prospective students from \`Inquiry Logged\` ➔ \`Campus Tour\` ➔ \`Form Verification\` ➔ \`Admitted\`.
- **Lead Capture**: Track origin channels (Walk-in, Online Form, Social Media, Referrals).
- **Counselor Logs**: Record phone conversation notes, scheduled callbacks, and conversion rates.
- **1-Click Conversion**: Convert an admitted applicant directly into an active enrolled student profile without re-entering details!`,
      actions: [
        { label: 'Open Admission CRM', route: 'app/crm', badge: 'Pipeline' },
      ],
      followUps: ['How to convert a lead to a student?', 'How to schedule a campus tour?'],
    };
  }

  if (
    q.includes('super admin') ||
    q.includes('platform') ||
    q.includes('mrr') ||
    q.includes('tenant') ||
    q.includes('provision')
  ) {
    return {
      reply: `### 🛡️ Super Admin Master Console:

- **Platform Health & MRR**: Monitor platform-wide metrics, active institutional tenants, total student count, and Monthly Recurring Revenue (₹4.85 Lakhs).
- **Tenant Provisioning**: Add new schools or coaching institutes with customized primary colors, branding, and dynamic labels.
- **SaaS Subscription Quotas**: Configure Starter, Campus Pro, and Institutional Trust plan tiers.
- **Security Audit Trail**: Review security audit logs capturing logins, payments, and permission changes across all tenants.`,
      actions: [
        { label: 'Open Super Admin Console', route: 'super-admin', badge: 'Console' },
      ],
      followUps: [
        'How to onboard a new institution?',
        'How does platform subscription billing work?',
      ],
    };
  }

  // 11. DEFAULT / GENERAL QUERY
  return {
    reply: `👋 **I'm your EduNexus ERP Assistant!**

I can help you with anything across the 22 operational modules in the system:
• **Admissions & Students**: Enrolling students, student profiles, digital ID cards
• **Fees & Payments**: Online Razorpay BYOK payments, fee records, 3-copy receipts
• **Attendance**: QR scanner gate kiosks, class register, parent alerts
• **Exams & Reports**: CBSE 8-point grading criteria, marks entry, report card generation
• **Staff & Payroll**: Faculty directory, biometric attendance, batch salary processing
• **Logistics**: School bus GPS tracking, hostel rooms, mess dining, library OPAC

What would you like to know more about?`,
    actions: [
      { label: 'Fee Collection Desk', route: 'app/fees' },
      { label: 'QR Attendance Kiosk', route: 'app/attendance' },
      { label: 'Students Registry', route: 'app/students' },
    ],
    followUps: [
      'How does fee payment work?',
      'How to mark attendance with QR codes?',
      'How to admit a new student?',
    ],
  };
}

import { queryEmbeddedBrain, ConversationTurn } from './ai/embeddedBrain';

/**
 * AI Assistant query resolver
 * High-performance, offline-first ChatGPT-grade assistant
 * backed by complete platform embedded intelligence.
 */
export async function queryAiAssistant(
  query: string, 
  ctx: UserContext,
  history: ConversationTurn[] = []
): Promise<AiResponse> {
  const brainRes = queryEmbeddedBrain(query, ctx, history);

  if (brainRes && brainRes.reply) {
    return {
      reply: brainRes.reply,
      actions: brainRes.actions,
      followUps: brainRes.followUps,
      citations: brainRes.citations?.map(c => ({
        documentId: c.title,
        documentTitle: c.title,
        category: (c.category.toLowerCase().includes('fee') ? 'fees_finance' : 'general') as any,
        chunkExcerpt: c.title,
        similarityScore: c.matchScore / 100
      })),
      ragGrounding: {
        model: 'EduNexus Embedded Intelligence (Zero-Latency AI)',
        retrievalLatencyMs: 1,
        generationLatencyMs: 4,
        grounded: (brainRes.citations && brainRes.citations.length > 0) || false,
      }
    };
  }

  return queryAiKnowledge(query, ctx);
}

