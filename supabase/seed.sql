-- ====================================================================================
-- EDUNEXUS ERP - SEED DATA & ROLE PRIVILEGES
-- Strictly conforms to public tables created in supabase/schema.sql
-- ====================================================================================

-- 1. GRANT SCHEMA & TABLE PRIVILEGES TO SUPABASE CLIENT ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. PUBLIC READ POLICIES FOR INITIAL ONBOARDING
DROP POLICY IF EXISTS tenants_select_all ON public.tenants;
CREATE POLICY tenants_select_all ON public.tenants FOR SELECT USING (true);

DROP POLICY IF EXISTS tenant_features_select_all ON public.tenant_features;
CREATE POLICY tenant_features_select_all ON public.tenant_features FOR SELECT USING (true);

DROP POLICY IF EXISTS tenant_labels_select_all ON public.tenant_labels;
CREATE POLICY tenant_labels_select_all ON public.tenant_labels FOR SELECT USING (true);

DROP POLICY IF EXISTS tenant_settings_select_all ON public.tenant_settings;
CREATE POLICY tenant_settings_select_all ON public.tenant_settings FOR SELECT USING (true);

-- 3. SEED INITIAL TENANTS
INSERT INTO public.tenants (id, name, slug, tenant_type, status, phone, email, city, state)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Delhi International Public School', 'dips', 'school', 'active', '+91 11 2788 1234', 'info@dips.edu.in', 'New Delhi', 'Delhi'),
    ('a0000000-0000-0000-0000-000000000002', 'Apex JEE & NEET Coaching Academy', 'apex-coaching', 'coaching', 'active', '+91 744 242 5566', 'contact@apexacademy.in', 'Kota', 'Rajasthan')
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 4. SEED ACADEMIC SESSIONS
INSERT INTO public.academic_years (id, tenant_id, name, start_date, end_date, status)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Academic Session 2026-27', '2026-04-01', '2027-03-31', 'active'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Session 2026-27 (JEE Target)', '2026-04-01', '2027-03-31', 'active')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 5. SEED SCHOOL CLASSES
INSERT INTO public.classes (id, tenant_id, academic_year_id, name, code, display_order, status)
VALUES 
    ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Class 9', 'CLS-9', 9, 'active'),
    ('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Class 10', 'CLS-10', 10, 'active'),
    ('d0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Class 11 Science', 'CLS-11-SCI', 11, 'active'),
    ('d0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Class 12 Science', 'CLS-12-SCI', 12, 'active')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED SECTIONS
INSERT INTO public.sections (id, tenant_id, class_id, name, code, capacity, status)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 'Section A', '10-A', 40, 'active'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 'Section B', '10-B', 40, 'active')
ON CONFLICT (id) DO NOTHING;

-- 7. SEED COACHING COURSES
INSERT INTO public.courses (id, tenant_id, name, code, description, duration, status)
VALUES 
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'IIT-JEE Super-30 Advanced Intensive', 'JEE-ADV-2YR', 'Two-year rigorous foundation program for IIT-JEE aspirants', '2 Years', 'active'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'NEET Pinnacle Medical Batch', 'NEET-PINN-2YR', 'Two-year specialized prep program for medical aspirants', '2 Years', 'active')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- 8. SEED COACHING BATCHES
INSERT INTO public.batches (id, tenant_id, course_id, name, code, start_date, end_date, capacity, status)
VALUES 
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Morning Elite Batch A', 'JEE-M-01', '2026-04-01', '2028-03-31', 30, 'active'),
    ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Medical Achievers Batch 1', 'NEET-M-01', '2026-04-01', '2028-03-31', 35, 'active')
ON CONFLICT (tenant_id, code) DO NOTHING;
