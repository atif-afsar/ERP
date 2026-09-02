import React, { useState } from 'react';
import { Menu, Search, Bell, Sparkles, CheckCircle2, ChevronDown, Building, LogOut } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenAi: () => void;
  onNavigate: (navId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenAi, onNavigate }) => {
  const { currentTenant, isSchool, getLabel, branches, currentBranch, switchBranch } = useTenant();
  const { currentUser, isParent, activeStudentId, setActiveStudentId, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(() => storage.getNotifications(currentUser.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const students = storage.getStudents(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = (id: string) => {
    storage.markNotificationRead(id);
    setNotifications(storage.getNotifications(currentUser.id));
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

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-[39px] z-20">
      {/* Left: Mobile Sidebar Trigger & Global Search & Branch Switcher */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Multi-Branch Switcher */}
        {branches && branches.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
            <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Branch:</span>
            <select
              value={currentBranch?.id || ''}
              onChange={(e) => switchBranch(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.name} {b.isMain ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Global Search Bar */}
        <div className="relative w-full max-w-xs sm:max-w-sm hidden sm:block">
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
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all"
          />

          {/* Live Search Popup */}
          {showSearchResults && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 animate-scale-up space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                <span>Quick Search Results</span>
                <button
                  onClick={() => {
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>

              {matchingStudents.length === 0 && matchingStaff.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No matching records found.</p>
              ) : (
                <>
                  {matchingStudents.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                        {getLabel('studentPlural')}
                      </span>
                      {matchingStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            onNavigate(`students/${s.id}`);
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="p-2 rounded-lg bg-slate-950/70 hover:bg-sky-950/50 border border-slate-800 cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">{s.firstName} {s.lastName}</p>
                            <p className="text-[10px] text-slate-400">Adm: {s.admissionNo} • Status: {s.status}</p>
                          </div>
                          <span className="text-xs text-sky-400 font-semibold">View Profile →</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchingStaff.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                        {getLabel('staffPlural')}
                      </span>
                      {matchingStaff.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => {
                            onNavigate('academics');
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="p-2 rounded-lg bg-slate-950/70 hover:bg-purple-950/50 border border-slate-800 cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">{st.name}</p>
                            <p className="text-[10px] text-slate-400">{st.designation} • {st.subjects.join(', ')}</p>
                          </div>
                          <span className="text-xs text-purple-400 font-semibold">View Faculty →</span>
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

      {/* Right Action Center */}
      <div className="flex items-center gap-3">
        {/* Child Selector for Parent role */}
        {isParent && currentUser.linkedStudentIds && currentUser.linkedStudentIds.length > 1 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs">
            <span className="text-slate-400">Child:</span>
            <select
              value={activeStudentId || ''}
              onChange={(e) => setActiveStudentId(e.target.value)}
              className="bg-transparent text-sky-400 font-semibold outline-none cursor-pointer"
            >
              <option value="student-101" className="bg-slate-900 text-white">Aarav (Grade 10)</option>
              <option value="student-102" className="bg-slate-900 text-white">Ananya (Grade 6)</option>
            </select>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-dropdown rounded-2xl p-4 shadow-2xl z-50 border border-slate-700 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Notifications ({unreadCount} new)
                </h4>
                <button
                  onClick={() => {
                    notifications.forEach((n) => storage.markNotificationRead(n.id));
                    setNotifications(storage.getNotifications(currentUser.id));
                  }}
                  className="text-[11px] text-sky-400 hover:underline font-medium"
                >
                  Mark all as read
                </button>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        handleMarkRead(n.id);
                        if (n.linkUrl) onNavigate(n.linkUrl.replace('/', ''));
                        setShowNotifications(false);
                      }}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        n.isRead
                          ? 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                          : 'bg-sky-500/10 border-sky-500/30 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-white text-xs">{n.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.createdAt}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill & Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 border-l border-slate-800 hover:opacity-90 transition-opacity"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/20"
            />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-sky-400 font-medium capitalize">
                {currentUser.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-scale-up">
              <div className="p-3 border-b border-slate-800 mb-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {currentUser.role}
                </span>
              </div>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
              >
                Profile & Settings
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                  onNavigate('login');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold"
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
