-- ====================================================================================
-- School + Coaching Centre ERP SaaS - Row Level Security (RLS) & Policies (v1.0)
-- Conforms strictly to 08-RLS-SECURITY-POLICIES.md
-- Enforces Zero-Trust, Defense-in-Depth, Tenant Boundary & Parent-Child Data Isolation
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- 1. SECURITY HELPER FUNCTIONS (SECURITY DEFINER with locked search_path)
-- ------------------------------------------------------------------------------------

-- Function 1: Check active tenant membership
CREATE OR REPLACE FUNCTION public.has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Super Admin has platform-wide access
    IF EXISTS (
        SELECT 1 FROM public.memberships m
        JOIN public.roles r ON m.role_id = r.id
        WHERE m.user_id = auth.uid()
        AND r.key = 'super_admin'
        AND m.status = 'active'
    ) THEN
        RETURN TRUE;
    END IF;

    -- Active tenant membership check
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid()
        AND tenant_id = check_tenant_id
        AND status = 'active'
    );
END;
$$;

-- Function 2: Check granular permission within tenant
CREATE OR REPLACE FUNCTION public.has_permission(check_tenant_id UUID, required_permission VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Super Admin bypass
    IF EXISTS (
        SELECT 1 FROM public.memberships m
        JOIN public.roles r ON m.role_id = r.id
        WHERE m.user_id = auth.uid()
        AND r.key = 'super_admin'
        AND m.status = 'active'
    ) THEN
        RETURN TRUE;
    END IF;

    -- Granular role permission lookup
    RETURN EXISTS (
        SELECT 1 FROM public.memberships m
        JOIN public.roles r ON m.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE m.user_id = auth.uid()
        AND m.tenant_id = check_tenant_id
        AND m.status = 'active'
        AND p.key = required_permission
    );
END;
$$;

-- Function 3: Verify parent relationship to student
CREATE OR REPLACE FUNCTION public.is_parent_of_student(check_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.parents p
        JOIN public.parent_students ps ON p.id = ps.parent_id
        WHERE p.user_id = auth.uid()
        AND ps.student_id = check_student_id
        AND p.status = 'active'
    );
END;
$$;

-- Function 4: Verify student own identity
CREATE OR REPLACE FUNCTION public.is_own_student_record(check_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.students
        WHERE id = check_student_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
END;
$$;

-- ------------------------------------------------------------------------------------
-- 2. ENABLE RLS ON ALL TENANT-OWNED TABLES
-- ------------------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------------
-- 3. GRANULAR ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------------

-- PROFILES (Users can read/update own profile)
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid());

-- MEMBERSHIPS (Users can view their active tenant memberships)
CREATE POLICY memberships_select ON public.memberships FOR SELECT 
    USING (user_id = auth.uid() OR public.has_permission(tenant_id, 'users.manage'));

-- STUDENTS
CREATE POLICY students_select_tenant ON public.students FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            public.has_permission(tenant_id, 'students.view') OR
            public.is_parent_of_student(id) OR
            user_id = auth.uid()
        )
    );

CREATE POLICY students_insert_permission ON public.students FOR INSERT 
    WITH CHECK (public.has_permission(tenant_id, 'students.create'));

CREATE POLICY students_update_permission ON public.students FOR UPDATE 
    USING (public.has_permission(tenant_id, 'students.update'));

CREATE POLICY students_delete_permission ON public.students FOR DELETE 
    USING (public.has_permission(tenant_id, 'students.delete'));

-- PARENTS & PARENT-STUDENTS
CREATE POLICY parents_select ON public.parents FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            user_id = auth.uid() OR
            public.has_permission(tenant_id, 'students.view')
        )
    );

CREATE POLICY parent_students_select ON public.parent_students FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            EXISTS (SELECT 1 FROM public.parents p WHERE p.id = parent_id AND p.user_id = auth.uid()) OR
            public.has_permission(tenant_id, 'students.view')
        )
    );

-- ATTENDANCE RECORDS
CREATE POLICY attendance_select ON public.attendance_records FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            public.has_permission(tenant_id, 'attendance.view') OR
            public.is_parent_of_student(student_id) OR
            public.is_own_student_record(student_id)
        )
    );

CREATE POLICY attendance_insert ON public.attendance_records FOR INSERT 
    WITH CHECK (public.has_permission(tenant_id, 'attendance.mark'));

CREATE POLICY attendance_update ON public.attendance_records FOR UPDATE 
    USING (public.has_permission(tenant_id, 'attendance.mark'));

-- FEES & PAYMENTS
CREATE POLICY fee_assignments_select ON public.fee_assignments FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            public.has_permission(tenant_id, 'fees.view') OR
            public.is_parent_of_student(student_id) OR
            public.is_own_student_record(student_id)
        )
    );

CREATE POLICY payments_select ON public.payments FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            public.has_permission(tenant_id, 'payments.view') OR
            public.is_parent_of_student(student_id) OR
            public.is_own_student_record(student_id)
        )
    );

CREATE POLICY payments_insert ON public.payments FOR INSERT 
    WITH CHECK (public.has_permission(tenant_id, 'payments.record'));

CREATE POLICY refunds_insert ON public.refunds FOR INSERT 
    WITH CHECK (public.has_permission(tenant_id, 'payments.refund'));

-- EXAMS, TESTS & RESULTS
CREATE POLICY results_select ON public.results FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            public.has_permission(tenant_id, 'results.view') OR
            (status = 'published' AND (public.is_parent_of_student(student_id) OR public.is_own_student_record(student_id)))
        )
    );

CREATE POLICY results_update ON public.results FOR UPDATE 
    USING (public.has_permission(tenant_id, 'results.create'));

CREATE POLICY test_results_select ON public.test_results FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            public.has_permission(tenant_id, 'results.view') OR
            public.is_parent_of_student(student_id) OR
            public.is_own_student_record(student_id)
        )
    );

-- HOMEWORK & SUBMISSIONS
CREATE POLICY homework_select ON public.homework FOR SELECT 
    USING (public.has_tenant_access(tenant_id));

CREATE POLICY homework_submissions_select ON public.homework_submissions FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            public.has_permission(tenant_id, 'homework.view') OR
            public.is_parent_of_student(student_id) OR
            public.is_own_student_record(student_id)
        )
    );

-- TIMETABLE & ANNOUNCEMENTS
CREATE POLICY timetable_select ON public.timetable_entries FOR SELECT 
    USING (public.has_tenant_access(tenant_id));

CREATE POLICY announcements_select ON public.announcements FOR SELECT 
    USING (public.has_tenant_access(tenant_id) AND status = 'published');

-- NOTIFICATIONS (Strict single-user isolation)
CREATE POLICY notifications_select ON public.notifications FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY notifications_update ON public.notifications FOR UPDATE 
    USING (user_id = auth.uid());

-- DOCUMENTS (Strict privacy)
CREATE POLICY documents_select ON public.documents FOR SELECT 
    USING (
        public.has_tenant_access(tenant_id) AND (
            uploaded_by = auth.uid() OR
            public.has_permission(tenant_id, 'documents.view')
        )
    );

-- AUDIT LOGS (Append-only security)
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT 
    USING (public.has_permission(tenant_id, 'audit.view'));

CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);
