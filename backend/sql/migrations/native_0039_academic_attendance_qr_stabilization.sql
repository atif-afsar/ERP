-- Migration: native_0039_academic_attendance_qr_stabilization.sql
-- Description: QR attendance sessions, attendance correction history, audit linkage, and tenant integrity

-- 1. Create QR Attendance Sessions table
CREATE TABLE IF NOT EXISTS public.attendance_qr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL,
    class_id UUID NOT NULL,
    section_id UUID NOT NULL,
    attendance_date DATE NOT NULL,
    subject_id UUID,
    timetable_entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE SET NULL,
    token_hash VARCHAR(64) NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_qr_session_year_tenant FOREIGN KEY (academic_year_id, tenant_id) REFERENCES public.academic_years(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_qr_session_class_tenant FOREIGN KEY (class_id, tenant_id) REFERENCES public.classes(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_qr_session_section_class_tenant FOREIGN KEY (section_id, class_id, tenant_id) REFERENCES public.sections(id, class_id, tenant_id) ON DELETE RESTRICT
);

-- Tenant-safe unique token hash
CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_session_token_hash 
    ON public.attendance_qr_sessions(tenant_id, token_hash);

-- Only one active QR session per tenant, academic year, class, section, and date
CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_session_active_scope 
    ON public.attendance_qr_sessions(tenant_id, academic_year_id, class_id, section_id, attendance_date) 
    WHERE (status = 'ACTIVE');

CREATE INDEX IF NOT EXISTS idx_qr_session_scope 
    ON public.attendance_qr_sessions(tenant_id, class_id, section_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_qr_session_expiry 
    ON public.attendance_qr_sessions(tenant_id, status, expires_at);

-- 2. Add qr_session_id to attendance_records
ALTER TABLE public.attendance_records 
    ADD COLUMN IF NOT EXISTS qr_session_id UUID REFERENCES public.attendance_qr_sessions(id) ON DELETE SET NULL;

-- 3. Create Attendance Corrections Audit Table
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL,
    attendance_date DATE NOT NULL,
    previous_status VARCHAR(20) NOT NULL CHECK (previous_status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY')),
    new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY')),
    reason TEXT NOT NULL,
    corrected_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_att_corr_enrollment_tenant FOREIGN KEY (enrollment_id, tenant_id) REFERENCES public.enrollments(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT ck_att_corr_status_differ CHECK (previous_status <> new_status),
    CONSTRAINT ck_att_corr_reason_len CHECK (char_length(trim(reason)) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_att_corr_record 
    ON public.attendance_corrections(tenant_id, attendance_record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_att_corr_enrollment 
    ON public.attendance_corrections(tenant_id, enrollment_id, created_at DESC);

-- 4. Permissions for attendance correction
INSERT INTO public.permissions(key, name, description, module)
VALUES ('attendance.correct', 'Correct attendance', 'Submit audited corrections to existing student attendance records', 'attendance')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, module = EXCLUDED.module;

-- Grant to SUPER_ADMIN, TENANT_ADMIN, and TEACHER
INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'TEACHER')
  AND p.key = 'attendance.correct'
ON CONFLICT DO NOTHING;
