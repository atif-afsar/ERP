CREATE TABLE transport_vehicles(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),registration_number VARCHAR(50) NOT NULL,
 vehicle_type VARCHAR(50) NOT NULL,capacity INT NOT NULL CHECK(capacity BETWEEN 1 AND 500),driver_id UUID,
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE','ARCHIVED')),insurance_until DATE,permit_until DATE,
 UNIQUE(id,tenant_id),UNIQUE(tenant_id,registration_number),FOREIGN KEY(driver_id,tenant_id) REFERENCES staff(id,tenant_id)
);
-- Preserve legacy route identity and metadata. Operators explicitly link a verified staff driver before activation.
INSERT INTO transport_vehicles(tenant_id,registration_number,vehicle_type,capacity,status)
 SELECT tenant_id,vehicle_number,'BUS',LEAST(500,GREATEST(1,MIN(COALESCE(capacity,1)))),'INACTIVE' FROM transport_routes WHERE vehicle_number<>'' GROUP BY tenant_id,vehicle_number;
ALTER TABLE transport_routes ADD CONSTRAINT transport_route_tenant_identity UNIQUE(id,tenant_id);
ALTER TABLE transport_routes ADD COLUMN vehicle_id UUID;
ALTER TABLE transport_routes ADD COLUMN operational_status TEXT NOT NULL DEFAULT 'INACTIVE' CHECK(operational_status IN ('ACTIVE','INACTIVE','ARCHIVED'));
UPDATE transport_routes r SET vehicle_id=v.id FROM transport_vehicles v WHERE v.tenant_id=r.tenant_id AND v.registration_number=r.vehicle_number;
ALTER TABLE transport_routes ADD FOREIGN KEY(vehicle_id,tenant_id) REFERENCES transport_vehicles(id,tenant_id);
CREATE TABLE route_stops(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),route_id UUID NOT NULL,name VARCHAR(255) NOT NULL,sequence INT NOT NULL CHECK(sequence>0),UNIQUE(id,route_id,tenant_id),UNIQUE(tenant_id,route_id,sequence),FOREIGN KEY(route_id,tenant_id) REFERENCES transport_routes(id,tenant_id));
INSERT INTO route_stops(tenant_id,route_id,name,sequence)
 SELECT r.tenant_id,r.id,LEFT(COALESCE(NULLIF(stop->>'name',''),NULLIF(stop->>'stopName',''),CASE WHEN jsonb_typeof(stop)='string' THEN stop#>>'{}' ELSE 'Legacy stop '||position END),255),position::int
 FROM transport_routes r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.stops)='array' THEN r.stops ELSE '[]'::jsonb END) WITH ORDINALITY x(stop,position);
CREATE TABLE student_transport_assignments(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),enrollment_id UUID NOT NULL,route_id UUID NOT NULL,stop_id UUID NOT NULL,
 assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),ended_at TIMESTAMPTZ,
 FOREIGN KEY(enrollment_id,tenant_id) REFERENCES enrollments(id,tenant_id),FOREIGN KEY(route_id,tenant_id) REFERENCES transport_routes(id,tenant_id),FOREIGN KEY(stop_id,route_id,tenant_id) REFERENCES route_stops(id,route_id,tenant_id),CHECK(ended_at IS NULL OR ended_at>=assigned_at)
);
CREATE UNIQUE INDEX one_active_transport_enrollment ON student_transport_assignments(enrollment_id) WHERE ended_at IS NULL;
INSERT INTO permissions(key,name,description,module) VALUES('transport.view','View transport','View fleet routes and assignments','transport'),('transport.manage','Manage transport','Manage vehicles drivers routes and assignments','transport') ON CONFLICT(key) DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key LIKE 'transport.%' ON CONFLICT DO NOTHING;
