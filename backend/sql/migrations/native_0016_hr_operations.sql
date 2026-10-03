-- Phase 11A. Extend existing Phase 5 staff, never duplicate employee identities.
CREATE TABLE leave_types (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
 name VARCHAR(100) NOT NULL, paid BOOLEAN NOT NULL DEFAULT true, active BOOLEAN NOT NULL DEFAULT true,
 UNIQUE(id,tenant_id), UNIQUE(tenant_id,name)
);
CREATE TABLE leave_balances (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
 staff_id UUID NOT NULL, leave_type_id UUID NOT NULL, year INT NOT NULL CHECK(year BETWEEN 2000 AND 2200),
 entitlement INT NOT NULL CHECK(entitlement>=0), used INT NOT NULL DEFAULT 0 CHECK(used>=0 AND used<=entitlement),
 FOREIGN KEY(staff_id,tenant_id) REFERENCES staff(id,tenant_id),
 FOREIGN KEY(leave_type_id,tenant_id) REFERENCES leave_types(id,tenant_id),
 UNIQUE(tenant_id,staff_id,leave_type_id,year)
);
CREATE TABLE leave_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
 staff_id UUID NOT NULL, leave_type_id UUID NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
 reason TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
 reviewed_by UUID REFERENCES users(id), review_note TEXT, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(end_date>=start_date AND EXTRACT(YEAR FROM start_date)=EXTRACT(YEAR FROM end_date)),
 CHECK(end_date-start_date<366), UNIQUE(id,tenant_id,staff_id),
 FOREIGN KEY(staff_id,tenant_id) REFERENCES staff(id,tenant_id),
 FOREIGN KEY(leave_type_id,tenant_id) REFERENCES leave_types(id,tenant_id)
);
CREATE INDEX leave_requests_scope ON leave_requests(tenant_id,staff_id,start_date,end_date);
CREATE TABLE staff_attendance (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id), staff_id UUID NOT NULL,
 date DATE NOT NULL, status VARCHAR(20) NOT NULL CHECK(status IN ('PRESENT','ABSENT','LATE','LEAVE')),
 leave_request_id UUID, recorded_by UUID NOT NULL REFERENCES users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(staff_id,tenant_id) REFERENCES staff(id,tenant_id),
 FOREIGN KEY(leave_request_id,tenant_id,staff_id) REFERENCES leave_requests(id,tenant_id,staff_id),
 UNIQUE(tenant_id,staff_id,date), CHECK(leave_request_id IS NULL OR status='LEAVE')
);
INSERT INTO permissions(key,name,description,module) VALUES
 ('hr.view','View HR','View tenant HR dashboard, leave and attendance','hr'),
 ('hr.manage','Manage HR','Configure leave types and entitlements','hr'),
 ('hr.leave.request','Request own leave','Request and view own staff leave','hr'),
 ('hr.leave.approve','Review leave','Approve or reject other staff leave','hr'),
 ('hr.attendance.manage','Manage staff attendance','Record staff attendance','hr') ON CONFLICT(key) DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key LIKE 'hr.%' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('TEACHER','STAFF') AND p.key='hr.leave.request' ON CONFLICT DO NOTHING;
INSERT INTO notification_templates(code,name,channel,category,subject_template,body_template,is_system)
 SELECT 'STAFF_LEAVE_'||outcome,'Leave '||lower(outcome),channel,'TRANSACTIONAL','Leave '||lower(outcome),
 '{{name}}: leave from {{start_date}} to {{end_date}} was '||lower(outcome)||'. {{note}}',true
 FROM (VALUES('APPROVED'),('REJECTED')) o(outcome) CROSS JOIN (VALUES('EMAIL'),('IN_APP')) c(channel);
