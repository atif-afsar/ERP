-- Migration: native_0040_academic_correction_integrity.sql
-- Description: Compound tenant & enrollment integrity on attendance corrections, version column for optimistic locking, and QR session status contract

-- 1. Add version column to attendance_records for durable optimistic concurrency
ALTER TABLE public.attendance_records
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- 2. Add compound unique constraints on attendance_records to support compound foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_attendance_records_id_tenant'
    ) THEN
        ALTER TABLE public.attendance_records
            ADD CONSTRAINT uq_attendance_records_id_tenant UNIQUE (id, tenant_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_attendance_records_id_tenant_enrollment'
    ) THEN
        ALTER TABLE public.attendance_records
            ADD CONSTRAINT uq_attendance_records_id_tenant_enrollment UNIQUE (id, tenant_id, enrollment_id);
    END IF;
END $$;

-- 3. Update attendance_corrections foreign keys for compound tenant and enrollment integrity
DO $$
BEGIN
    -- Drop legacy single-column foreign key if present
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'attendance_corrections_attendance_record_id_fkey'
    ) THEN
        ALTER TABLE public.attendance_corrections
            DROP CONSTRAINT attendance_corrections_attendance_record_id_fkey;
    END IF;

    -- Add compound foreign key enforcing tenant-safe and enrollment-safe association
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_att_corr_record_tenant_enrollment'
    ) THEN
        ALTER TABLE public.attendance_corrections
            ADD CONSTRAINT fk_att_corr_record_tenant_enrollment
            FOREIGN KEY (attendance_record_id, tenant_id, enrollment_id)
            REFERENCES public.attendance_records(id, tenant_id, enrollment_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_att_corr_record_tenant'
    ) THEN
        ALTER TABLE public.attendance_corrections
            ADD CONSTRAINT fk_att_corr_record_tenant
            FOREIGN KEY (attendance_record_id, tenant_id)
            REFERENCES public.attendance_records(id, tenant_id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Compound index on attendance_corrections for optimal join and cascade performance
CREATE INDEX IF NOT EXISTS idx_att_corr_record_tenant_enr
    ON public.attendance_corrections(attendance_record_id, tenant_id, enrollment_id);

-- 5. Ensure QR session status check constraint is authoritative (ACTIVE, CLOSED, EXPIRED, REVOKED)
DO $$
BEGIN
    -- native_0039 created attendance_qr_sessions_status_check with ACTIVE, CLOSED, EXPIRED, REVOKED.
    -- Verify and enforce idempotently:
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'attendance_qr_sessions_status_check'
    ) THEN
        ALTER TABLE public.attendance_qr_sessions
            ADD CONSTRAINT attendance_qr_sessions_status_check
            CHECK (status IN ('ACTIVE', 'CLOSED', 'EXPIRED', 'REVOKED'));
    END IF;
END $$;
