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
  Building,
  CheckSquare,
  FileSpreadsheet,
  UserCheck,
  DollarSign,
  Package,
  BookMarked,
  Bus,
  Home,
  UtensilsCrossed,
  HeartPulse,
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
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base tracking-tight">EduNexus SaaS</h1>
            <p className="text-[11px] text-emerald-700 font-semibold">Super Admin Console</p>
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

  // Tenant-Scoped Navigation Items
  const navItems = [
    {
      id: 'dashboard',
      label: isParent ? 'Children Overview' : isStudent ? 'Student Dashboard' : 'Dashboard',
      icon: LayoutDashboard,
      show: true,
      section: 'OVERVIEW',
    },
    {
      id: 'students',
      label: isTeacher ? `My ${getLabel('studentPlural')}` : getLabel('studentPlural'),
      icon: Users,
      show: !isStudent && !isParent,
      section: 'ACADEMICS',
    },
    {
      id: 'academics',
      label: isTeacher ? `My ${getLabel('groupPlural')}` : getLabel('groupPlural'),
      icon: GraduationCap,
      show: !isStudent && !isParent && currentUser.role !== 'ACCOUNTANT',
      section: 'ACADEMICS',
    },
    {
      id: 'attendance',
      label: isStudent ? 'My Attendance' : isParent ? "Children's Attendance" : 'Attendance & QR',
      icon: CalendarCheck,
      show: isFeatureEnabled('attendance') && currentUser.role !== 'ACCOUNTANT',
      section: 'ACADEMICS',
    },
    {
      id: 'exams',
      label: isStudent ? 'My Report Card' : isParent ? "Children's Report Cards" : getLabel('examPlural'),
      icon: Award,
      show: isFeatureEnabled('exams') && currentUser.role !== 'ACCOUNTANT',
      section: 'ACADEMICS',
    },
    {
      id: 'timetable',
      label: isStudent ? 'My Daily Schedule' : 'Timetable',
      icon: Calendar,
      show: isFeatureEnabled('timetable') && currentUser.role !== 'ACCOUNTANT',
      section: 'ACADEMICS',
    },
    {
      id: 'homework',
      label: isStudent ? 'My Homework' : isParent ? "Children's Homework" : 'Homework & Notes',
      icon: BookOpen,
      show: isFeatureEnabled('homework') && currentUser.role !== 'ACCOUNTANT',
      section: 'ACADEMICS',
    },
    {
      id: 'fees',
      label: isStudent ? 'Fee Invoices & Receipts' : isParent ? 'Fee Dues & Online Pay' : 'Fees & Payments',
      icon: CreditCard,
      show: isFeatureEnabled('fees') && (currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'ACCOUNTANT' || currentUser.role === 'STAFF' || isParent || isStudent),
      section: 'FINANCE & HR',
    },
    {
      id: 'finance',
      label: 'Finance & Accounts',
      icon: DollarSign,
      show: isFeatureEnabled('fees') && (currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'ACCOUNTANT' || currentUser.role === 'SUPER_ADMIN'),
      section: 'FINANCE & HR',
    },
    {
      id: 'staff',
      label: 'Staff & Payroll HR',
      icon: UserCheck,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'BRANCH_MANAGER' || currentUser.role === 'ACCOUNTANT',
      section: 'FINANCE & HR',
    },
    {
      id: 'inventory',
      label: 'Inventory & Assets',
      icon: Package,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'ACCOUNTANT' || currentUser.role === 'STAFF' || currentUser.role === 'SUPER_ADMIN',
      section: 'OPERATIONS',
    },
    {
      id: 'library',
      label: isStudent ? 'Library & Books' : 'Library Management',
      icon: BookMarked,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'STAFF' || currentUser.role === 'TEACHER' || isStudent || isParent || currentUser.role === 'SUPER_ADMIN',
      section: 'OPERATIONS',
    },
    {
      id: 'transport',
      label: isStudent ? 'My Bus & Route' : isParent ? "Children's Bus Route" : 'Transport & Fleet',
      icon: Bus,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'STAFF' || currentUser.role === 'SUPER_ADMIN' || isStudent || isParent,
      section: 'OPERATIONS',
    },
    {
      id: 'hostel',
      label: isStudent ? 'My Hostel Room' : isParent ? "Children's Hostel" : 'Hostel Residence',
      icon: Home,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'STAFF' || currentUser.role === 'SUPER_ADMIN' || isStudent || isParent,
      section: 'OPERATIONS',
    },
    {
      id: 'mess',
      label: isStudent ? 'Mess Menu & Meals' : isParent ? 'Mess Dining & Meals' : 'Hostel Mess & Dining',
      icon: UtensilsCrossed,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'STAFF' || currentUser.role === 'SUPER_ADMIN' || isStudent || isParent,
      section: 'OPERATIONS',
    },
    {
      id: 'health',
      label: isStudent ? 'My Health & Clinic' : isParent ? "Children's Health Record" : 'Health & Clinic',
      icon: HeartPulse,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'STAFF' || currentUser.role === 'SUPER_ADMIN' || isStudent || isParent,
      section: 'OPERATIONS',
    },
    {
      id: 'communication',
      label: 'Notice & SMS',
      icon: MessageSquare,
      show: isFeatureEnabled('communication') && currentUser.role !== 'ACCOUNTANT',
      section: 'ADMINISTRATION',
    },
    {
      id: 'crm',
      label: isSchool ? 'Admissions Desk' : 'Student Leads Desk',
      icon: UserPlus,
      show: isFeatureEnabled('inquiryCrm') && (currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STAFF'),
      section: 'ADMINISTRATION',
    },
    {
      id: 'reports',
      label: 'Analytics & Reports',
      icon: FileSpreadsheet,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'BRANCH_MANAGER',
      section: 'ADMINISTRATION',
    },
    {
      id: 'settings',
      label: 'Institution Settings',
      icon: Settings,
      show: currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'SUPER_ADMIN',
      section: 'ADMINISTRATION',
    },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xs`}>
      {/* Brand & Organization */}
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
          <Building className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-slate-900 text-sm tracking-tight truncate">{currentTenant.name}</h1>
          <p className="text-[11px] text-slate-500 font-medium">
            {isSchool ? 'School ERP System' : 'Coaching Institute ERP'}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const normalizedActive = activeNav.replace(/^app\//, '');
            const isActive = normalizedActive === item.id || (normalizedActive === '' && item.id === 'dashboard');
            return (
              <button
                key={item.id}
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
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-slate-300"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{currentUser.designation || currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
