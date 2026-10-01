-- Phase 7: enrollment-linked fee management with manual payment-proof verification.

CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_structures_id_tenant ON fee_structures(id,tenant_id);
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS academic_year_id UUID;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED'));
ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_class_id_fkey;
ALTER TABLE fee_structures ADD CONSTRAINT fk_fee_structure_class_tenant FOREIGN KEY(class_id,tenant_id) REFERENCES classes(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE fee_structures ADD CONSTRAINT fk_fee_structure_year_tenant FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_structure_scope_name ON fee_structures(tenant_id,academic_year_id,class_id,name);

CREATE TABLE IF NOT EXISTS fee_structure_items(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 fee_structure_id UUID NOT NULL,name VARCHAR(150) NOT NULL,amount NUMERIC(12,2) NOT NULL CHECK(amount>0),sort_order INT NOT NULL DEFAULT 0,
 FOREIGN KEY(fee_structure_id,tenant_id) REFERENCES fee_structures(id,tenant_id) ON DELETE CASCADE,
 UNIQUE(fee_structure_id,name)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_assignments_id_tenant ON fee_assignments(id,tenant_id);
ALTER TABLE fee_assignments ADD COLUMN IF NOT EXISTS enrollment_id UUID;
ALTER TABLE fee_assignments ADD COLUMN IF NOT EXISTS academic_year_id UUID;
ALTER TABLE fee_assignments ADD COLUMN IF NOT EXISTS concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(concession_amount>=0);
ALTER TABLE fee_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE fee_assignments DROP CONSTRAINT IF EXISTS fee_assignments_student_id_fkey;
ALTER TABLE fee_assignments DROP CONSTRAINT IF EXISTS fee_assignments_fee_structure_id_fkey;
ALTER TABLE fee_assignments ADD CONSTRAINT fk_fee_assignment_student_tenant FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE fee_assignments ADD CONSTRAINT fk_fee_assignment_enrollment_tenant FOREIGN KEY(enrollment_id,tenant_id) REFERENCES enrollments(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE fee_assignments ADD CONSTRAINT fk_fee_assignment_year_tenant FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE fee_assignments ADD CONSTRAINT fk_fee_assignment_structure_tenant FOREIGN KEY(fee_structure_id,tenant_id) REFERENCES fee_structures(id,tenant_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_assignment_enrollment_structure ON fee_assignments(tenant_id,enrollment_id,fee_structure_id) WHERE enrollment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS fee_installments(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 fee_assignment_id UUID NOT NULL,name VARCHAR(100) NOT NULL,due_date DATE NOT NULL,amount NUMERIC(12,2) NOT NULL CHECK(amount>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(fee_assignment_id,tenant_id) REFERENCES fee_assignments(id,tenant_id) ON DELETE CASCADE,
 UNIQUE(id,tenant_id),UNIQUE(fee_assignment_id,name)
);

CREATE TABLE IF NOT EXISTS school_payment_settings(
 tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,payee_name VARCHAR(255) NOT NULL,
 upi_id VARCHAR(255) NOT NULL,bank_name VARCHAR(255),account_last_four VARCHAR(4),instructions TEXT,
 qr_image_data BYTEA,qr_mime_type VARCHAR(50),updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(qr_mime_type IS NULL OR qr_mime_type IN ('image/png','image/jpeg','image/webp'))
);

CREATE TABLE IF NOT EXISTS payment_proofs(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 fee_assignment_id UUID NOT NULL,installment_id UUID,enrollment_id UUID NOT NULL,amount NUMERIC(12,2) NOT NULL CHECK(amount>0),
 transaction_reference VARCHAR(150) NOT NULL,payment_date DATE NOT NULL,proof_file_name VARCHAR(255) NOT NULL,
 proof_mime_type VARCHAR(50) NOT NULL CHECK(proof_mime_type IN ('image/png','image/jpeg','image/webp','application/pdf')),
 proof_data BYTEA NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,verified_by UUID REFERENCES users(id) ON DELETE RESTRICT,
 verification_notes TEXT,submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),verified_at TIMESTAMPTZ,
 FOREIGN KEY(fee_assignment_id,tenant_id) REFERENCES fee_assignments(id,tenant_id) ON DELETE RESTRICT,
 FOREIGN KEY(installment_id,tenant_id) REFERENCES fee_installments(id,tenant_id) ON DELETE RESTRICT,
 FOREIGN KEY(enrollment_id,tenant_id) REFERENCES enrollments(id,tenant_id) ON DELETE RESTRICT,
 UNIQUE(id,tenant_id),UNIQUE(tenant_id,transaction_reference)
);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_review ON payment_proofs(tenant_id,status,submitted_at);

CREATE TABLE IF NOT EXISTS fee_receipt_sequences(
 tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,next_number BIGINT NOT NULL DEFAULT 1 CHECK(next_number>0)
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS enrollment_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_proof_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_id_tenant ON payments(id,tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_proof ON payments(tenant_id,payment_proof_id) WHERE payment_proof_id IS NOT NULL;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_fee_assignment_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
ALTER TABLE payments ADD CONSTRAINT fk_payment_assignment_tenant FOREIGN KEY(fee_assignment_id,tenant_id) REFERENCES fee_assignments(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT fk_payment_student_tenant FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT fk_payment_enrollment_tenant FOREIGN KEY(enrollment_id,tenant_id) REFERENCES enrollments(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT fk_payment_installment_tenant FOREIGN KEY(installment_id,tenant_id) REFERENCES fee_installments(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT fk_payment_proof_tenant FOREIGN KEY(payment_proof_id,tenant_id) REFERENCES payment_proofs(id,tenant_id) ON DELETE RESTRICT;

INSERT INTO permissions(key,name,description,module) VALUES
 ('fee_management.view','View fees','View fee structures, assignments, installments, and dues','fees'),
 ('fee_management.manage','Manage fees','Manage fee structures, student assignments, and installments','fees'),
 ('payment_settings.manage','Manage payment settings','Configure school UPI and QR payment instructions','fees'),
 ('payment_proofs.submit','Submit payment proof','Upload proof for a linked student fee due','fees'),
 ('payment_proofs.verify','Verify payment proof','Approve or reject manual payment proofs','fees'),
 ('fee_receipts.view','View fee receipts','View generated receipts in permitted student scope','fees'),
 ('fee_reports.view','View fee reports','View fee collection and outstanding reports','fees')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key IN ('fee_management.view','fee_management.manage','payment_settings.manage','payment_proofs.submit','payment_proofs.verify','fee_receipts.view','fee_reports.view') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key='ACCOUNTANT' AND p.key IN ('fee_management.view','fee_management.manage','payment_settings.manage','payment_proofs.verify','fee_receipts.view','fee_reports.view') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key='PARENT' AND p.key IN ('fee_management.view','payment_proofs.submit','fee_receipts.view') ON CONFLICT DO NOTHING;
