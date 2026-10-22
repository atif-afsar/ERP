import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { NetworkStatusBanner } from '../ui/NetworkStatusBanner';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  CreditCard, 
  Users, 
  BookOpen,
  MoreHorizontal,
  Award,
  Calendar,
  MessageSquare,
  FileSpreadsheet,
  Building,
  Shield,
  UserCheck,
  X
} from 'lucide-react';
import { canOpenModule } from '../../services/auth/permissionPolicy';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

interface AppShellProps {
  children: React.ReactNode;
  activeNav: string;
  subTitle?: string;
  onNavigate: (navId: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNav,
  subTitle,
  onNavigate,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const { currentUser, isParent, isStudent, isSuperAdmin } = useAuth();
  const { getLabel, isSchool } = useTenant();

  const moreNavItems = [
    { id: isParent || isStudent ? 'results' : 'exams', label: isParent || isStudent ? 'Results' : 'Examinations', icon: Award },
    { id: 'timetable', label: 'Timetable', icon: Calendar, show: !isParent && currentUser.role !== 'ACCOUNTANT' },
    { id: 'homework', label: getLabel('homework'), icon: BookOpen },
    { id: 'communication', label: 'Notices', icon: MessageSquare, show: !isParent && !isStudent },
    { id: 'staff', label: currentUser.permissions?.includes('staff.view') ? 'Staff & HR' : 'My HR', icon: UserCheck },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'master-data', label: isSchool ? 'School Setup' : 'Institute Setup', icon: Building },
    { id: 'organization', label: 'Users & Access', icon: Shield },
    { id: 'saas-billing', label: 'Subscription', icon: CreditCard },
  ].map(item => ({ ...item, show: item.show !== false && canOpenModule(currentUser, item.id) }));

  return (
    <div className="h-dvh min-h-0 overflow-hidden bg-[#f8faf9] text-slate-900 flex flex-col antialiased">
      {/* Real-time Network Connectivity Banner */}
      <NetworkStatusBanner />

      {/* Main Framework Layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeNav={activeNav}
          onNavigate={onNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 lg:pl-64 bg-[#f8faf9]">
          <Header
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onNavigate={onNavigate}
          />

          <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {/* Dynamic Route Breadcrumbs */}
              <Breadcrumbs
                activeNav={activeNav}
                subTitle={subTitle}
                onNavigate={onNavigate}
              />

              <ErrorBoundary fallbackTitle="Module View Error">
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] transition-colors ${
            activeNav === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        {!isSuperAdmin && canOpenModule(currentUser, 'students') && (
          <button
            onClick={() => onNavigate('students')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] transition-colors ${
              activeNav === 'students' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{getLabel('studentPlural')}</span>
          </button>
        )}

        {!isSuperAdmin && currentUser.role !== 'ACCOUNTANT' && canOpenModule(currentUser, 'attendance') && (
          <button
            onClick={() => onNavigate('attendance')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] transition-colors ${
              activeNav === 'attendance' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance</span>
          </button>
        )}

        {!isSuperAdmin && canOpenModule(currentUser, 'fees') && (
          <button
            onClick={() => onNavigate('fees')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] transition-colors ${
              activeNav === 'fees' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Fees</span>
          </button>
        )}

        <button
          onClick={() => setMobileMoreOpen(true)}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] transition-colors ${
            mobileMoreOpen ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Drawer Sheet */}
      {mobileMoreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setMobileMoreOpen(false)}
          />
          <div className="relative bg-white border-t border-slate-200 rounded-t-2xl p-6 shadow-2xl z-50 animate-slide-up space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">More Modules & Services</h3>
              <button
                onClick={() => setMobileMoreOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {moreNavItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileMoreOpen(false);
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-left text-xs font-semibold text-slate-800 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-emerald-700">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
