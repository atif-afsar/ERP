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
  Layers
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { storage } from '../../services/storageService';

interface InteractiveDemoBarProps {
  onOpenAi: () => void;
}

export const InteractiveDemoBar: React.FC<InteractiveDemoBarProps> = ({ onOpenAi }) => {
  const { currentTenant, allTenants, switchTenant, isSchool, isCoaching } = useTenant();
  const { currentUser, switchRole, isParent, activeStudentId, setActiveStudentId } = useAuth();

  const handleResetData = () => {
    if (confirm('Reset all demo data (students, attendance, fee ledgers, exam results) to default clean state?')) {
      storage.resetAll();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-xs px-3 sm:px-6 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Tenant Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/70 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-medium text-slate-400">Active Tenant:</span>
            <select
              value={currentTenant.id}
              onChange={(e) => switchTenant(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs pr-1"
            >
              {allTenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name} ({t.tenantType})
                </option>
              ))}
            </select>
          </div>

          <span
            className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isSchool
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}
          >
            {isSchool ? '🏫 School Engine' : '🎯 Coaching Engine'}
          </span>
        </div>

        {/* Center: Role Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="hidden xl:inline text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Role:
          </span>

          {(['SUPER_ADMIN', 'TENANT_ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF', 'PARENT', 'STUDENT'] as UserRole[]).map((r) => {
            const isActive = currentUser.role === r;
            const labels: Record<UserRole, string> = {
              SUPER_ADMIN: 'Super Admin',
              TENANT_ADMIN: isSchool ? 'Principal' : 'Director',
              TEACHER: isSchool ? 'Teacher' : 'Faculty',
              ACCOUNTANT: 'Accountant',
              STAFF: 'Receptionist',
              PARENT: 'Parent',
              STUDENT: isSchool ? 'Student' : 'Learner',
            };

            return (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm font-semibold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {r === 'SUPER_ADMIN' && <ShieldCheck className="w-3 h-3 text-amber-300" />}
                {r === 'TENANT_ADMIN' && <GraduationCap className="w-3 h-3 text-sky-300" />}
                {r === 'TEACHER' && <BookOpen className="w-3 h-3 text-emerald-300" />}
                {r === 'PARENT' && <Users className="w-3 h-3 text-purple-300" />}
                {labels[r]}
              </button>
            );
          })}
        </div>

        {/* Right: Quick Action Pill & AI Assistant */}
        <div className="flex items-center gap-2">
          {/* Parent Child Switcher if multiple children */}
          {isParent && currentUser.linkedStudentIds && currentUser.linkedStudentIds.length > 1 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-950/40 border border-purple-800/40 rounded-lg text-[11px]">
              <span className="text-purple-300 font-medium">Child:</span>
              <select
                value={activeStudentId || ''}
                onChange={(e) => setActiveStudentId(e.target.value)}
                className="bg-transparent text-purple-200 font-semibold outline-none cursor-pointer"
              >
                <option value="student-101" className="bg-slate-900 text-white">Aarav (Grade 10)</option>
                <option value="student-102" className="bg-slate-900 text-white">Ananya (Grade 9)</option>
              </select>
            </div>
          )}

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAi}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium shadow-md shadow-purple-600/20 transition-all active:scale-95"
            title="Open AI WhatsApp & Portal Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Assistant</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetData}
            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            title="Reset All Demo Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
