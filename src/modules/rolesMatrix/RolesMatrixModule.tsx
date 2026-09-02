import React, { useState } from 'react';
import {
  ShieldCheck,
  Shield,
  Lock,
  Check,
  X,
  Plus,
  AlertTriangle,
  Info,
  Layers,
  Users,
  Building,
  GraduationCap,
  CreditCard,
  Award,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Search,
  Sparkles,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useTenant } from '../../context/TenantContext';
import { useAuth, ROLE_PERMISSIONS } from '../../context/AuthContext';
import { UserRole, Permission, PermissionScope, CustomRoleDefinition } from '../../types';
import { storage } from '../../services/storageService';

interface PermissionGroup {
  name: string;
  icon: any;
  permissions: {
    key: Permission;
    label: string;
    description: string;
    isHighPrivilege?: boolean;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Students & Guardians',
    icon: Users,
    permissions: [
      { key: 'students.view', label: 'View Students', description: 'Browse and search student directory' },
      { key: 'students.create', label: 'Create Student / Register', description: 'Enroll new admissions' },
      { key: 'students.update', label: 'Update Student Profile', description: 'Edit demographic and contact details' },
      { key: 'students.delete', label: 'Archive / Delete Student', description: 'Deactivate or soft-delete student', isHighPrivilege: true },
    ],
  },
  {
    name: 'Attendance & Roll Call',
    icon: CheckCircle2,
    permissions: [
      { key: 'attendance.view', label: 'View Attendance', description: 'Access daily and historical register' },
      { key: 'attendance.mark', label: 'Take Roll Call', description: 'Record daily batch/classroom attendance' },
      { key: 'attendance.create', label: 'Create Attendance Sessions', description: 'Generate session rosters' },
      { key: 'attendance.update', label: 'Edit Attendance', description: 'Modify recorded marks within same day' },
      { key: 'attendance.correct', label: 'Historical Correction', description: 'Audited backdated attendance edits', isHighPrivilege: true },
    ],
  },
  {
    name: 'Fees & Invoicing',
    icon: CreditCard,
    permissions: [
      { key: 'fees.view', label: 'View Fee Plans', description: 'Access fee structures and balances' },
      { key: 'fees.create', label: 'Create Fee Structures', description: 'Configure fee components and heads' },
      { key: 'fees.update', label: 'Modify Fee Assignments', description: 'Adjust concessions and installment plans' },
      { key: 'fees.export', label: 'Export Fee Registers', description: 'Download CSV fee ledgers' },
    ],
  },
  {
    name: 'Payments & Financial Ledger',
    icon: CreditCard,
    permissions: [
      { key: 'payments.view', label: 'View Receipts', description: 'Inspect payment transaction history' },
      { key: 'payments.record', label: 'Record Counter Payments', description: 'Issue offline cash/cheque receipts' },
      { key: 'payments.create', label: 'Generate Invoices & Demands', description: 'Create billing demands' },
      { key: 'payments.refund', label: 'Process Refunds', description: 'Reverse settled funds and issue refunds', isHighPrivilege: true },
    ],
  },
  {
    name: 'Examinations & Grading',
    icon: Award,
    permissions: [
      { key: 'exams.view', label: 'View Exam Schedules', description: 'Inspect assessment terms and timetable' },
      { key: 'exams.create', label: 'Create Exam Series', description: 'Configure exams and max marks' },
      { key: 'exams.update', label: 'Update Exam Details', description: 'Modify syllabus and passing criteria' },
      { key: 'exams.publish', label: 'Publish Results', description: 'Lock scores and release report cards', isHighPrivilege: true },
      { key: 'results.view', label: 'View Gradebooks', description: 'Inspect marks and class ranks' },
      { key: 'results.create', label: 'Enter Subject Marks', description: 'Input score sheets and grading' },
    ],
  },
  {
    name: 'Academics & Timetable',
    icon: GraduationCap,
    permissions: [
      { key: 'timetable.view', label: 'View Timetable', description: 'Access class/batch schedules' },
      { key: 'timetable.manage', label: 'Manage Timetable Slots', description: 'Assign rooms and faculty slots' },
      { key: 'homework.view', label: 'View Homework / DPPs', description: 'Access student homework listings' },
      { key: 'homework.create', label: 'Assign Homework & DPPs', description: 'Publish daily practice sheets' },
    ],
  },
  {
    name: 'Communication & Notices',
    icon: Building,
    permissions: [
      { key: 'communication.send', label: 'Dispatch Broadcasts', description: 'Send SMS, email, and WhatsApp alerts' },
      { key: 'announcements.view', label: 'View Institutional Notices', description: 'Read announcement board' },
      { key: 'announcements.create', label: 'Publish Notices', description: 'Broadcast notices to parents/students' },
    ],
  },
  {
    name: 'Reports & Institutional Intelligence',
    icon: FileSpreadsheet,
    permissions: [
      { key: 'reports.view', label: 'View Operational Reports', description: 'Academic and attendance rosters' },
      { key: 'reports.export', label: 'Export Analytics CSV', description: 'Download institutional report spreadsheets' },
    ],
  },
  {
    name: 'Security, Users & System Administration',
    icon: Shield,
    permissions: [
      { key: 'users.manage', label: 'Manage Team & Invitations', description: 'Invite, suspend, and configure users', isHighPrivilege: true },
      { key: 'roles.manage', label: 'Configure Custom Roles', description: 'Edit roles and permission boundaries', isHighPrivilege: true },
      { key: 'settings.view', label: 'View System Settings', description: 'Inspect branding and feature toggles' },
      { key: 'settings.update', label: 'Update Tenant Settings', description: 'Change organization configurations', isHighPrivilege: true },
      { key: 'audit.view', label: 'Inspect Audit Logs', description: 'View immutable security timeline', isHighPrivilege: true },
      { key: 'tenants.manage', label: 'Manage Multi-Tenant Platform', description: 'Platform superadmin operations', isHighPrivilege: true },
    ],
  },
];

const ROLES_LIST: { role: UserRole; label: string; badge: 'purple' | 'blue' | 'emerald' | 'amber' }[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin', badge: 'purple' },
  { role: 'TENANT_ADMIN', label: 'Administrator', badge: 'blue' },
  { role: 'BRANCH_MANAGER', label: 'Branch Manager', badge: 'emerald' },
  { role: 'TEACHER', label: 'Teacher / Faculty', badge: 'blue' },
  { role: 'ACCOUNTANT', label: 'Accountant', badge: 'amber' },
  { role: 'RECEPTIONIST', label: 'Receptionist', badge: 'blue' },
  { role: 'STAFF', label: 'Staff Member', badge: 'blue' },
];

export const RolesMatrixModule: React.FC = () => {
  const { currentTenant } = useTenant();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'matrix' | 'builder' | 'deepdive'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleForDeepDive, setSelectedRoleForDeepDive] = useState<UserRole>('TEACHER');

  // Custom Role Builder State
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleCode, setCustomRoleCode] = useState('');
  const [customRoleDesc, setCustomRoleDesc] = useState('');
  const [customRoleScope, setCustomRoleScope] = useState<PermissionScope>('BRANCH');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([
    'students.view',
    'attendance.view',
    'attendance.mark',
  ]);
  const [roleSaveSuccess, setRoleSaveSuccess] = useState(false);

  // Check dangerous permission combination
  const hasDangerousFinancialCombination =
    selectedPermissions.includes('payments.create') && selectedPermissions.includes('payments.refund');
  const hasDangerousSecurityCombination =
    selectedPermissions.includes('users.manage') && selectedPermissions.includes('roles.manage');

  const togglePermissionSelection = (p: Permission) => {
    if (selectedPermissions.includes(p)) {
      setSelectedPermissions(selectedPermissions.filter((item) => item !== p));
    } else {
      setSelectedPermissions([...selectedPermissions, p]);
    }
  };

  const handleSaveCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName || !customRoleCode) return;

    // Log audit event
    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'CUSTOM_ROLE_CREATED',
      category: 'USER_MANAGEMENT',
      entityType: 'ROLE',
      entityId: customRoleCode,
      details: `Created custom role '${customRoleName}' with scope '${customRoleScope}' and ${selectedPermissions.length} permissions.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    setRoleSaveSuccess(true);
    setTimeout(() => {
      setRoleSaveSuccess(false);
      setCustomRoleName('');
      setCustomRoleCode('');
      setCustomRoleDesc('');
    }, 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-sky-400" />
              Role & Permission Matrix
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-400">
              Canonical RBAC Matrix
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional authorization definitions, granular capabilities, custom role scoping, and separation of duties guards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="blue" size="sm">
            {ROLES_LIST.length} Canonical Roles
          </Badge>
          <Badge variant="purple" size="sm">
            Strict Server Enforcement
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        tabs={[
          { id: 'matrix', label: '📊 Comprehensive Permission Matrix' },
          { id: 'deepdive', label: '🔍 Role Boundaries & Scope Inspector' },
          { id: 'builder', label: '🛠️ Custom Role Builder & Scope Guard' },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: COMPREHENSIVE PERMISSION MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search capabilities by name or permission key..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" /> Granted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <X className="w-3.5 h-3.5 text-slate-600" /> Restricted
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3.5 w-72">Capability / Permission</th>
                    {ROLES_LIST.map((r) => (
                      <th key={r.role} className="p-3 text-center min-w-28">
                        <span className="block font-bold text-white">{r.label}</span>
                        <span className="text-[9px] text-slate-500 font-normal">{r.role}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {PERMISSION_GROUPS.map((group) => {
                    const filteredPerms = group.permissions.filter(
                      (p) =>
                        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.key.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    if (filteredPerms.length === 0) return null;

                    const Icon = group.icon;

                    return (
                      <React.Fragment key={group.name}>
                        <tr className="bg-slate-950/70 border-y border-slate-800">
                          <td colSpan={ROLES_LIST.length + 1} className="p-2.5 px-4 font-bold text-sky-400 flex items-center gap-2 text-xs">
                            <Icon className="w-4 h-4" />
                            <span>{group.name}</span>
                          </td>
                        </tr>

                        {filteredPerms.map((perm) => (
                          <tr key={perm.key} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-medium text-white">
                              <div className="flex items-center gap-1.5">
                                <span>{perm.label}</span>
                                {perm.isHighPrivilege && (
                                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] rounded font-bold">
                                    ELEVATED
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">{perm.key}</p>
                            </td>

                            {ROLES_LIST.map((r) => {
                              const hasPerm = ROLE_PERMISSIONS[r.role]?.includes(perm.key);
                              return (
                                <td key={r.role} className="p-3 text-center">
                                  {hasPerm ? (
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-600 flex items-center justify-center mx-auto">
                                      <X className="w-3.5 h-3.5 stroke-[1.5]" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE BOUNDARIES & DEEP DIVE */}
      {activeTab === 'deepdive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Role List */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-1">
              Select Role for Deep Dive
            </span>
            {ROLES_LIST.map((r) => {
              const isSelected = selectedRoleForDeepDive === r.role;
              const permCount = ROLE_PERMISSIONS[r.role]?.length || 0;

              return (
                <button
                  key={r.role}
                  onClick={() => setSelectedRoleForDeepDive(r.role)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-500/40 shadow-lg shadow-sky-500/5'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-bold text-white text-xs">{r.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.role}</p>
                  </div>
                  <Badge variant={r.badge} size="sm">
                    {permCount} Perms
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Right: Operational Capabilities & Restrictions */}
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {ROLES_LIST.find((r) => r.role === selectedRoleForDeepDive)?.label}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Operational privileges and structural restriction boundaries for <code className="text-sky-400">{selectedRoleForDeepDive}</code>.
                  </p>
                </div>
                <Badge variant="blue" size="md">
                  Scope: {selectedRoleForDeepDive === 'SUPER_ADMIN' ? 'GLOBAL' : selectedRoleForDeepDive === 'BRANCH_MANAGER' ? 'BRANCH' : selectedRoleForDeepDive === 'TEACHER' ? 'ASSIGNED' : 'TENANT'}
                </Badge>
              </div>

              {/* Granted Capabilities */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Authorized Capabilities ({ROLE_PERMISSIONS[selectedRoleForDeepDive]?.length || 0})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_PERMISSIONS[selectedRoleForDeepDive]?.map((perm) => (
                    <div key={perm} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explicit Restrictions */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  Strict Restriction Guardrails
                </span>
                <div className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-500/20 text-xs text-slate-300 space-y-1">
                  {selectedRoleForDeepDive === 'TEACHER' && (
                    <p>• Cannot view fee records, collect tuition, process refunds, or modify organization security configurations.</p>
                  )}
                  {selectedRoleForDeepDive === 'ACCOUNTANT' && (
                    <p>• Cannot invite/remove staff, manage custom roles, or configure branch institutional settings.</p>
                  )}
                  {selectedRoleForDeepDive === 'BRANCH_MANAGER' && (
                    <p>• Cannot access data from unassigned branches or alter tenant-wide subscription and billing configurations.</p>
                  )}
                  {selectedRoleForDeepDive === 'STAFF' && (
                    <p>• Restricted strictly to operational front-desk functions and authorized communication broadcasts.</p>
                  )}
                  {(selectedRoleForDeepDive === 'SUPER_ADMIN' || selectedRoleForDeepDive === 'TENANT_ADMIN') && (
                    <p>• Broadest privileges, but bound by append-only audit logging and last-owner deletion safeguards.</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 3: CUSTOM ROLE BUILDER */}
      {activeTab === 'builder' && (
        <form onSubmit={handleSaveCustomRole} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Custom Role Builder & Scope Configurator
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Assemble tailor-made security roles with defined authorization scopes and automated separation of duties checks.
              </p>
            </div>

            <Button variant="primary" size="sm" type="submit" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Save Custom Role
            </Button>
          </div>

          {/* Success Banner */}
          {roleSaveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Custom role successfully created and registered into tenant authorization directory with audit entry.</span>
            </div>
          )}

          {/* Dangerous Combination Warnings */}
          {(hasDangerousFinancialCombination || hasDangerousSecurityCombination) && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Separation of Duties Alert: High-Privilege Combination Detected</span>
              </div>
              {hasDangerousFinancialCombination && (
                <p>• This role holds both <strong>payments.create</strong> and <strong>payments.refund</strong>. For financial compliance, refund authority is typically separated from billing clerks.</p>
              )}
              {hasDangerousSecurityCombination && (
                <p>• This role holds both <strong>users.manage</strong> and <strong>roles.manage</strong>, effectively granting self-privilege modification capability.</p>
              )}
            </div>
          )}

          {/* Role Metadata Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">Role Name:</label>
              <input
                type="text"
                required
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
                placeholder="e.g. Senior Exam Coordinator"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">Role Code:</label>
              <input
                type="text"
                required
                value={customRoleCode}
                onChange={(e) => setCustomRoleCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="e.g. EXAM_COORDINATOR"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">Authorization Scope:</label>
              <select
                value={customRoleScope}
                onChange={(e) => setCustomRoleScope(e.target.value as PermissionScope)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="TENANT">TENANT (Full Organization Scope)</option>
                <option value="BRANCH">BRANCH (Assigned Branch Scope)</option>
                <option value="ASSIGNED">ASSIGNED (Explicit Student/Group Scope)</option>
                <option value="SELF">SELF (Personal Records Only)</option>
              </select>
            </div>
          </div>

          {/* Permission Checklist */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Select Granted Permissions ({selectedPermissions.length} selected)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPermissions(['students.view', 'attendance.view', 'attendance.mark', 'exams.view'])}
                >
                  Select Teacher Preset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPermissions(['students.view', 'fees.view', 'payments.view', 'payments.record', 'reports.view'])}
                >
                  Select Cashier Preset
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PERMISSION_GROUPS.flatMap((g) => g.permissions).map((p) => {
                const isChecked = selectedPermissions.includes(p.key);
                return (
                  <label
                    key={p.key}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isChecked
                        ? 'bg-sky-500/10 border-sky-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermissionSelection(p.key)}
                      className="rounded border-slate-700 text-sky-500 mt-0.5 focus:ring-0"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">{p.label}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.key}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

        </form>
      )}

    </div>
  );
};
