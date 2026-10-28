import { canOpenModule } from '../../services/auth/permissionPolicy';
import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  Award,
  Calendar,
  BookOpen,
  MessageSquare,
  Shield,
  Building,
  FileSpreadsheet,
  UserCheck,
  QrCode,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeNav: string;
  onNavigate: (navId: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onNavigate, isOpen, onClose }) => {
  const { currentTenant, getLabel, isSchool, hasEntitlement } = useTenant();
  const { currentUser, isSuperAdmin, isTeacher, isParent, isStudent, can } = useAuth();

  // Super Admin view
  if (isSuperAdmin) {
    const superAdminNavs = [
      { id: 'superadmin-dashboard', label: 'Platform Overview', icon: LayoutDashboard },
      { id: 'superadmin-tenants', label: 'Tenants & Schools', icon: Building },
      { id: 'superadmin-plans', label: 'Subscription Plans', icon: CreditCard },
    ];

    return (
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <img
            src="/logo.png"
            alt="EzyAura SaaS"
            className="w-11 h-11 rounded-xl object-contain shadow-sm border border-slate-200/80 p-0.5 bg-white shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-slate-900 text-base tracking-tight leading-tight">EzyAura</h1>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                SaaS
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold truncate">Super Admin Console</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {superAdminNavs.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                data-module={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 border-r-2 border-emerald-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  const isStaffSide = !isParent && !isStudent;
  const qrAttendance = hasEntitlement('qr_attendance');

  // V1 navigation. Each entry is also checked against canOpenModule below.
  const navItems = [
    { id: 'dashboard', label: isParent ? 'Children Overview' : isStudent ? 'My Dashboard' : 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: isTeacher ? `My ${getLabel('studentPlural')}` : getLabel('studentPlural'), icon: Users },
    {
      id: 'attendance',
      label: isStudent ? (qrAttendance ? 'Attendance & QR Scan' : 'My Attendance') : isParent ? "Children's Attendance" : qrAttendance ? 'Attendance & QR' : 'Attendance',
      icon: isStudent && qrAttendance ? QrCode : CalendarCheck,
      show: currentUser.role !== 'ACCOUNTANT',
    },
    { id: isParent || isStudent ? 'results' : 'exams', label: isStudent ? 'My Results' : isParent ? "Children's Results" : 'Examinations', icon: Award },
    { id: 'timetable', label: isStudent ? 'My Timetable' : 'Timetable', icon: Calendar, show: !isParent && currentUser.role !== 'ACCOUNTANT' },
    { id: 'homework', label: isStudent ? 'My Homework' : isParent ? "Children's Homework" : 'Homework', icon: BookOpen },
    { id: 'fees', label: isStudent ? 'My Fees' : isParent ? 'Fees & Payments' : 'Fees', icon: CreditCard },
    { id: 'communication', label: 'Notices', icon: MessageSquare, show: isStaffSide },
    { id: 'staff', label: currentUser.permissions?.includes('staff.view') || currentUser.role === 'SUPER_ADMIN' ? 'Staff & HR' : 'My HR', icon: UserCheck },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'master-data', label: isSchool ? 'School Setup' : 'Institute Setup', icon: Building },
    { id: 'organization', label: 'Users & Access', icon: Shield },
    { id: 'saas-billing', label: 'Subscription', icon: CreditCard },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xs`}>
      {/* Brand & Organization */}
      <div className="p-3.5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
        <img
          src="/logo.png"
          alt="EzyAura ERP"
          className="w-11 h-11 rounded-xl object-contain shadow-sm border border-slate-200/80 p-0.5 bg-white shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 text-base tracking-tight truncate">EzyAura</span>
            <span className="text-[9px] px-1.5 py-0.2 font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded shrink-0">
              {currentTenant.institutionLabel}
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium truncate" title={currentTenant.name}>
            {currentTenant.name}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems
          .filter((item) => item.show !== false && canOpenModule(currentUser, item.id))
          .map((item) => {
            const Icon = item.icon;
            const normalizedActive = activeNav.replace(/^app\//, '');
            const isActive = normalizedActive === item.id || (normalizedActive === '' && item.id === 'dashboard');
            return (
              <button
                key={item.id}
                data-module={item.id}
                onClick={() => {
                  onNavigate(`app/${item.id}`);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold border-r-2 border-emerald-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate text-left">{item.label}</span>
              </button>
            );
          })}
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 p-1.5 rounded-lg">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs border border-emerald-700 shrink-0">
              {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{currentUser.designation || currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
