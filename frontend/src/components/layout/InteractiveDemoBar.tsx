import React from 'react';
import { 
  Building2, 
  UserCheck, 
  Sparkles, 
  RotateCcw, 
  ShieldCheck, 
  GraduationCap, 
  Users, 
  BookOpen, 
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { storage } from '../../services/storageService';

interface InteractiveDemoBarProps {
  onOpenAi: () => void;
}

export const InteractiveDemoBar: React.FC<InteractiveDemoBarProps> = ({ onOpenAi }) => {
  const { currentTenant, allTenants, switchTenant, isSchool } = useTenant();
  const { currentUser, switchRole, isParent, activeStudentId, setActiveStudentId } = useAuth();

  const handleResetData = () => {
    if (confirm('Reset all demo data (students, attendance, fee ledgers, exam results) to default clean state?')) {
      storage.resetAll();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-50 border-b border-slate-200 text-xs px-3 sm:px-6 py-1.5 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Tenant Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-medium text-slate-500">Institution:</span>
            <select
              value={currentTenant.id}
              onChange={(e) => switchTenant(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold outline-none cursor-pointer text-xs pr-1"
            >
              {allTenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-white text-slate-900">
                  {t.name} ({t.tenantType})
                </option>
              ))}
            </select>
          </div>

          <span
            className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isSchool
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-purple-50 text-purple-800 border-purple-200'
            }`}
          >
            {isSchool ? '🏫 School Engine' : '🎯 Coaching Engine'}
          </span>
        </div>

        {/* Center: Role Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="hidden xl:inline text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Role:
          </span>

          {(['SUPER_ADMIN', 'TENANT_ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF', 'PARENT', 'STUDENT'] as UserRole[]).map((r) => {
            const isActive = currentUser.role === r;
            const labels: Record<UserRole, string> = {
              SUPER_ADMIN: 'Super Admin',
              TENANT_ADMIN: isSchool ? 'Principal' : 'Director',
              BRANCH_MANAGER: 'Branch Mgr',
              TEACHER: isSchool ? 'Teacher' : 'Faculty',
              ACCOUNTANT: 'Accountant',
              RECEPTIONIST: 'Receptionist',
              STAFF: 'Staff',
              PARENT: 'Parent',
              STUDENT: isSchool ? 'Student' : 'Learner',
            };

            return (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {r === 'SUPER_ADMIN' && <ShieldCheck className="w-3 h-3 text-amber-300" />}
                {r === 'TENANT_ADMIN' && <GraduationCap className="w-3 h-3" />}
                {r === 'TEACHER' && <BookOpen className="w-3 h-3" />}
                {r === 'PARENT' && <Users className="w-3 h-3" />}
                {labels[r]}
              </button>
            );
          })}
        </div>

        {/* Right: Quick Action Pill & AI Assistant */}
        <div className="flex items-center gap-2">
          {/* Parent Child Switcher if multiple children */}
          {isParent && currentUser.linkedStudentIds && currentUser.linkedStudentIds.length > 1 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]">
              <span className="text-slate-500 font-medium">Child:</span>
              <select
                value={activeStudentId || ''}
                onChange={(e) => setActiveStudentId(e.target.value)}
                className="bg-transparent text-emerald-800 font-semibold outline-none cursor-pointer"
              >
                <option value="student-101" className="bg-white text-slate-900">Aarav (Grade 10)</option>
                <option value="student-102" className="bg-white text-slate-900">Ananya (Grade 9)</option>
              </select>
            </div>
          )}

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAi}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-xs transition-colors"
            title="Open AI WhatsApp & Portal Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Assistant</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetData}
            className="p-1.5 text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
            title="Reset All Demo Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
