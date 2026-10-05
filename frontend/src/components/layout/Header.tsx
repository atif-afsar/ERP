import React, { useEffect, useState } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Building, 
  LogOut, 
  Sparkles, 
  Building2,
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { notificationService, type AppNotification } from '../../services/notificationService';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenAi: () => void;
  onNavigate: (navId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenAi, onNavigate }) => {
  const { currentTenant, allTenants, switchTenant, isSchool, getLabel, branches, currentBranch, switchBranch } = useTenant();
  const { currentUser, isParent, activeStudentId, setActiveStudentId, logout, can } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationError, setNotificationError] = useState('');
  const [feeReminderEmail, setFeeReminderEmail] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const students = storage.getStudents(currentTenant.id);
  const staff = storage.getStaff(currentTenant.id);

  const notificationsAllowed = can('notifications.view_own');
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  useEffect(()=>{let active=true;setNotificationError('');if(!notificationsAllowed){setNotifications([]);return;}Promise.all([notificationService.list(currentTenant.id),notificationService.preferences(currentTenant.id)]).then(([items,prefs])=>{if(!active)return;setNotifications(items);const saved=prefs.data.preferences.find((x:any)=>x.event_type==='FEE_DUE_REMINDER'&&x.channel==='EMAIL');setFeeReminderEmail(saved?saved.is_enabled:true);}).catch(error=>{if(active){console.error('Failed to load notifications',error);setNotificationError(error.message||'Notifications could not be loaded.');}});return()=>{active=false;};},[currentTenant.id,currentUser.id,notificationsAllowed]);
  const markRead=async(n:AppNotification)=>{if(!n.readAt){await notificationService.markRead(currentTenant.id,n.id);setNotifications(items=>items.map(x=>x.id===n.id?{...x,readAt:new Date().toISOString()}:x));}if(n.linkUrl)onNavigate(n.linkUrl.replace(/^#?\/?(app\/)?/,''));setShowNotifications(false);};
  const markAllRead=async()=>{await notificationService.markAllRead(currentTenant.id);const now=new Date().toISOString();setNotifications(items=>items.map(x=>({...x,readAt:x.readAt||now})));};


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
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-2xs">
      {/* Left: Mobile Sidebar Toggle + Context Selectors */}
      <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <img
            src="/logo.png"
            alt="EduNexus"
            className="w-9 h-9 rounded-xl object-contain shadow-xs border border-slate-200/80 p-0.5 bg-white"
          />
          <span className="font-extrabold text-slate-900 text-sm tracking-tight hidden sm:inline">
            EduNexus
          </span>
        </div>

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
        {/* AI Assistant Button */}
        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          title="Open AI Education Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden md:inline">AI Assistant</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            disabled={!notificationsAllowed}
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
                <button className="text-[10px] text-emerald-700 hover:underline" onClick={markAllRead}>Mark all read</button>
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                {notificationError ? <p role="alert" className="text-xs text-rose-700">{notificationError}</p> : notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => void markRead(n)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        n.readAt
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
              <label className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                <span>Email fee reminders</span>
                <input type="checkbox" checked={feeReminderEmail} onChange={async e=>{const enabled=e.target.checked;setFeeReminderEmail(enabled);try{await notificationService.setPreference(currentTenant.id,{eventType:'FEE_DUE_REMINDER',channel:'EMAIL',isEnabled:enabled});}catch{setFeeReminderEmail(!enabled);}}} className="accent-emerald-600" />
              </label>
            </div>
          )}
        </div>

        {/* 17. User Profile Pill (Section 17 Specification) */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-90 transition-opacity"
          >
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
