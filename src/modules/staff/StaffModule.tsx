import React, { useState } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  Building,
  GraduationCap,
  Calendar,
  Clock,
  Award,
  BookOpen,
  FileText,
  Upload,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Shield,
  Briefcase,
  DollarSign,
  MessageSquare,
  Sparkles,
  UserPlus,
  Printer,
  ArrowDownRight,
  Check,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  Staff,
  TeacherAssignment,
  DocumentMeta,
  UserRole,
  AcademicClass,
  CoachingBatch,
  SalaryStructure,
  PayrollRun,
  Payslip,
  SalaryAdvance,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const StaffModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { currentUser } = useAuth();

  // Primary State
  const [activeSubTab, setActiveSubTab] = useState<
    'teachers' | 'admin_staff' | 'assignments' | 'salary_structures' | 'payroll_runs' | 'payslips'
  >('teachers');
  const [staffList, setStaffList] = useState<Staff[]>(() => storage.getStaff(currentTenant.id));
  const [assignments, setAssignments] = useState<TeacherAssignment[]>(() => storage.getTeacherAssignments(currentTenant.id));
  const [documents, setDocuments] = useState<DocumentMeta[]>(() => storage.getDocuments());
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(() => storage.getSalaryStructures(currentTenant.id));
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(() => storage.getPayrollRuns(currentTenant.id));
  const [payslips, setPayslips] = useState<Payslip[]>(() => storage.getPayslips(currentTenant.id));
  const [advances, setAdvances] = useState<SalaryAdvance[]>(() => storage.getSalaryAdvances(currentTenant.id));
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Drawer / Workspace State
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'employment' | 'assignments' | 'attendance' | 'documents' | 'timeline'>('overview');

  // Modals
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isAddStructureModalOpen, setIsAddStructureModalOpen] = useState(false);
  const [isAddAdvanceModalOpen, setIsAddAdvanceModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Aux entities
  const classes = storage.getClasses(currentTenant.id);
  const batches = storage.getBatches(currentTenant.id);

  // Form State for Add Staff
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({
    name: '',
    employeeCode: '',
    email: '',
    phone: '',
    designation: 'Faculty Member',
    department: 'Academics',
    role: 'TEACHER',
    qualification: 'M.Sc., B.Ed.',
    joiningDate: '2024-04-01',
    salary: 65000,
    status: 'ACTIVE',
    subjects: ['Physics'],
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  });
  const [createLoginAccount, setCreateLoginAccount] = useState(true);

  // Form State for Teacher Assignment
  const [assignmentForm, setAssignmentForm] = useState<Partial<TeacherAssignment>>({
    teacherId: '',
    subjectId: 'Physics',
    classId: classes[0]?.id || '',
    batchId: batches[0]?.id || '',
    isClassTeacher: false,
    academicYearId: currentTenant.academicYear,
  });

  // Duplicate Staff Check
  const duplicateStaff = staffList.find((s) => {
    if (!staffForm.name) return false;
    const sameName = s.name.toLowerCase() === (staffForm.name || '').toLowerCase();
    const sameCode = staffForm.employeeCode && s.employeeCode.toLowerCase() === staffForm.employeeCode.toLowerCase();
    const sameEmail = staffForm.email && s.email.toLowerCase() === staffForm.email.toLowerCase();
    return sameName || sameCode || sameEmail;
  });

  // Handle Add Staff
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email || !staffForm.phone) return;

    const newId = `staff-${Date.now()}`;
    const code =
      staffForm.employeeCode ||
      (isSchool ? `EMP-DIPS-${Math.floor(100 + Math.random() * 900)}` : `EMP-APX-${Math.floor(100 + Math.random() * 900)}`);

    const newStaff: Staff = {
      id: newId,
      tenantId: currentTenant.id,
      employeeCode: code,
      name: staffForm.name,
      email: staffForm.email,
      phone: staffForm.phone,
      avatarUrl:
        staffForm.avatarUrl ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: (staffForm.role as UserRole) || 'TEACHER',
      department: staffForm.department || 'Academics',
      designation: staffForm.designation || 'Faculty Member',
      qualification: staffForm.qualification || 'M.Sc.',
      joiningDate: staffForm.joiningDate || new Date().toISOString().split('T')[0],
      salary: Number(staffForm.salary) || 60000,
      status: 'ACTIVE',
      subjects: staffForm.subjects || ['General'],
      assignedGroupIds: [],
    };

    // Save Staff
    storage.saveStaffMember(newStaff);

    // Optionally create user profile login
    if (createLoginAccount) {
      storage.saveUser({
        id: `user-${newId}`,
        tenantId: currentTenant.id,
        email: staffForm.email,
        name: staffForm.name,
        phone: staffForm.phone,
        role: (staffForm.role as UserRole) || 'TEACHER',
        avatarUrl: newStaff.avatarUrl,
        designation: newStaff.designation,
        department: newStaff.department,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });
    }

    // Audit log
    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'STAFF_CREATED',
      category: 'USER_MANAGEMENT',
      entityType: 'STAFF',
      entityId: newId,
      details: `Created new staff member '${newStaff.name}' (${newStaff.employeeCode}) with designation '${newStaff.designation}'.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    setStaffList(storage.getStaff(currentTenant.id));
    setIsAddStaffModalOpen(false);
  };

  // Handle Add Assignment
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.teacherId || !assignmentForm.subjectId) return;

    const newAssignment: TeacherAssignment = {
      id: `ta-${Date.now()}`,
      tenantId: currentTenant.id,
      teacherId: assignmentForm.teacherId,
      subjectId: assignmentForm.subjectId,
      classId: isSchool ? assignmentForm.classId : undefined,
      batchId: isCoaching ? assignmentForm.batchId : undefined,
      academicYearId: currentTenant.academicYear,
      isClassTeacher: assignmentForm.isClassTeacher || false,
      createdAt: new Date().toISOString(),
    };

    storage.saveTeacherAssignment(newAssignment);
    setAssignments(storage.getTeacherAssignments(currentTenant.id));
    setIsAddAssignmentModalOpen(false);
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm(`Are you sure you want to remove this staff member from active roster?`)) {
      storage.deleteStaff(id);
      setStaffList(storage.getStaff(currentTenant.id));
      if (selectedStaff?.id === id) setSelectedStaff(null);
    }
  };

  const handleDeleteAssignment = (id: string) => {
    storage.deleteTeacherAssignment(id);
    setAssignments(storage.getTeacherAssignments(currentTenant.id));
  };

  // Filter teachers vs non-teachers
  const teachers = staffList.filter((s) => s.role === 'TEACHER');
  const adminStaff = staffList.filter((s) => s.role !== 'TEACHER');

  const filteredTeachers = teachers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subjects.some((sub) => sub.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = deptFilter === 'ALL' || s.department === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const filteredAdminStaff = adminStaff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || s.department === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-sky-400" />
              Staff & Faculty Management
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-400">
              Canonical Specification v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Teaching personnel, administrative employees, subject-batch academic assignments, and staff records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddAssignmentModalOpen(true)}
            leftIcon={<BookOpen className="w-3.5 h-3.5" />}
          >
            Assign Subject / Batch
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddStaffModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Employee
          </Button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <Tabs
        tabs={[
          { id: 'teachers', label: `👨‍🏫 Faculty (${teachers.length})` },
          { id: 'admin_staff', label: `🏢 Admin & Support (${adminStaff.length})` },
          { id: 'assignments', label: `📚 Academic Assignments (${assignments.length})` },
          { id: 'salary_structures', label: `💰 Salary Structures (${salaryStructures.length})` },
          { id: 'payroll_runs', label: `🗓️ Payroll Runs (${payrollRuns.length})` },
          { id: 'payslips', label: `📄 Payslips & Advances (${payslips.length})` },
        ]}
        activeTab={activeSubTab}
        onChange={(t) => setActiveSubTab(t as any)}
      />

      {/* SUB-TAB 1: FACULTY & TEACHING STAFF */}
      {activeSubTab === 'teachers' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teachers by name, employee code, designation, or subject..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="RESIGNED">Resigned</option>
              </select>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3.5">Faculty Name</th>
                    <th className="p-3.5">Employee ID</th>
                    <th className="p-3.5">Designation & Department</th>
                    <th className="p-3.5">Assigned Subjects</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTeachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={t.avatarUrl}
                            alt={t.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <p className="font-bold text-white text-xs">{t.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{t.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-sky-400 font-semibold">{t.employeeCode}</td>

                      <td className="p-3.5">
                        <p className="font-semibold text-white">{t.designation}</p>
                        <p className="text-[10px] text-slate-400">{t.department}</p>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {t.subjects.map((sub) => (
                            <span key={sub} className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] font-mono">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant={t.status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                          {t.status}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStaff(t);
                              setProfileTab('overview');
                            }}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Workspace
                          </Button>
                          <button
                            onClick={() => handleDeleteStaff(t.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ADMINISTRATIVE & SUPPORT STAFF */}
      {activeSubTab === 'admin_staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search administrative staff..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAdminStaff.map((s) => (
              <div key={s.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={s.avatarUrl} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                    <div>
                      <h4 className="font-bold text-white text-sm">{s.name}</h4>
                      <p className="text-[11px] text-sky-400 font-medium">{s.designation}</p>
                    </div>
                  </div>
                  <Badge variant={s.role === 'TENANT_ADMIN' ? 'purple' : 'blue'} size="sm">
                    {s.role}
                  </Badge>
                </div>

                <div className="space-y-1.5 font-mono text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Employee Code:</span>
                    <span className="text-sky-300 font-bold">{s.employeeCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="text-slate-200">{s.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="text-slate-200">{s.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Joined:</span>
                    <span className="text-slate-200">{s.joiningDate}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <Badge variant={s.status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                    {s.status}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStaff(s);
                      setProfileTab('overview');
                    }}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View Record
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ACADEMIC SUBJECT & BATCH ASSIGNMENTS */}
      {activeSubTab === 'assignments' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                Faculty Subject & Classroom Assignments
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active pedagogical assignments mapping educators to specific courses, grades, sections, and batches.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddAssignmentModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Assignment
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Assigned Faculty</th>
                  <th className="p-3">Subject / Discipline</th>
                  <th className="p-3">Class / Batch</th>
                  <th className="p-3">Academic Session</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {assignments.map((a) => {
                  const teacher = staffList.find((s) => s.id === a.teacherId);
                  const cls = classes.find((c) => c.id === a.classId);
                  const bat = batches.find((b) => b.id === a.batchId);

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                        {teacher?.avatarUrl && (
                          <img src={teacher.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                        )}
                        <span>{teacher?.name || a.teacherId}</span>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[10px]">
                          {a.subjectId}
                        </span>
                      </td>

                      <td className="p-3 text-slate-200">{cls?.name || bat?.name || 'Class 10-A'}</td>
                      <td className="p-3 text-slate-400">{a.academicYearId}</td>

                      <td className="p-3">
                        {a.isClassTeacher ? (
                          <Badge variant="purple" size="sm">CLASS TEACHER</Badge>
                        ) : (
                          <Badge variant="blue" size="sm">SUBJECT FACULTY</Badge>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SALARY STRUCTURES & COMPENSATION */}
      {activeSubTab === 'salary_structures' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Staff Compensation & Salary Structures</h3>
              <p className="text-xs text-slate-400">
                Configure base pay, HRA, Dearness Allowance, and statutory deductions (PF, ESI, TDS, PT).
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddStructureModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Add Salary Structure
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {salaryStructures.map((struct) => (
              <div key={struct.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm">{struct.name}</h4>
                    <p className="text-xs text-slate-400">{struct.description}</p>
                  </div>
                  <Badge variant="purple">Active Scale</Badge>
                </div>

                {/* Earnings & Deductions Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Monthly Earnings
                    </span>
                    <div className="flex justify-between text-slate-300">
                      <span>Basic Pay:</span>
                      <span className="font-mono font-bold text-white">₹{struct.basicSalary.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>HRA (40%):</span>
                      <span className="font-mono text-slate-200">₹{struct.hra.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Dearness Allowance (DA):</span>
                      <span className="font-mono text-slate-200">₹{struct.da.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Special & Travel:</span>
                      <span className="font-mono text-slate-200">
                        ₹{(struct.specialAllowance + struct.conveyanceAllowance).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                      Statutory Deductions
                    </span>
                    <div className="flex justify-between text-slate-300">
                      <span>Provident Fund (PF 12%):</span>
                      <span className="font-mono text-rose-300">-₹{struct.pfDeduction.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>TDS / Income Tax:</span>
                      <span className="font-mono text-rose-300">-₹{struct.tdsDeduction.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Professional Tax (PT):</span>
                      <span className="font-mono text-rose-300">-₹{struct.professionalTax}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Net Calculated Pay:</span>
                  <span className="font-mono font-black text-lg text-emerald-400">
                    ₹{struct.netCalculated.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: MONTHLY PAYROLL RUNS */}
      {activeSubTab === 'payroll_runs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Monthly Payroll Processing Engine</h3>
              <p className="text-xs text-slate-400">
                Execute monthly institutional payroll runs with attendance LOP adjustments and bank disbursements.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                const newRun: PayrollRun = {
                  id: `pr-${Date.now()}`,
                  tenantId: currentTenant.id,
                  month: 'September 2026',
                  year: 2026,
                  totalEmployees: staffList.filter((s) => s.status === 'ACTIVE').length,
                  totalGross: 295000,
                  totalDeductions: 41500,
                  totalNetPayout: 253500,
                  status: 'CALCULATED',
                  calculatedAt: new Date().toISOString(),
                  payslipCount: staffList.filter((s) => s.status === 'ACTIVE').length,
                };
                storage.savePayrollRun(newRun);
                setPayrollRuns(storage.getPayrollRuns(currentTenant.id));
                showToast('September 2026 payroll calculated across active faculty and staff.');
              }}
              className="bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-950/20"
            >
              Run September 2026 Payroll
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Pay Period</th>
                    <th className="py-3 px-4 text-center">Employees</th>
                    <th className="py-3 px-4 text-center">Gross Earnings</th>
                    <th className="py-3 px-4 text-center">Total Deductions</th>
                    <th className="py-3 px-4 text-center">Net Bank Payout</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Payroll Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payrollRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white text-sm">{run.month}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{run.totalEmployees}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-emerald-400">
                        ₹{run.totalGross.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-rose-400">
                        ₹{run.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-white text-sm">
                        ₹{run.totalNetPayout.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            run.status === 'DISBURSED'
                              ? 'emerald'
                              : run.status === 'APPROVED'
                              ? 'blue'
                              : 'amber'
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {run.status === 'CALCULATED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                storage.approvePayrollRun(run.id, `${currentUser.name} (${currentUser.role})`);
                                setPayrollRuns(storage.getPayrollRuns(currentTenant.id));
                                showToast(`${run.month} payroll approved by Principal.`);
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-xs py-1"
                            >
                              Approve
                            </Button>
                          )}
                          {run.status === 'APPROVED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                storage.disbursePayrollRun(run.id);
                                setPayrollRuns(storage.getPayrollRuns(currentTenant.id));
                                setPayslips(storage.getPayslips(currentTenant.id));
                                showToast(`${run.month} salaries disbursed via institutional bank account.`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1"
                            >
                              Disburse Salaries
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: PAYSLIPS & ADVANCES */}
      {activeSubTab === 'payslips' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Generated Staff Payslips & Advance Register</h3>
              <p className="text-xs text-slate-400">
                Official employee monthly salary certificates, tax deductions, and advance loan adjustments.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<DollarSign className="w-3.5 h-3.5" />}
              onClick={() => setIsAddAdvanceModalOpen(true)}
            >
              Request Salary Advance
            </Button>
          </div>

          {/* Payslips Table */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Payslip Number</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Gross Pay</th>
                    <th className="py-3 px-4 text-center">Deductions</th>
                    <th className="py-3 px-4 text-center">Net Disbursed</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payslips.map((ps) => (
                    <tr key={ps.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{ps.payslipNo}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{ps.staffName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{ps.employeeCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-200 block">{ps.designation}</span>
                        <span className="text-[11px] text-slate-400">{ps.department}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-400">
                        ₹{ps.grossEarnings.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-rose-400">
                        -₹{ps.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-white text-sm">
                        ₹{ps.netSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={ps.status === 'PAID' ? 'emerald' : 'blue'}>{ps.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Printer className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedPayslip(ps)}
                          className="text-xs py-1"
                        >
                          View Payslip
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OFFICIAL PRINTABLE PAYSLIP PREVIEW (Section 35) */}
          {selectedPayslip && (
            <div className="print-container max-w-2xl mx-auto p-8 rounded-3xl bg-slate-900 border-2 border-slate-700 shadow-2xl space-y-6">
              <div className="flex items-start justify-between border-b-2 border-slate-700 pb-5">
                <div className="flex items-center gap-3">
                  <img src={currentTenant.logo} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-purple-500/30" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 font-mono">
                      Official Salary Certificate & Payslip
                    </span>
                    <h2 className="text-lg font-black text-white">{currentTenant.name}</h2>
                    <p className="text-[11px] text-slate-400">{currentTenant.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-white block">{selectedPayslip.payslipNo}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Status: {selectedPayslip.status}</span>
                </div>
              </div>

              {/* Employee & Bank Info */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Employee Name:</span>
                  <span className="font-bold text-white">{selectedPayslip.staffName} ({selectedPayslip.employeeCode})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Designation & Dept:</span>
                  <span className="font-medium text-slate-200">{selectedPayslip.designation} • {selectedPayslip.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Bank Account & IFSC:</span>
                  <span className="font-mono text-slate-200">{selectedPayslip.bankAccountNo} ({selectedPayslip.bankName})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Working Days / LOP:</span>
                  <span className="font-medium text-slate-200">
                    {selectedPayslip.presentDays} / {selectedPayslip.workingDays} Days (LOP: {selectedPayslip.lopDays}d)
                  </span>
                </div>
              </div>

              {/* Earnings vs Deductions Table */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-950 p-2.5 font-bold text-emerald-400 border-b border-slate-800">
                    Earnings (₹)
                  </div>
                  <div className="p-3 space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span>Basic Pay:</span>
                      <span className="font-mono font-bold text-white">₹{selectedPayslip.basicPay.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HRA:</span>
                      <span className="font-mono">₹{selectedPayslip.hra.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dearness Allowance (DA):</span>
                      <span className="font-mono">₹{selectedPayslip.da.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Special Allowance:</span>
                      <span className="font-mono">₹{selectedPayslip.specialAllowance.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-emerald-400">
                      <span>Gross Earnings:</span>
                      <span className="font-mono">₹{selectedPayslip.grossEarnings.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-950 p-2.5 font-bold text-rose-400 border-b border-slate-800">
                    Deductions (₹)
                  </div>
                  <div className="p-3 space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span>Provident Fund (PF):</span>
                      <span className="font-mono text-rose-300">-₹{selectedPayslip.pfDeduction.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TDS / Income Tax:</span>
                      <span className="font-mono text-rose-300">-₹{selectedPayslip.tdsDeduction.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Professional Tax (PT):</span>
                      <span className="font-mono text-rose-300">-₹{selectedPayslip.professionalTax}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loss of Pay (LOP):</span>
                      <span className="font-mono text-rose-300">-₹{selectedPayslip.lopDeduction}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-rose-400">
                      <span>Total Deductions:</span>
                      <span className="font-mono">-₹{selectedPayslip.totalDeductions.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Net Salary Disbursed</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    ₹{selectedPayslip.netSalary.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 italic">Direct NEFT to Bank Account</span>
              </div>

              {/* Signatures */}
              <div className="flex items-end justify-between pt-4 border-t border-slate-800 text-xs">
                <div className="text-center">
                  <div className="h-6 font-serif italic text-slate-400">R. Gupta</div>
                  <div className="border-t border-slate-600 pt-0.5 text-[10px] text-slate-400 font-bold">
                    Accounts Officer
                  </div>
                </div>

                <div className="text-center">
                  <div className="h-6 font-serif italic text-slate-400">Dr. S. Rao</div>
                  <div className="border-t border-slate-600 pt-0.5 text-[10px] text-slate-400 font-bold">
                    Principal / Director
                  </div>
                </div>

                <div className="no-print">
                  <Button variant="primary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                    Print Payslip
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      <Modal
        isOpen={isAddStaffModalOpen}
        onClose={() => setIsAddStaffModalOpen(false)}
        title="Add New Employee / Faculty"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          
          {/* Duplicate Detection Warning */}
          {duplicateStaff && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1 text-xs text-amber-200 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Possible Duplicate Employee Detected</span>
              </div>
              <p>
                An employee named <strong>{duplicateStaff.name}</strong> ({duplicateStaff.employeeCode}) with email {duplicateStaff.email} already exists.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Full Name *</label>
              <input
                type="text"
                required
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Employee Code (Optional)</label>
              <input
                type="text"
                value={staffForm.employeeCode}
                onChange={(e) => setStaffForm({ ...staffForm, employeeCode: e.target.value })}
                placeholder="Auto-generated if blank"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Official Email *</label>
              <input
                type="email"
                required
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Phone Number *</label>
              <input
                type="tel"
                required
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Designation (Job Title) *</label>
              <input
                type="text"
                required
                value={staffForm.designation}
                onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                placeholder="e.g. Senior Physics PGT"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Application Role (ERP Permissions) *</label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as UserRole })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              >
                <option value="TEACHER">TEACHER (Classroll, Grades, Homework)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (Fees, Payments, Ledgers)</option>
                <option value="BRANCH_MANAGER">BRANCH_MANAGER (Branch Operations)</option>
                <option value="RECEPTIONIST">RECEPTIONIST (Admissions, Front Desk)</option>
                <option value="STAFF">STAFF (Support Staff)</option>
                <option value="TENANT_ADMIN">TENANT_ADMIN (Full Administrator)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={createLoginAccount}
                onChange={(e) => setCreateLoginAccount(e.target.checked)}
                className="rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <span>Generate active login account and send invitation email</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Complete Staff Onboarding
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD ASSIGNMENT */}
      <Modal
        isOpen={isAddAssignmentModalOpen}
        onClose={() => setIsAddAssignmentModalOpen(false)}
        title="Assign Subject & Classroom Faculty"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Select Teacher / Faculty *</label>
            <select
              required
              value={assignmentForm.teacherId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              <option value="">-- Choose Educator --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Subject / Course Module *</label>
            <input
              type="text"
              required
              value={assignmentForm.subjectId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })}
              placeholder="e.g. Physics, Calculus, Organic Chemistry"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Target {getLabel('group')} *</label>
            <select
              value={isSchool ? assignmentForm.classId : assignmentForm.batchId}
              onChange={(e) =>
                isSchool
                  ? setAssignmentForm({ ...assignmentForm, classId: e.target.value })
                  : setAssignmentForm({ ...assignmentForm, batchId: e.target.value })
              }
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              {isSchool && classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              {isCoaching && batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={assignmentForm.isClassTeacher}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, isClassTeacher: e.target.checked })}
                className="rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <span>Designate as Head Class / Batch Mentor</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddAssignmentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* STAFF WORKSPACE DRAWER */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left">
            
            {/* Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedStaff.avatarUrl}
                  alt={selectedStaff.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-500/30 shadow-lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedStaff.name}</h3>
                    <Badge variant={selectedStaff.status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                      {selectedStaff.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-sky-400 mt-0.5">{selectedStaff.employeeCode}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedStaff.designation} • {selectedStaff.department}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStaff(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Workspace Tabs */}
            <div className="px-6 bg-slate-950/50 border-b border-slate-800">
              <Tabs
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'employment', label: 'Employment & Role' },
                  { id: 'assignments', label: 'Teaching Load' },
                  { id: 'attendance', label: 'Attendance' },
                  { id: 'documents', label: 'Document Vault' },
                ]}
                activeTab={profileTab}
                onChange={(t) => setProfileTab(t as any)}
              />
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs">
              {profileTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <p className="text-slate-400 uppercase font-mono text-[10px]">Contact Phone</p>
                      <p className="text-white font-mono font-bold text-sm">{selectedStaff.phone}</p>
                    </div>
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <p className="text-slate-400 uppercase font-mono text-[10px]">Official Email</p>
                      <p className="text-sky-400 font-mono font-bold text-sm truncate">{selectedStaff.email}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <span className="font-bold text-white uppercase text-[10px] tracking-wider block">
                      Academic Disciplines & Specializations
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStaff.subjects.map((sub) => (
                        <span key={sub} className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-lg text-xs font-mono font-semibold">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {profileTab === 'employment' && (
                <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">Employment Profile</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>Designation: <span className="text-white font-bold">{selectedStaff.designation}</span></div>
                    <div>ERP Role: <span className="text-purple-400 font-mono font-bold">{selectedStaff.role}</span></div>
                    <div>Department: <span className="text-slate-300">{selectedStaff.department}</span></div>
                    <div>Joined On: <span className="text-slate-300 font-mono">{selectedStaff.joiningDate}</span></div>
                    <div>Qualification: <span className="text-slate-300">{selectedStaff.qualification}</span></div>
                    <div>Base Salary: <span className="text-emerald-400 font-mono font-bold">₹{selectedStaff.salary.toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
              )}

              {profileTab === 'assignments' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Assigned Classes & Batches ({assignments.filter((a) => a.teacherId === selectedStaff.id).length})
                  </h4>
                  <div className="space-y-2">
                    {assignments
                      .filter((a) => a.teacherId === selectedStaff.id)
                      .map((a) => (
                        <div key={a.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-white">{a.subjectId}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{a.academicYearId}</p>
                          </div>
                          <Badge variant={a.isClassTeacher ? 'purple' : 'blue'} size="sm">
                            {a.isClassTeacher ? 'CLASS MENTOR' : 'SUBJECT FACULTY'}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
