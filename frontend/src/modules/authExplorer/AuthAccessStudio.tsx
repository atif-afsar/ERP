import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Building,
  Key,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Smartphone,
  Laptop,
  Globe,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, Permission, Role, UserSession } from '../../types';
import { evaluateAccess, protectLastOwner } from '../../services/auth/accessEvaluator';
import { storage } from '../../services/storageService';

export const AuthAccessStudio: React.FC = () => {
  const { currentTenant } = useTenant();
  const { currentUser, logoutAllDevices } = useAuth();

  // Evaluator Parameters
  const [selectedRole, setSelectedRole] = useState<Role>('TEACHER');
  const [accountStatus, setAccountStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'INACTIVE'>('ACTIVE');
  const [userBranch, setUserBranch] = useState<string>('branch-main');
  const [targetBranch, setTargetBranch] = useState<string>('branch-main');
  const [requestedPermission, setRequestedPermission] = useState<Permission>('attendance.mark');
  const [isCrossTenant, setIsCrossTenant] = useState(false);
  const [isLinkedStudent, setIsLinkedStudent] = useState(true);

  // Active Sessions
  const [sessions, setSessions] = useState<UserSession[]>(() => storage.getSessions(currentUser.id));

  // Last Owner Test Result
  const [ownerTestResult, setOwnerTestResult] = useState<string | null>(null);

  // Synthetic Test User
  const syntheticUser: UserProfile = {
    id: 'sim_user_001',
    tenantId: isCrossTenant ? 'tenant_other_999' : currentTenant.id,
    name: `Simulated ${selectedRole}`,
    email: `simulated.${selectedRole.toLowerCase()}@edunexus.io`,
    phone: '+91 98765 43210',
    role: selectedRole,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: accountStatus,
    branchIds: userBranch === 'GLOBAL' ? ['branch-main', 'branch-north', 'branch-south'] : [userBranch],
    linkedStudentIds: isLinkedStudent ? ['student-101'] : [],
    studentId: isLinkedStudent ? 'student-101' : 'student-999',
    createdAt: new Date().toISOString(),
  };

  const evaluationResult = evaluateAccess({
    user: syntheticUser,
    targetTenantId: currentTenant.id,
    requiredPermission: requestedPermission,
    targetBranchId: targetBranch === 'GLOBAL' ? undefined : targetBranch,
    resourceContext: {
      studentId: 'student-101',
    },
  });

  const handleTestLastOwnerGuard = () => {
    const res = protectLastOwner(currentTenant.id, currentUser.id, 'TEACHER');
    setOwnerTestResult(res.allowed ? 'Role downgraded allowed.' : res.message);
  };

  const handleRevokeSession = (sessionId: string) => {
    storage.revokeSession(currentUser.id, sessionId);
    setSessions(storage.getSessions(currentUser.id));
  };

  const handleRevokeAll = () => {
    logoutAllDevices();
    setSessions([]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-sky-500/30 bg-sky-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-sky-400" />
            <h3 className="font-bold text-white text-lg">7-Step Authorization & Identity Evaluator</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Executes the canonical evaluation chain: <code className="text-sky-300">Identity → Account → Membership → Tenant → Role → Branch → Resource</code>.
          </p>
        </div>

        <Badge variant={evaluationResult.allowed ? 'emerald' : 'rose'} size="md">
          DECISION: {evaluationResult.decision}
        </Badge>
      </div>

      {/* Grid: Simulator Inputs & Live 7-Point Decision Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-400" />
              Simulated Identity Context
            </h4>

            {/* Role Select */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-400">Assigned Role:</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="SUPER_ADMIN">SUPER_ADMIN (Platform Superuser)</option>
                <option value="TENANT_ADMIN">TENANT_ADMIN (Institutional Owner)</option>
                <option value="TEACHER">TEACHER (Faculty)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (Bursar / Finance)</option>
                <option value="STAFF">STAFF (Front Desk / Staff)</option>
                <option value="PARENT">PARENT (Guardian)</option>
                <option value="STUDENT">STUDENT (Student)</option>
              </select>
            </div>

            {/* Account Status */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-400">Account Status:</label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value as any)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ACTIVE">ACTIVE (Normal Access)</option>
                <option value="SUSPENDED">SUSPENDED (Locked Out)</option>
                <option value="INACTIVE">INACTIVE (Disabled)</option>
              </select>
            </div>

            {/* Target Permission */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-400">Requested Permission / Action:</label>
              <select
                value={requestedPermission}
                onChange={(e) => setRequestedPermission(e.target.value as Permission)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value="attendance.mark">attendance.mark (Roll Call)</option>
                <option value="students.create">students.create (New Admission)</option>
                <option value="payments.create">payments.create (Collect Fees)</option>
                <option value="payments.refund">payments.refund (Reverse Funds)</option>
                <option value="exams.manage">exams.manage (Create & Publish Exams)</option>
                <option value="settings.manage">settings.manage (Tenant Config)</option>
                <option value="reports.view">reports.view (Institutional Analytics)</option>
              </select>
            </div>

            {/* Branch Context */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-400 text-[11px]">User Assigned Branch:</label>
                <select
                  value={userBranch}
                  onChange={(e) => setUserBranch(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="branch-main">Main Campus</option>
                  <option value="branch-north">North Campus</option>
                  <option value="GLOBAL">Multi-Branch (All)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-[11px]">Target Resource Branch:</label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="branch-main">Main Campus</option>
                  <option value="branch-north">North Campus</option>
                </select>
              </div>
            </div>

            {/* Edge Case Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCrossTenant}
                  onChange={(e) => setIsCrossTenant(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span>Simulate Cross-Tenant Request (Foreign Tenant)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLinkedStudent}
                  onChange={(e) => setIsLinkedStudent(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span>Resource Scope Match (Linked Parent/Student)</span>
              </label>
            </div>

          </div>
        </div>

        {/* Right: Step-by-Step 7-Point Chain */}
        <div className="lg:col-span-7 space-y-3">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                7-Point Evaluation Decision Chain
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {evaluationResult.evaluatedAt.slice(11, 19)} UTC
              </span>
            </div>

            <div className="space-y-2">
              {evaluationResult.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    step.passed
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {step.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        Step {step.stepNumber}: {step.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          step.passed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {step.passed ? 'PASSED' : 'DENIED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`p-3 rounded-xl border text-xs font-bold ${
                evaluationResult.allowed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              Final Outcome: {evaluationResult.reason}
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Section: Last Owner Protection Safeguard */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Last Administrator / Owner Protection Guard
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Safeguard defined in Section 42: Prevents an organization from accidentally demoting or deleting its sole administrator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleTestLastOwnerGuard}>
            Test Demoting Last Admin to TEACHER
          </Button>
          {ownerTestResult && (
            <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
              {ownerTestResult}
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
