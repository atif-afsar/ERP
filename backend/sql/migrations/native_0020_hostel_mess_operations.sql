DO $$ BEGIN IF EXISTS(SELECT 1 FROM hostel_rooms WHERE capacity<1 OR capacity>1000 OR occupied<0 OR occupied>capacity) THEN RAISE EXCEPTION 'Reconcile invalid legacy hostel capacity/occupancy before migration'; END IF; END $$;
CREATE TABLE hostel_buildings(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),name VARCHAR(100) NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE','ARCHIVED')),UNIQUE(id,tenant_id),UNIQUE(tenant_id,name));
INSERT INTO hostel_buildings(tenant_id,name) SELECT DISTINCT tenant_id,hostel_name FROM hostel_rooms;
ALTER TABLE hostel_rooms ADD CONSTRAINT hostel_room_tenant_identity UNIQUE(id,tenant_id);
ALTER TABLE hostel_rooms ADD COLUMN building_id UUID;
ALTER TABLE hostel_rooms ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(lifecycle_status IN ('ACTIVE','INACTIVE','ARCHIVED'));
UPDATE hostel_rooms r SET building_id=b.id FROM hostel_buildings b WHERE b.tenant_id=r.tenant_id AND b.name=r.hostel_name;
ALTER TABLE hostel_rooms ALTER COLUMN building_id SET NOT NULL;
ALTER TABLE hostel_rooms ADD FOREIGN KEY(building_id,tenant_id) REFERENCES hostel_buildings(id,tenant_id);
CREATE TABLE hostel_beds(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),room_id UUID NOT NULL,label VARCHAR(100) NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','LEGACY_HOLD','ARCHIVED')),UNIQUE(id,tenant_id),UNIQUE(tenant_id,room_id,label),FOREIGN KEY(room_id,tenant_id) REFERENCES hostel_rooms(id,tenant_id));
INSERT INTO hostel_beds(tenant_id,room_id,label,status) SELECT r.tenant_id,r.id,'Bed '||n,CASE WHEN n<=COALESCE(r.occupied,0) THEN 'LEGACY_HOLD' ELSE 'ACTIVE' END FROM hostel_rooms r CROSS JOIN LATERAL generate_series(1,r.capacity) n;
ALTER TABLE enrollments ADD CONSTRAINT enrollment_student_tenant_identity UNIQUE(id,student_id,tenant_id);
CREATE TABLE hostel_allocations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),bed_id UUID NOT NULL,enrollment_id UUID NOT NULL,student_id UUID NOT NULL,
 allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),checked_out_at TIMESTAMPTZ,
 FOREIGN KEY(bed_id,tenant_id) REFERENCES hostel_beds(id,tenant_id),FOREIGN KEY(enrollment_id,student_id,tenant_id) REFERENCES enrollments(id,student_id,tenant_id),CHECK(checked_out_at IS NULL OR checked_out_at>=allocated_at)
);
CREATE UNIQUE INDEX one_active_hostel_bed ON hostel_allocations(bed_id) WHERE checked_out_at IS NULL;
CREATE UNIQUE INDEX one_active_hostel_student ON hostel_allocations(student_id) WHERE checked_out_at IS NULL;
CREATE TABLE mess_meal_plans(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),name VARCHAR(100) NOT NULL,description TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE','ARCHIVED')),UNIQUE(id,tenant_id),UNIQUE(tenant_id,name));
ALTER TABLE mess_menus ADD COLUMN plan_id UUID;
INSERT INTO mess_meal_plans(tenant_id,name,description) SELECT DISTINCT tenant_id,'Legacy menu','Preserved existing menus' FROM mess_menus;
UPDATE mess_menus m SET plan_id=p.id FROM mess_meal_plans p WHERE p.tenant_id=m.tenant_id AND p.name='Legacy menu';
ALTER TABLE mess_menus ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE mess_menus ADD FOREIGN KEY(plan_id,tenant_id) REFERENCES mess_meal_plans(id,tenant_id);
-- Leave legacy day/meal text recoverable; new APIs enforce weekly menu vocabulary.
CREATE TABLE mess_assignments(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),plan_id UUID NOT NULL,student_id UUID,staff_id UUID,assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),ended_at TIMESTAMPTZ,
 CHECK(num_nonnulls(student_id,staff_id)=1),CHECK(ended_at IS NULL OR ended_at>=assigned_at),FOREIGN KEY(plan_id,tenant_id) REFERENCES mess_meal_plans(id,tenant_id),FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id),FOREIGN KEY(staff_id,tenant_id) REFERENCES staff(id,tenant_id));
CREATE UNIQUE INDEX one_active_mess_student ON mess_assignments(student_id) WHERE ended_at IS NULL AND student_id IS NOT NULL;
CREATE UNIQUE INDEX one_active_mess_staff ON mess_assignments(staff_id) WHERE ended_at IS NULL AND staff_id IS NOT NULL;
INSERT INTO permissions(key,name,description,module) VALUES('hostel.view','View hostel','View beds and allocations','hostel'),('hostel.manage','Manage hostel','Manage buildings rooms and allocations','hostel'),('mess.view','View mess','View plans menus and members','mess'),('mess.manage','Manage mess','Manage meal plans menus and members','mess') ON CONFLICT(key) DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND (p.key LIKE 'hostel.%' OR p.key LIKE 'mess.%') ON CONFLICT DO NOTHING;
