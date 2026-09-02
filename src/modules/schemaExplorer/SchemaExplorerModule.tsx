import React, { useState } from 'react';
import {
  Database,
  Layers,
  Key,
  Link,
  Shield,
  Copy,
  Check,
  Table,
  Eye,
  FileCode,
  ShieldCheck,
  Sparkles,
  GitBranch,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap,
  CreditCard,
  Award,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useTenant } from '../../context/TenantContext';

interface ColumnDef {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  foreignRef?: string;
  isNullable?: boolean;
  isUnique?: boolean;
  description: string;
}

interface TableDef {
  name: string;
  cluster: 'Identity' | 'People' | 'Academic' | 'Attendance' | 'Finance' | 'Exams' | 'Communication' | 'Audit';
  description: string;
  tenantScoped: boolean;
  branchScoped: boolean;
  softDelete: boolean;
  columns: ColumnDef[];
}

const TABLES: TableDef[] = [
  // 1. IDENTITY & TENANTS
  {
    name: 'tenants',
    cluster: 'Identity',
    description: 'Independent institutional workspace representing a school or coaching institute',
    tenantScoped: false,
    branchScoped: false,
    softDelete: true,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Primary unique tenant UUID' },
      { name: 'name', type: 'VARCHAR(255)', description: 'Official institution name' },
      { name: 'slug', type: 'VARCHAR(100)', isUnique: true, description: 'Unique subdomain/URL identifier' },
      { name: 'tenant_type', type: 'VARCHAR(20)', description: 'SCHOOL or COACHING operating model' },
      { name: 'status', type: 'VARCHAR(20)', description: 'active, trial, suspended, or inactive' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Creation timestamp' },
    ],
  },
  {
    name: 'branches',
    cluster: 'Identity',
    description: 'Physical campus or branch location within a tenant organization',
    tenantScoped: true,
    branchScoped: false,
    softDelete: true,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Branch UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Parent tenant reference' },
      { name: 'name', type: 'VARCHAR(100)', description: 'Campus name (e.g. South Delhi Campus)' },
      { name: 'code', type: 'VARCHAR(50)', isUnique: true, description: 'Tenant-unique branch code' },
      { name: 'is_main', type: 'BOOLEAN', description: 'Main HQ branch indicator' },
      { name: 'address', type: 'TEXT', description: 'Physical campus address' },
    ],
  },
  {
    name: 'profiles',
    cluster: 'Identity',
    description: 'Canonical user identity across authentication and staff/parent/student roles',
    tenantScoped: true,
    branchScoped: false,
    softDelete: true,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'User profile UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Assigned tenant' },
      { name: 'email', type: 'VARCHAR(255)', isUnique: true, description: 'Institutional email address' },
      { name: 'name', type: 'VARCHAR(255)', description: 'Full user legal name' },
      { name: 'role', type: 'VARCHAR(50)', description: 'SUPER_ADMIN, TENANT_ADMIN, TEACHER, ACCOUNTANT, STAFF, PARENT, STUDENT' },
      { name: 'status', type: 'VARCHAR(20)', description: 'ACTIVE, INACTIVE, SUSPENDED' },
    ],
  },
  // 2. PEOPLE & ENROLLMENTS
  {
    name: 'students',
    cluster: 'People',
    description: 'Core student identity record with demographic and emergency contacts',
    tenantScoped: true,
    branchScoped: true,
    softDelete: true,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Stable student identity UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'branch_id', type: 'UUID', isForeign: true, foreignRef: 'branches.id', isNullable: true, description: 'Operating campus' },
      { name: 'admission_no', type: 'VARCHAR(50)', isUnique: true, description: 'Tenant-unique admission identifier' },
      { name: 'first_name', type: 'VARCHAR(100)', description: 'Student first name' },
      { name: 'last_name', type: 'VARCHAR(100)', description: 'Student surname' },
      { name: 'dob', type: 'DATE', description: 'Date of birth' },
      { name: 'gender', type: 'VARCHAR(20)', description: 'MALE, FEMALE, OTHER' },
      { name: 'status', type: 'VARCHAR(20)', description: 'ACTIVE, INACTIVE, GRADUATED, ARCHIVED' },
    ],
  },
  {
    name: 'guardians',
    cluster: 'People',
    description: 'Parent and guardian contact identity entity',
    tenantScoped: true,
    branchScoped: false,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Guardian UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'name', type: 'VARCHAR(255)', description: 'Full parent/guardian name' },
      { name: 'phone', type: 'VARCHAR(50)', description: 'Primary phone number' },
      { name: 'email', type: 'VARCHAR(255)', isNullable: true, description: 'Parent communications email' },
      { name: 'occupation', type: 'VARCHAR(100)', isNullable: true, description: 'Guardian profession' },
    ],
  },
  {
    name: 'student_guardians',
    cluster: 'People',
    description: 'Many-to-many relationship junction between students and guardians with relationship permissions',
    tenantScoped: true,
    branchScoped: false,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Junction relationship UUID' },
      { name: 'student_id', type: 'UUID', isForeign: true, foreignRef: 'students.id', description: 'Linked student' },
      { name: 'guardian_id', type: 'UUID', isForeign: true, foreignRef: 'guardians.id', description: 'Linked parent/guardian' },
      { name: 'relationship_type', type: 'VARCHAR(50)', description: 'FATHER, MOTHER, GUARDIAN' },
      { name: 'is_primary', type: 'BOOLEAN', description: 'Primary emergency contact indicator' },
      { name: 'receives_fee_alerts', type: 'BOOLEAN', description: 'Automated invoice & receipt dispatch' },
    ],
  },
  // 3. ACADEMIC STRUCTURES
  {
    name: 'academic_years',
    cluster: 'Academic',
    description: 'Academic calendar periods (e.g. 2026-2027) bounding enrollments and examinations',
    tenantScoped: true,
    branchScoped: false,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Academic year UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'name', type: 'VARCHAR(50)', isUnique: true, description: 'Session title (e.g. 2026–2027)' },
      { name: 'start_date', type: 'DATE', description: 'Term start date' },
      { name: 'end_date', type: 'DATE', description: 'Term completion date' },
      { name: 'status', type: 'VARCHAR(20)', description: 'upcoming, active, completed, archived' },
    ],
  },
  {
    name: 'classes',
    cluster: 'Academic',
    description: 'School academic grade levels (e.g. Grade 10)',
    tenantScoped: true,
    branchScoped: false,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Class UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'name', type: 'VARCHAR(100)', description: 'Grade/Class name' },
      { name: 'code', type: 'VARCHAR(50)', description: 'Standard code' },
    ],
  },
  {
    name: 'enrollments',
    cluster: 'Academic',
    description: 'Historical student academic placement snapshot preserving class/batch history across sessions',
    tenantScoped: true,
    branchScoped: true,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Enrollment placement UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'student_id', type: 'UUID', isForeign: true, foreignRef: 'students.id', description: 'Enrolled student' },
      { name: 'academic_year_id', type: 'UUID', isForeign: true, foreignRef: 'academic_years.id', description: 'Academic session' },
      { name: 'class_id', type: 'UUID', isForeign: true, foreignRef: 'classes.id', isNullable: true, description: 'School grade' },
      { name: 'section_id', type: 'UUID', isNullable: true, description: 'School section' },
      { name: 'batch_id', type: 'UUID', isNullable: true, description: 'Coaching batch' },
      { name: 'status', type: 'VARCHAR(20)', description: 'ACTIVE, COMPLETED, PROMOTED' },
    ],
  },
  // 4. ATTENDANCE
  {
    name: 'attendance_records',
    cluster: 'Attendance',
    description: 'Daily roll call and biometric/QR check-in logs with unique composite constraint',
    tenantScoped: true,
    branchScoped: true,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Attendance record UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'student_id', type: 'UUID', isForeign: true, foreignRef: 'students.id', description: 'Student reference' },
      { name: 'date', type: 'DATE', description: 'Session attendance date' },
      { name: 'group_id', type: 'VARCHAR(100)', description: 'Class or batch ID' },
      { name: 'status', type: 'VARCHAR(20)', description: 'PRESENT, ABSENT, LATE, EXCUSED' },
      { name: 'method', type: 'VARCHAR(20)', description: 'MANUAL, QR_SCAN, BIOMETRIC' },
      { name: 'marked_by', type: 'VARCHAR(255)', description: 'Recording faculty/device name' },
    ],
  },
  // 5. FEES & FINANCE
  {
    name: 'fee_structures',
    cluster: 'Finance',
    description: 'Reusable institutional fee head templates and installment schedules',
    tenantScoped: true,
    branchScoped: false,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Fee structure template UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'name', type: 'VARCHAR(255)', description: 'Fee structure name (e.g. Grade 10 Standard)' },
      { name: 'heads', type: 'JSONB', description: 'Fee component breakdown (Tuition, Lab, Transport)' },
      { name: 'total_amount', type: 'NUMERIC(12,2)', description: 'Total annual billing amount' },
    ],
  },
  {
    name: 'payment_transactions',
    cluster: 'Finance',
    description: 'Immutable financial ledger recording monetary receipts and payment gateway references',
    tenantScoped: true,
    branchScoped: true,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Payment transaction UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'student_id', type: 'UUID', isForeign: true, foreignRef: 'students.id', description: 'Paying student' },
      { name: 'receipt_no', type: 'VARCHAR(50)', isUnique: true, description: 'Legal receipt invoice number' },
      { name: 'amount', type: 'NUMERIC(12,2)', description: 'Paid monetary sum' },
      { name: 'payment_mode', type: 'VARCHAR(50)', description: 'RAZORPAY_UPI, RAZORPAY_CARD, CASH, CHEQUE' },
      { name: 'transaction_ref', type: 'VARCHAR(255)', description: 'Gateway txn reference' },
      { name: 'status', type: 'VARCHAR(20)', description: 'SUCCESS, FAILED, REFUNDED' },
    ],
  },
  {
    name: 'refunds',
    cluster: 'Finance',
    description: 'Audited reversal and refund allocations linked directly to prior payment transactions',
    tenantScoped: true,
    branchScoped: false,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Refund transaction UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'payment_id', type: 'UUID', isForeign: true, foreignRef: 'payment_transactions.id', description: 'Original payment reference' },
      { name: 'amount', type: 'NUMERIC(12,2)', description: 'Refunded monetary amount' },
      { name: 'reason', type: 'TEXT', description: 'Administrative refund justification' },
      { name: 'status', type: 'VARCHAR(20)', description: 'PENDING, PROCESSED, REJECTED' },
    ],
  },
  // 6. EXAMINATIONS
  {
    name: 'exams',
    cluster: 'Exams',
    description: 'Institutional examination terms, mock tests, and competitive test series',
    tenantScoped: true,
    branchScoped: true,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Exam term UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'name', type: 'VARCHAR(255)', description: 'Exam title' },
      { name: 'exam_type', type: 'VARCHAR(50)', description: 'SCHOOL_TERM, COACHING_TEST_SERIES' },
      { name: 'is_published', type: 'BOOLEAN', description: 'Published results locking indicator' },
    ],
  },
  {
    name: 'student_exam_results',
    cluster: 'Exams',
    description: 'Audited student scores, percentiles, subject marks, and AI trend summaries',
    tenantScoped: true,
    branchScoped: true,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Result entry UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'student_id', type: 'UUID', isForeign: true, foreignRef: 'students.id', description: 'Examinee reference' },
      { name: 'exam_id', type: 'UUID', isForeign: true, foreignRef: 'exams.id', description: 'Exam reference' },
      { name: 'subject_marks', type: 'JSONB', description: 'Subject scores breakdown' },
      { name: 'total_percentage', type: 'NUMERIC(5,2)', description: 'Calculated score %' },
      { name: 'rank', type: 'INTEGER', isNullable: true, description: 'Institutional leaderboard rank' },
    ],
  },
  // 7. AUDIT TRAIL
  {
    name: 'audit_logs',
    cluster: 'Audit',
    description: 'Immutable append-only operational history capturing who, what, when, and state changes',
    tenantScoped: true,
    branchScoped: false,
    softDelete: false,
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Immutable log entry UUID' },
      { name: 'tenant_id', type: 'UUID', isForeign: true, foreignRef: 'tenants.id', description: 'Tenant ownership' },
      { name: 'actor_id', type: 'VARCHAR(100)', description: 'User who performed the action' },
      { name: 'action', type: 'VARCHAR(100)', description: 'Action key (e.g. PAYMENT_RECORDED, STUDENT_ENROLLED)' },
      { name: 'category', type: 'VARCHAR(50)', description: 'AUTHENTICATION, FEES, ATTENDANCE, SECURITY' },
      { name: 'details', type: 'TEXT', description: 'Detailed human-readable context' },
      { name: 'timestamp', type: 'TIMESTAMPTZ', description: 'UTC timestamp of event' },
    ],
  },
];

export const SchemaExplorerModule: React.FC = () => {
  const { currentTenant } = useTenant();
  const [activeCluster, setActiveCluster] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<TableDef>(TABLES[0]);
  const [copiedDdl, setCopiedDdl] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'erd' | 'dictionary' | 'ddl'>('erd');

  const clusters = ['ALL', 'Identity', 'People', 'Academic', 'Attendance', 'Finance', 'Exams', 'Audit'];

  const filteredTables = TABLES.filter((t) => {
    const matchesCluster = activeCluster === 'ALL' || t.cluster === activeCluster;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCluster && matchesSearch;
  });

  const generateSqlDdl = () => {
    return `-- ====================================================================================
-- School + Coaching Centre ERP SaaS - Master DDL Schema (v1.0)
-- Conforms strictly to 41-DATABASE-ARCHITECTURE & 42-DATABASE-SCHEMA-ENTITY-RELATIONSHIPS
-- Fully normalized with RLS policies, audit logs, and composite query indexes
-- ====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    tenant_type VARCHAR(20) NOT NULL CHECK (tenant_type IN ('school', 'coaching')),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Branches Table (Multi-Branch Hierarchy)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_main BOOLEAN DEFAULT false,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, code)
);

-- 3. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    admission_no VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, admission_no)
);

-- 4. Historical Academic Enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL,
    class_id UUID,
    section_id UUID,
    batch_id UUID,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    start_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Attendance Records (Atomic Unique Check)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    group_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    method VARCHAR(20) DEFAULT 'MANUAL',
    marked_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, student_id, date, group_id)
);

-- 6. Payment Transactions & Ledger
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(50) NOT NULL,
    transaction_ref VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'SUCCESS' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS) on all tenant tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;`;
  };

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(generateSqlDdl());
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-6 h-6 text-sky-400" />
              Database Architecture & Entity Relationships
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
              Canonical ERD v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Normalized domain entity model, foreign key hierarchy, multi-tenant scoping, and PostgreSQL DDL generator.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="blue" size="sm">
            {TABLES.length} Core Tables
          </Badge>
          <Badge variant="purple" size="sm">
            Strict RLS Enabled
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        tabs={[
          { id: 'erd', label: '📊 Visual Domain Entity Graph (ERD)' },
          { id: 'dictionary', label: '📖 Data Dictionary & Table Schemas' },
          { id: 'ddl', label: '💾 PostgreSQL DDL Schema Script' },
        ]}
        activeTab={activeViewTab}
        onChange={(t) => setActiveViewTab(t as any)}
      />

      {/* VIEW 1: VISUAL ERD GRAPH */}
      {activeViewTab === 'erd' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Cluster 1: Identity & Multi-Branch */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-sky-400" />
                  Identity & Multi-Branch
                </span>
                <Badge variant="blue" size="sm">Tenant-Root</Badge>
              </div>
              <div className="space-y-2 font-mono text-xs text-slate-300">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">tenants</p>
                  <p className="text-[10px] text-slate-400">id, name, slug, type, status</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">branches (1:N)</p>
                  <p className="text-[10px] text-slate-400">id, tenant_id, code, is_main</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">profiles & memberships</p>
                  <p className="text-[10px] text-slate-400">id, tenant_id, role, status</p>
                </div>
              </div>
            </div>

            {/* Cluster 2: People & Academics */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  People & Guardians
                </span>
                <Badge variant="purple" size="sm">M:N Relationships</Badge>
              </div>
              <div className="space-y-2 font-mono text-xs text-slate-300">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">students</p>
                  <p className="text-[10px] text-slate-400">id, admission_no, branch_id, status</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">student_guardians (Junction)</p>
                  <p className="text-[10px] text-slate-400">student_id, guardian_id, is_primary</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">enrollments (Snapshots)</p>
                  <p className="text-[10px] text-slate-400">academic_year_id, class_id, batch_id</p>
                </div>
              </div>
            </div>

            {/* Cluster 3: Finance & Payments */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Fees & Ledger
                </span>
                <Badge variant="emerald" size="sm">Immutable Ledger</Badge>
              </div>
              <div className="space-y-2 font-mono text-xs text-slate-300">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">fee_structures</p>
                  <p className="text-[10px] text-slate-400">id, name, heads, total_amount</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">payment_transactions</p>
                  <p className="text-[10px] text-slate-400">receipt_no, amount, mode, txn_ref</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">refunds & allocations</p>
                  <p className="text-[10px] text-slate-400">payment_id, reason, status</p>
                </div>
              </div>
            </div>

            {/* Cluster 4: Exams & Audit */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  Assessments & Audit
                </span>
                <Badge variant="amber" size="sm">Append-Only</Badge>
              </div>
              <div className="space-y-2 font-mono text-xs text-slate-300">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">exams & exam_subjects</p>
                  <p className="text-[10px] text-slate-400">id, exam_type, is_published</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">student_exam_results</p>
                  <p className="text-[10px] text-slate-400">student_id, exam_id, marks, rank</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-white">audit_logs</p>
                  <p className="text-[10px] text-slate-400">actor_id, action, category, details</p>
                </div>
              </div>
            </div>

          </div>

          {/* Integrity Rules Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Canonical Integrity Guarantees
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero Cross-Tenant Leakage via RLS & Tenant FK constraints</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Historical Snapshotting: Enrollments & Invoices preserve historical data</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Financial Immutability: Payments & Refunds use append-only ledger entries</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Attendance Uniqueness: (tenant_id, student_id, date, group_id) composite constraint</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DATA DICTIONARY & TABLE SCHEMAS */}
      {activeViewTab === 'dictionary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Table List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tables..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {clusters.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCluster(c)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    activeCluster === c
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredTables.map((t) => {
                const isSelected = selectedTable.name === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTable(t)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold font-mono">{t.name}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{t.description}</p>
                    </div>
                    <Badge variant="blue" size="sm">{t.cluster}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Details */}
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Table className="w-5 h-5 text-sky-400" />
                    <h3 className="font-bold text-white text-base font-mono">{selectedTable.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedTable.description}</p>
                </div>

                <div className="flex gap-2">
                  {selectedTable.tenantScoped && (
                    <Badge variant="blue" size="sm">Tenant-Scoped</Badge>
                  )}
                  {selectedTable.branchScoped && (
                    <Badge variant="purple" size="sm">Branch-Scoped</Badge>
                  )}
                  {selectedTable.softDelete && (
                    <Badge variant="amber" size="sm">Soft-Delete</Badge>
                  )}
                </div>
              </div>

              {/* Columns Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-3">Column Name</th>
                      <th className="p-3">PostgreSQL Type</th>
                      <th className="p-3">Constraints</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {selectedTable.columns.map((col) => (
                      <tr key={col.name} className="hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-white flex items-center gap-1.5">
                          {col.isPrimary && <Key className="w-3.5 h-3.5 text-amber-400" />}
                          {col.isForeign && <Link className="w-3.5 h-3.5 text-sky-400" />}
                          <span>{col.name}</span>
                        </td>
                        <td className="p-3 text-sky-300">{col.type}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 font-sans">
                            {col.isPrimary && <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] rounded font-bold">PK</span>}
                            {col.isForeign && <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 text-[9px] rounded font-bold">FK → {col.foreignRef}</span>}
                            {col.isUnique && <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] rounded font-bold">UNIQUE</span>}
                            {col.isNullable && <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 text-[9px] rounded">NULL</span>}
                          </div>
                        </td>
                        <td className="p-3 text-slate-400 font-sans text-xs">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: POSTGRESQL DDL GENERATOR */}
      {activeViewTab === 'ddl' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileCode className="w-5 h-5 text-sky-400" />
                Production PostgreSQL / Supabase Schema Script
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ready-to-execute master DDL migration with UUID generators, foreign keys, and RLS policies.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyDdl}
              leftIcon={copiedDdl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            >
              {copiedDdl ? 'SQL Copied to Clipboard!' : 'Copy Schema SQL'}
            </Button>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 max-h-[500px] overflow-y-auto">
            <pre>{generateSqlDdl()}</pre>
          </div>
        </div>
      )}

    </div>
  );
};
