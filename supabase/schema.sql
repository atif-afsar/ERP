-- ====================================================================================
-- School + Coaching Centre ERP SaaS - Master Database Schema (v1.0)
-- Conforms strictly to 07-DATABASE-SCHEMA.md & 06-DATABASE-ARCHITECTURE.md
-- Fully normalized with RLS policies, audit logs, and composite query indexes
-- ====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------------
-- 1. PLATFORM & TENANT LAYER
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    tenant_type VARCHAR(20) NOT NULL CHECK (tenant_type IN ('school', 'coaching')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'suspended', 'inactive', 'cancelled')),
    logo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    currency VARCHAR(10) DEFAULT 'INR',
    address_line_1 TEXT,
    address_line_2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, key)
);

CREATE TABLE IF NOT EXISTS public.tenant_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.tenant_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, key)
);

-- ------------------------------------------------------------------------------------
-- 2. IDENTITY, ROLES & PERMISSIONS
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL for platform/system roles
    name VARCHAR(100) NOT NULL,
    key VARCHAR(50) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, user_id)
);

-- ------------------------------------------------------------------------------------
-- 3. ACADEMIC STRUCTURES: YEARS, CLASSES, SECTIONS, COURSES, BATCHES & SUBJECTS
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(50),
    capacity INTEGER DEFAULT 40 CHECK (capacity > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    capacity INTEGER DEFAULT 45 CHECK (capacity > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, code)
);

-- ------------------------------------------------------------------------------------
-- 4. PEOPLE: STUDENTS, PARENTS, STAFF & ENROLLMENTS
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_number VARCHAR(100),
    admission_number VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(50),
    email VARCHAR(255),
    address_line_1 TEXT,
    address_line_2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    profile_image_url TEXT,
    qr_code VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'graduated', 'transferred', 'archived')),
    joined_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),
    UNIQUE(tenant_id, admission_number)
);

CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    occupation VARCHAR(100),
    address_line_1 TEXT,
    address_line_2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.parent_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL DEFAULT 'Father',
    is_primary BOOLEAN DEFAULT true,
    can_receive_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    joining_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC(12, 2) DEFAULT 0.00 CHECK (salary >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'resigned')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, employee_number)
);

CREATE TABLE IF NOT EXISTS public.batch_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(batch_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'transferred', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------------
-- 5. ATTENDANCE ENGINE
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    marked_by VARCHAR(100),
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'qr_scan', 'biometric')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------------
-- 6. FINANCE: STRUCTURES, ASSIGNMENTS, PAYMENTS & REFUNDS
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    frequency VARCHAR(50) DEFAULT 'annual' CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'term', 'annual')),
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    heads JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fee_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    concession NUMERIC(12, 2) DEFAULT 0.00 CHECK (concession >= 0),
    paid_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (paid_amount >= 0),
    due_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (due_amount >= 0),
    installments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_assignment_id UUID REFERENCES public.fee_assignments(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR',
    payment_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'online', 'razorpay')),
    status VARCHAR(20) DEFAULT 'successful' CHECK (status IN ('pending', 'successful', 'failed', 'refunded', 'partially_refunded', 'cancelled')),
    reference_number VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'Razorpay',
    provider_order_id VARCHAR(255),
    provider_payment_id VARCHAR(255),
    recorded_by VARCHAR(100),
    notes TEXT,
    receipt_no VARCHAR(100) NOT NULL,
    fee_breakdown JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, receipt_no)
);

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    processed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_by VARCHAR(100),
    provider_refund_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    external_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'processed' CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------------
-- 7. EXAMS, TESTS & RESULTS (School & Coaching Models)
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('school_term', 'coaching_test_series', 'unit_test', 'mock_test', 'quiz')),
    start_date DATE,
    end_date DATE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'ongoing', 'completed', 'published')),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exam_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    max_marks NUMERIC(8, 2) NOT NULL CHECK (max_marks > 0),
    passing_marks NUMERIC(8, 2) NOT NULL CHECK (passing_marks >= 0),
    exam_date DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    exam_subject_id UUID NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(8, 2) NOT NULL CHECK (marks_obtained >= 0),
    grade VARCHAR(10),
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'locked')),
    published_at TIMESTAMPTZ,
    published_by VARCHAR(100),
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(exam_subject_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) DEFAULT 'offline' CHECK (test_type IN ('offline', 'online', 'mock_jee', 'mock_neet')),
    test_date DATE NOT NULL,
    max_marks NUMERIC(8, 2) NOT NULL CHECK (max_marks > 0),
    duration_minutes INTEGER DEFAULT 180 CHECK (duration_minutes > 0),
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'scheduled', 'completed', 'published')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(8, 2) NOT NULL CHECK (marks_obtained >= 0),
    rank INTEGER,
    percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(test_id, student_id)
);

-- ------------------------------------------------------------------------------------
-- 8. HOMEWORK, TIMETABLE & ANNOUNCEMENTS
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    assigned_by VARCHAR(100),
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('draft', 'assigned', 'closed')),
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late', 'resubmitted')),
    attachment_url TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(homework_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    room VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_by VARCHAR(100),
    audience_type VARCHAR(50) DEFAULT 'all' CHECK (audience_type IN ('all', 'students', 'parents', 'teachers', 'staff', 'specific_class', 'specific_batch')),
    target_group_id UUID,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    published_at DATE DEFAULT CURRENT_DATE,
    expires_at DATE,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------------
-- 9. NOTIFICATIONS, LEADS CRM, DOCUMENTS & AUDIT LOGS
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('in_app', 'whatsapp', 'email', 'sms')),
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    interested_course_or_class VARCHAR(255) NOT NULL,
    source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('walk_in', 'website', 'whatsapp', 'referral', 'social_media')),
    status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'demo_scheduled', 'follow_up', 'enrolled', 'lost')),
    assigned_staff_name VARCHAR(100),
    follow_up_date DATE,
    notes TEXT,
    estimated_value NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- e.g. 'student', 'staff', 'receipt'
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------------
-- 10. COMPOSITE INDEXES FOR HIGH-PERFORMANCE TENANT FILTERING
-- ------------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_user ON public.memberships(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant_status ON public.students(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_students_tenant_admission ON public.students(tenant_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_parents_tenant_phone ON public.parents(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_parent_students_tenant ON public.parent_students(tenant_id, parent_id, student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_student ON public.enrollments(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON public.attendance_records(tenant_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_tenant_student ON public.fee_assignments(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON public.payments(tenant_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_results_tenant_student ON public.results(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_tenant_test ON public.test_results(tenant_id, test_id);
CREATE INDEX IF NOT EXISTS idx_timetable_tenant_day ON public.timetable_entries(tenant_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_homework_tenant_due ON public.homework(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON public.announcements(tenant_id, published_at);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON public.notifications(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON public.leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON public.audit_logs(tenant_id, action);

-- ------------------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) & ISOLATION POLICIES
-- ------------------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_tenant_member(lookup_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid()
        AND tenant_id = lookup_tenant_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY tenant_isolation_students ON public.students FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_attendance ON public.attendance_records FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_fee_assignments ON public.fee_assignments FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_payments ON public.payments FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_results ON public.results FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_test_results ON public.test_results FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_timetable ON public.timetable_entries FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_homework ON public.homework FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_announcements ON public.announcements FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_leads ON public.leads FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_documents ON public.documents FOR ALL USING (public.is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation_audit_logs ON public.audit_logs FOR SELECT USING (public.is_tenant_member(tenant_id));
