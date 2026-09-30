-- ====================================================================================
-- EduNexus ERP — Initial System Seed Data (v2.0)
-- Default roles, system permissions, and demo tenant configurations
-- ====================================================================================

-- 1. SYSTEM ROLES
INSERT INTO roles (id, name, key, description, is_system_role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Super Administrator', 'SUPER_ADMIN', 'Platform owner with full system access across all tenants', true),
  ('22222222-2222-2222-2222-222222222222', 'Tenant Administrator', 'TENANT_ADMIN', 'Institution administrator with full access to school/centre operations', true),
  ('33333333-3333-3333-3333-333333333333', 'Teacher', 'TEACHER', 'Academic teacher with attendance, homework, exams, and grading access', true),
  ('44444444-4444-4444-4444-444444444444', 'Accountant', 'ACCOUNTANT', 'Finance manager with fee collection, invoices, expenses, and payroll access', true),
  ('55555555-5555-5555-5555-555555555555', 'Staff', 'STAFF', 'Administrative and operational staff member', true),
  ('66666666-6666-6666-6666-666666666666', 'Parent / Guardian', 'PARENT', 'Parent portal access to linked student attendance, fees, and results', true),
  ('77777777-7777-7777-7777-777777777777', 'Student', 'STUDENT', 'Student portal access to own homework, timetable, attendance, and results', true)
ON CONFLICT (id) DO NOTHING;

-- 2. SYSTEM PERMISSIONS
INSERT INTO permissions (key, name, description, module)
VALUES
  ('tenants.manage', 'Manage Tenants', 'Create, update, and suspend tenants', 'Platform'),
  ('subscriptions.manage', 'Manage Subscriptions', 'Manage tenant plans and billing', 'Platform'),
  ('users.manage', 'Manage Users', 'Manage tenant users and memberships', 'Users'),
  ('roles.manage', 'Manage Roles', 'Configure roles and permissions', 'Users'),
  ('settings.view', 'View Settings', 'View system settings', 'Settings'),
  ('settings.update', 'Update Settings', 'Update system settings', 'Settings'),
  ('students.view', 'View Students', 'View student directories and profiles', 'Students'),
  ('students.create', 'Create Students', 'Enroll new students', 'Students'),
  ('students.update', 'Update Students', 'Modify student records', 'Students'),
  ('students.delete', 'Delete Students', 'Archive or remove students', 'Students'),
  ('attendance.view', 'View Attendance', 'View attendance reports and records', 'Attendance'),
  ('attendance.mark', 'Mark Attendance', 'Record daily student/staff attendance', 'Attendance'),
  ('attendance.create', 'Create Attendance', 'Create attendance sessions', 'Attendance'),
  ('attendance.update', 'Update Attendance', 'Correct attendance logs', 'Attendance'),
  ('fees.view', 'View Fees', 'View fee structures and ledgers', 'Fees'),
  ('fees.create', 'Create Fees', 'Create fee structures and assign invoices', 'Fees'),
  ('fees.update', 'Update Fees', 'Modify fee structures and assignments', 'Fees'),
  ('fees.export', 'Export Fees', 'Export fee collection reports', 'Fees'),
  ('payments.view', 'View Payments', 'View transaction receipts', 'Payments'),
  ('payments.record', 'Record Payments', 'Accept fee payments and issue receipts', 'Payments'),
  ('payments.create', 'Create Payments', 'Generate payment transactions', 'Payments'),
  ('payments.refund', 'Refund Payments', 'Issue payment refunds', 'Payments'),
  ('exams.view', 'View Exams', 'View exam schedules and assessments', 'Exams'),
  ('exams.create', 'Create Exams', 'Schedule examinations', 'Exams'),
  ('exams.update', 'Update Exams', 'Modify exam configurations', 'Exams'),
  ('exams.publish', 'Publish Exams', 'Publish exam timetables', 'Exams'),
  ('results.view', 'View Results', 'View student marks and report cards', 'Results'),
  ('results.create', 'Enter Results', 'Enter marks for students', 'Results'),
  ('results.publish', 'Publish Results', 'Certify and release report cards', 'Results'),
  ('homework.view', 'View Homework', 'View homework and assignments', 'Homework'),
  ('homework.create', 'Create Homework', 'Assign homework to classes', 'Homework'),
  ('homework.update', 'Update Homework', 'Grade homework submissions', 'Homework'),
  ('timetable.view', 'View Timetable', 'View weekly schedule', 'Timetable'),
  ('timetable.manage', 'Manage Timetable', 'Configure class timetables', 'Timetable'),
  ('communication.send', 'Send Communications', 'Send SMS, Email, and WhatsApp', 'Communication'),
  ('announcements.view', 'View Announcements', 'Read notice board', 'Communication'),
  ('announcements.create', 'Create Announcements', 'Post notice board announcements', 'Communication'),
  ('reports.view', 'View Reports', 'Access analytics and reporting dashboard', 'Reports'),
  ('audit.view', 'View Audit Logs', 'Inspect system security audit trail', 'Audit'),
  ('documents.view', 'View Documents', 'View uploaded institution documents', 'Documents')
ON CONFLICT (key) DO NOTHING;

-- 3. DEMO TENANT
INSERT INTO tenants (id, name, slug, tenant_type, status, email, phone, city, state, country)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Delhi Public Academy',
  'delhi-public-academy',
  'school',
  'active',
  'admin@dps-academy.edu.in',
  '+91 11 2345 6789',
  'New Delhi',
  'Delhi',
  'India'
) ON CONFLICT (slug) DO NOTHING;

-- 4. DEMO ACADEMIC CLASSES
INSERT INTO classes (id, tenant_id, name, numeric_level, stream)
VALUES 
  ('c1111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Class 9', 9, 'General'),
  ('c2222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Class 10', 10, 'General'),
  ('c3333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Class 11 Science', 11, 'Science'),
  ('c4444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Class 12 Science', 12, 'Science')
ON CONFLICT (id) DO NOTHING;

-- 5. DEMO SECTIONS
INSERT INTO sections (id, tenant_id, class_id, name, capacity)
VALUES
  ('fa111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c2222222-2222-2222-2222-222222222222', 'Section A', 40),
  ('fa222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c2222222-2222-2222-2222-222222222222', 'Section B', 40),
  ('fa333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c3333333-3333-3333-3333-333333333333', 'Section PCM', 35)
ON CONFLICT (id) DO NOTHING;
