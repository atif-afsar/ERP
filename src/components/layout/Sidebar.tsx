import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  Award,
  Calendar,
  BookOpen,
  MessageSquare,
  UserPlus,
  Settings,
  Shield,
  QrCode,
  Sparkles,
  Building,
  CheckSquare,
  FileSpreadsheet,
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
  const { currentTenant, getLabel, isFeatureEnabled, isSchool } = useTenant();
  const { currentUser, isSuperAdmin, isTeacher, isParent, isStudent } = useAuth();

  // Super Admin view
  if (isSuperAdmin) {
    const superAdminNavs = [
      { id: 'superadmin-dashboard', label: 'Platform Overview', icon: LayoutDashboard },
      { id: 'superadmin-tenants', label: 'Tenants & Schools', icon: Building },
      { id: 'superadmin-plans', label: 'Subscription Plans', icon: CreditCard },
      { id: 'superadmin-features', label: 'Feature Catalog', icon: Settings },
    ];

    return (
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-md shadow-amber-500/20 text-slate-950 font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight">EduNexus SaaS</h1>
            <p className="text-[11px] text-amber-400 font-medium">Super Admin Console</p>
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
                onClick={() => {
                  onNavigate(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  // Tenant-Scoped Navigation Items
  const navItems = [
    {
      id: 'dashboard',
      label: isParent ? 'Children Overview' : isStudent ? 'Student Dashboard' : 'Dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'students',
      label: isTeacher ? `My ${getLabel('studentPlural')}` : getLabel('studentPlural'),
      icon: Users,
      show: !isStudent && !isParent,
    },
    {
      id: 'academics',
      label: isTeacher ? `My ${getLabel('groupPlural')}` : getLabel('groupPlural'),
      icon: GraduationCap,
      show: !isStudent && !isParent && currentUser.role !== 'ACCOUNTANT',
    },
    {
      id: 'attendance',
      label: isStudent ? 'My Attendance' : isParent ? "Children's Attendance" : 'Attendance & QR',
      icon: CalendarCheck,
      show: isFeatureEnabled('attendance') && currentUser.role !== 'ACCOUNTANT',
    },
    {
      id: 'fees',
      label: isStudent ? 'Fee Invoices & Receipts' : isParent ? 'Fee Dues & Online Pay' : 'Fees & Payments',
      icon: CreditCard,
      show: isFeatureEnabled('fees') && (currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'ACCOUNTANT' || currentUser.role === 'STAFF' || isParent || isStudent),
    },
    {
      id: 'exams',
      label: isStudent ? 'My Report Card' : isParent ? "Children's Report Cards" : getLabel('examPlural'),
      icon: Award,
      show: isFeatureEnabled('exams') && currentUser.role !== 'ACCOUNTANT',
    },
    {
      id: 'timetable',
      label: isStudent ? 'My Daily Schedule' : 'Timetable',
      icon: Calendar,
      show: isFeatureEnabled('timetable') && currentUser.role !== 'ACCOUNTANT',
    },
    {
      id: 'homework',
      label: isStudent ? 'My Homework & DPP' : isParent ? 'Homework Tracker' : getLabel('homework'),
      icon: BookOpen,
      show: isFeatureEnabled('homework') && currentUser.role !== 'ACCOUNTANT',
    },
    {
      id: 'communication',
      label: 'Notices & WhatsApp',
      icon: MessageSquare,
      show: isFeatureEnabled('communication'),
    },
    {
      id: 'crm',
      label: isSchool ? 'Admission Inquiries' : 'Lead CRM Pipeline',
      icon: UserPlus,
      show: isFeatureEnabled('inquiryCrm') && (currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'STAFF'),
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: FileSpreadsheet,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'ACCOUNTANT',
    },
    {
      id: 'settings',
      label: 'Tenant Settings',
      icon: Settings,
      show: currentUser.role === 'TENANT_ADMIN',
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Tenant Branding Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <img
          src={currentTenant.logo}
          alt={currentTenant.name}
          className="w-9 h-9 rounded-xl object-cover ring-2 ring-sky-500/30"
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white text-sm truncate tracking-tight" title={currentTenant.name}>
            {currentTenant.name}
          </h1>
          <p className="text-[11px] text-slate-400 truncate">
            {currentTenant.academicYear} • {currentTenant.code}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>

        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-400 border border-sky-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
      </div>

      {/* Footer Profile Pill */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.designation || currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
