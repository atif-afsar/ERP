import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Building, 
  LogOut, 
  UserCheck, 
  Sparkles, 
  RotateCcw,
  ChevronDown,
  Building2,
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { UserRole } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenAi: () => void;
  onNavigate: (navId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenAi, onNavigate }) => {
  const { currentTenant, allTenants, switchTenant, isSchool, getLabel, branches, currentBranch, switchBranch } = useTenant();
  const { currentUser, switchRole, isParent, activeStudentId, setActiveStudentId, logout } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(() => storage.getNotifications(currentUser.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const students = storage.getStudents(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = (id: string) => {
    storage.markNotificationRead(id);
    setNotifications(storage.getNotifications(currentUser.id));
  };

  const handleResetData = () => {
    if (confirm('Reset all demo data (students, attendance, fee ledgers, exam results) to default clean state?')) {
      storage.resetAll();
      window.location.reload();
    }
  };

  const matchingStudents = searchQuery.trim()
    ? students.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  const matchingStaff = searchQuery.trim()
    ? staff.filter(
        (st) =>
          st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          st.subjects.some((sub) => sub.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 2)
    : [];

  const roleLabels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    TENANT_ADMIN: isSchool ? 'Principal' : 'Director',
    BRANCH_MANAGER: 'Branch Manager',
    TEACHER: isSchool ? 'Teacher' : 'Faculty',
    ACCOUNTANT: 'Accountant',
    RECEPTIONIST: 'Receptionist',
    STAFF: 'Staff',
    PARENT: 'Parent',
    STUDENT: isSchool ? 'Student' : 'Learner',
  };

  const availableRoles: UserRole[] = [
    'SUPER_ADMIN',
    'TENANT_ADMIN',
    'TEACHER',
    'ACCOUNTANT',
    'STAFF',
    'PARENT',
    'STUDENT',
  ];

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-2xs">
      {/* Left: Mobile Sidebar Toggle + Context Selectors */}
      <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Multi-Branch Selector (Section 15) */}
        {branches && branches.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:border-slate-300 transition-colors">
            <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500 text-[11px] font-medium">Branch:</span>
            <select
              value={currentBranch?.id || ''}
              onChange={(e) => switchBranch(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white text-slate-800">
                  {b.name} {b.isMain ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Global Search Bar (Section 18) */}
        <div className="relative w-full max-w-xs sm:max-w-sm hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder={`Search ${isSchool ? 'students, classes, teachers' : 'learners, batches, faculty'}...`}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />

          {/* Live Search Results Popup */}
          {showSearchResults && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl p-3 shadow-xl z-50 animate-scale-up space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2">
                <span className="font-semibold">Quick Search Results</span>
                <button
                  onClick={() => {
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕ Close
                </button>
              </div>

              {matchingStudents.length === 0 && matchingStaff.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">No matching records found.</p>
              ) : (
                <>
                  {matchingStudents.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                        {getLabel('studentPlural')}
                      </span>
                      {matchingStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            onNavigate(`app/students/${s.id}`);
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{s.firstName} {s.lastName}</p>
                            <p className="text-[10px] text-slate-500">Adm: {s.admissionNo} • Status: {s.status}</p>
                          </div>
                          <span className="text-xs text-emerald-700 font-semibold">View Profile →</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchingStaff.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                        {getLabel('staffPlural')}
                      </span>
                      {matchingStaff.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => {
                            onNavigate('app/academics');
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{st.name}</p>
                            <p className="text-[10px] text-slate-500">{st.designation} • {st.subjects.join(', ')}</p>
                          </div>
                          <span className="text-xs text-slate-700 font-semibold">View Faculty →</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Role Dropdown + AI + Notifications + Profile */}
      <div className="flex items-center gap-2.5">
        {/* 16. Current Role Dropdown (Section 16 Specification) */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500 font-normal">Role:</span>
            <span>{roleLabels[currentUser.role]}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 animate-scale-up">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Switch Authorized Role
              </div>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    currentUser.role === r
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{roleLabels[r]}</span>
                  {currentUser.role === r && <span className="text-[10px] text-emerald-600 font-bold">Active</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          title="Open AI Education Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden md:inline">AI Assistant</span>
        </button>

        {/* Reset Demo Data Button */}
        <button
          onClick={handleResetData}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Reset demo data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl p-4 shadow-xl z-50 border border-slate-200 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Notifications ({unreadCount} new)
                </h4>
                <button
                  onClick={() => {
                    notifications.forEach((n) => storage.markNotificationRead(n.id));
                    setNotifications(storage.getNotifications(currentUser.id));
                  }}
                  className="text-[11px] text-emerald-700 hover:underline font-medium"
                >
                  Mark all as read
                </button>
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        handleMarkRead(n.id);
                        if (n.linkUrl) onNavigate(n.linkUrl.replace('/', ''));
                        setShowNotifications(false);
                      }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        n.isRead
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 text-xs">{n.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.createdAt}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 17. User Profile Pill (Section 17 Specification) */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-90 transition-opacity"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-300"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-emerald-700 font-semibold capitalize">
                {currentUser.designation || currentUser.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-scale-up">
              <div className="p-3 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {currentUser.role}
                </span>
              </div>

              <button
                onClick={() => {
                  onNavigate('app/settings');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Profile & Settings
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                  onNavigate('');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
