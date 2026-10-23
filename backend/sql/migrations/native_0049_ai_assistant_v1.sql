-- Migration: native_0049_ai_assistant_v1.sql
-- Description: The EduNexus Assistant (Gemini) joins V1. Reuses the tables from
-- native_0046. Adds permissions and replaces the platform help articles, which
-- described V2 modules, with articles that match what V1 ships.

-- 1. Permissions: every role can chat; owners manage their institution's FAQ.
INSERT INTO permissions(key,name,description,module) VALUES
 ('ai.chat','Use assistant','Ask the EduNexus Assistant questions','ai'),
 ('ai.knowledge.manage','Manage assistant FAQ','Add and remove institution FAQ articles used by the assistant','ai')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN','TEACHER','ACCOUNTANT','STAFF','PARENT','STUDENT') AND p.key='ai.chat'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key='ai.knowledge.manage'
ON CONFLICT DO NOTHING;

-- 2. Retire the native_0046 platform articles.
UPDATE ai_knowledge_documents SET status='ARCHIVED', updated_at=NOW()
WHERE tenant_id IS NULL AND source_type='SYSTEM' AND source_path LIKE 'verified-feature-manifest/%' AND status='ACTIVE';

-- 3. V1 help articles. One chunk each; the assistant retrieves them by keyword.
CREATE TEMP TABLE v1_help(title TEXT, path TEXT, roles TEXT[], content TEXT) ON COMMIT DROP;
INSERT INTO v1_help VALUES
('Getting started and modules', 'v1-help/overview', ARRAY['ALL'],
 'EduNexus V1 modules: Dashboard, Students, Attendance, Examinations, Timetable, Homework, Fees, Notices, Staff & HR, Reports, School/Institute Setup, Users & Access and Subscription. Parents and students have their own portal screens for attendance, results, timetable, homework and fees. Before admissions, attendance or timetables, open School Setup (Institute Setup for coaching) and create the academic year, classes, sections and subjects. Coaching institutes see Course, Batch and Test instead of Class, Section and Exam. Not available in V1: library, inventory, transport, hostel, mess, finance/accounting screens, CRM, health records, custom roles, multiple branches, student ID cards, homework submission and grading, online payment gateway, WhatsApp/SMS alerts and certificates (TC, bonafide).'),
('Admitting and importing students', 'v1-help/students', ARRAY['ALL'],
 'Open Students to admit a student: admission number, name, gender, date of birth, contact details, the enrollment (academic year, class, section, roll number) and optionally a parent or guardian. A student has one permanent record and a yearly enrollment that holds the class and section. To add many students at once, click "Import students (Excel / CSV)". Upload an Excel workbook (.xlsx) or a CSV. Column order does not matter and common names are recognised, such as Adm No, Student Name, DOB, Mobile, Class, Section, Father''s Name and Father''s Mobile. Dates can be DD/MM/YYYY or YYYY-MM-DD. Columns that do not match a field (for example Aadhaar number or transport route) are saved in the student''s notes. Choose the academic year and a default class and section; Class and Section columns in the file override them per row. Old .xls files must be saved as .xlsx first. Existing students are never overwritten. Parent and student logins are created by sending an invitation email from the student or fee screens; the person sets their own password from the email link.'),
('Daily attendance', 'v1-help/attendance', ARRAY['ALL'],
 'Open Attendance, choose the academic year, class, section and date, and load the roster. Mark each student Present, Absent, Late, Half day or Excused and save. Teachers can only mark classes and sections assigned to them. Saved attendance can be corrected with a reason, and every correction is kept in the history. Parents of absent students receive an absence alert by email and in-app. Reports & Export shows attendance percentages for a date range with CSV export. Parents see their children''s attendance and students see their own.'),
('QR attendance for coaching institutes', 'v1-help/qr-attendance', ARRAY['ALL'],
 'QR attendance is available only to coaching institutes on a plan that includes it (the Coaching Plan). Schools do not have it. The teacher opens Attendance, picks the batch and starts a QR session; a QR code that changes every 15 seconds is shown, with a full-screen projector mode. Students open Attendance & QR Scan on their phone and scan the code with the camera, or type the 6-digit code shown under the QR if the camera cannot be used. The camera needs HTTPS. Each student can check in once per session and must be enrolled in that batch. When the teacher closes the session, students who did not scan can be marked absent; existing attendance is never overwritten.'),
('Fees and manual UPI or bank payments', 'v1-help/fees', ARRAY['ALL'],
 'EduNexus does not take online card or gateway payments. Payments are manual: the institution sets its UPI ID, bank details and a payment QR image under Fees > Settings. Create fee structures per class and academic year with fee items, assign them to students with installments and concessions, and parents see dues in Fees & Payments. A parent pays by UPI or bank transfer outside EduNexus, then uploads a screenshot and the UTR / transaction reference. The accountant or owner approves or rejects the proof. Approval creates a payment and a receipt numbered REC-YYYY-XXXXXX; the parent is notified by email. Notices > Fee reminders can email parents about dues. Fee reports show assigned, collected and outstanding amounts.'),
('Examinations, results and report cards', 'v1-help/exams', ARRAY['ALL'],
 'Open Examinations to create grade scales and exams for an academic year, add the subject schedule, and enter marks. Teachers enter marks only for their assigned subjects and classes. Results and grades are calculated automatically. When marks are complete, publish the exam; published marks are locked and parents and students are notified. Parents see Children''s Results and students see My Results, including printable report cards.'),
('Timetable and homework', 'v1-help/timetable-homework', ARRAY['ALL'],
 'Timetable: add weekly periods for a class and section with subject, teacher, room and time. EduNexus blocks clashes where a teacher or room is double-booked. Students see My Timetable. Homework: teachers post homework for their class, section and subject with a due date; parents and students see homework for their own class. Online homework submission and grading are not available in V1.'),
('Notices and email', 'v1-help/notices', ARRAY['TENANT_ADMIN','ACCOUNTANT','TEACHER','STAFF'],
 'Notices lets authorised staff manage message templates and send in-app and email notices, and shows a delivery log with the status of each message. Emails come from the EduNexus sending address. Automatic emails include invitations, password reset, absence alerts, fee proof approved or rejected, exam results published, leave decisions and payslips. WhatsApp and SMS alerts are planned but not available yet.'),
('Staff, leave, staff attendance and payroll', 'v1-help/staff-hr', ARRAY['ALL'],
 'Staff & HR has these tabs. Staff & Teachers: add staff, or bulk import from Excel or CSV (only a Name column is required; a Basic Salary column sets payroll salary), and send a teacher an invitation email to create their login. Teaching Assignments: link teachers to subjects, classes and sections. Leave: the owner creates leave types (paid types use a yearly balance, unpaid types count as loss of pay) and sets entitlements; staff request leave under My HR > My Leave; the owner approves, rejects or revokes, and staff are emailed. Staff Attendance: mark staff Present, Late, Absent or Leave for a date; approved leave is filled in automatically. Payroll: set each person''s monthly basic, allowances (such as HRA) and deductions (such as PF), then Run payroll for a month. Pay is reduced pro-rata for absent days and unpaid leave. Draft runs can be recalculated or deleted; Finalize publishes payslips (staff are notified and can view and print them under My HR > My Payslips); then Mark paid with the payment date and bank reference. The accountant can run payroll. QR check-in for staff is not available.'),
('Reports', 'v1-help/reports', ARRAY['TENANT_ADMIN','ACCOUNTANT','TEACHER'],
 'Reports shows student, attendance, fee and exam summaries for the institution, each with CSV export that opens in Excel.'),
('Users, roles and passwords', 'v1-help/users', ARRAY['ALL'],
 'Users & Access lets the owner invite users by email with a fixed role (Owner, Teacher, Accountant, Staff, Parent, Student), activate or suspend them, and see the activity log. Custom roles are not available in V1. Invited people receive an email link to set their password. Anyone who forgot their password can click "Forgot password?" on the sign-in page; a reset link valid for 15 minutes is emailed. Changing the password signs the user out on all devices. If no email arrives, check the spam folder and confirm the email address with the administrator.'),
('Subscription and billing', 'v1-help/subscription', ARRAY['TENANT_ADMIN','SUPER_ADMIN'],
 'Institutions pay the EduNexus subscription manually. The owner opens Subscription, chooses a plan, pays the shown amount by UPI QR or bank transfer, and uploads the payment screenshot with the UTR reference. The EduNexus platform team verifies the proof and activates or renews the subscription. If the subscription lapses, records are kept but only the Subscription screen opens until it is renewed. Plans: Starter, Growth, Enterprise (yearly) and the Coaching Plan, which is the only plan with QR attendance and only for coaching institutes.');

INSERT INTO ai_knowledge_documents(title, source_type, source_path, visibility, allowed_roles, status, content_hash)
SELECT h.title, 'SYSTEM', h.path, 'PLATFORM', h.roles, 'ACTIVE', md5(h.content)
FROM v1_help h
WHERE NOT EXISTS (SELECT 1 FROM ai_knowledge_documents d WHERE d.tenant_id IS NULL AND d.source_path=h.path AND d.status='ACTIVE');

INSERT INTO ai_knowledge_chunks(document_id, tenant_id, chunk_index, heading, content, token_estimate)
SELECT d.id, NULL, 0, h.title, h.content, GREATEST(1, CEIL(char_length(h.content) / 4.0)::INTEGER)
FROM v1_help h JOIN ai_knowledge_documents d ON d.tenant_id IS NULL AND d.source_path=h.path AND d.status='ACTIVE'
ON CONFLICT(document_id, chunk_index) DO NOTHING;
