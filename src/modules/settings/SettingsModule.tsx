import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Type,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  Building,
  ShieldCheck,
  Search,
  Clock,
  User,
  Filter,
  FileText,
  Activity,
  KeyRound,
  Laptop,
  UserPlus,
  LogOut,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { TenantFeatureFlags, TenantLabels, AuditLog, UserInvitation, UserSession } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { UserInviteModal } from '../../components/auth/UserInviteModal';
import { ApiExplorerModule } from '../apiExplorer/ApiExplorerModule';
import { SchemaExplorerModule } from '../schemaExplorer/SchemaExplorerModule';
import { AuthAccessStudio } from '../authExplorer/AuthAccessStudio';
import { RolesMatrixModule } from '../rolesMatrix/RolesMatrixModule';

export const SettingsModule: React.FC = () => {
  const { currentTenant, updateCurrentTenant, toggleFeature } = useTenant();
  const { currentUser, changePassword, logoutAllDevices, expireSessionSimulator } = useAuth();
  const [activeTab, setActiveTab] = useState<'features' | 'terminology' | 'branding' | 'security' | 'roles' | 'api' | 'schema' | 'audit'>('features');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storage.getAuditLogs(currentTenant.id));
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Security Tab State
  const [sessions, setSessions] = useState<UserSession[]>(() => storage.getSessions(currentUser.id));
  const [invitations, setInvitations] = useState<UserInvitation[]>(() => storage.getInvitations(currentTenant.id));
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Form State for Branding
  const [name, setName] = useState(currentTenant.name);
  const [tagline, setTagline] = useState(currentTenant.tagline || '');
  const [address, setAddress] = useState(currentTenant.address);
  const [phone, setPhone] = useState(currentTenant.phone);
  const [email, setEmail] = useState(currentTenant.email);

  // Form State for Terminology
  const [labels, setLabels] = useState<TenantLabels>({ ...currentTenant.labels });

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentTenant({ name, tagline, address, phone, email });
    triggerSuccess();
  };

  const handleSaveTerminology = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentTenant({ labels });
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const featureList: { key: keyof TenantFeatureFlags; label: string; desc: string }[] = [
    { key: 'attendance', label: 'Attendance Management', desc: 'Daily roll call and attendance registers.' },
    { key: 'qrAttendance', label: 'Smart QR Gate Scanner', desc: 'Live webcam & camera QR verification for fast check-in.' },
    { key: 'fees', label: 'Fee Management & Ledgers', desc: 'Fee structures, student ledgers, and installment tracking.' },
    { key: 'onlinePayments', label: 'Razorpay Online Gateway', desc: 'Accept UPI, Cards, and NetBanking payments.' },
    { key: 'exams', label: 'Examinations & Grading', desc: 'Create exams, publish results, and track ranks.' },
    { key: 'reportCards', label: 'CBSE / State Report Cards', desc: 'Official printable report card generator.' },
    { key: 'testSeries', label: 'Competitive Test Series', desc: 'Mock tests, percentile calculations, and question analysis.' },
    { key: 'rankComparison', label: 'Rank Leaderboards', desc: 'Batch vs batch and student comparison metrics.' },
    { key: 'homework', label: 'Homework & Practice Sheets', desc: 'Publish daily practice sheets (DPP) and assignments.' },
    { key: 'timetable', label: 'Academic Timetable', desc: 'Weekly class schedule matrix and room bookings.' },
    { key: 'communication', label: 'Broadcast Notices', desc: 'Targeted announcements to parents, students, or staff.' },
    { key: 'whatsappAlerts', label: 'WhatsApp Alert Triggers', desc: 'Direct WhatsApp deep-link parent notifications.' },
    { key: 'inquiryCrm', label: 'Admission CRM / Leads', desc: 'Track visitor inquiries and conversion pipeline.' },
    { key: 'aiAssistant', label: 'AI WhatsApp & Portal Assistant', desc: 'Conversational assistant answering parent inquiries.' },
    { key: 'aiReportSummary', label: 'AI Report Summarizer', desc: 'Auto-generates student academic performance narratives.' },
    { key: 'transport', label: 'Transport Management', desc: 'Bus routes, pickup stops, and vehicle tracking.' },
    { key: 'library', label: 'Library Management', desc: 'Book cataloging, issues, returns, and overdue fines.' },
    { key: 'hostel', label: 'Hostel & Dormitory', desc: 'Room allocation and mess fee tracking.' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Tenant Configuration & Customization
          </h2>
          <p className="text-xs text-slate-400">
            Customize branding, configure dynamic ERP terminology, and toggle active module features.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold animate-scale-up">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved Successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'features', label: '🎛️ Feature Flags / Module Toggles' },
          { id: 'terminology', label: '🔤 Dynamic Terminology Labels' },
          { id: 'branding', label: '🎨 Institution Branding & Identity' },
          { id: 'security', label: '🔐 Security, Sessions & Invites' },
          { id: 'roles', label: '🛡️ Roles & Permissions Matrix' },
          { id: 'api', label: '🔌 API & Service Contracts' },
          { id: 'schema', label: '🗄️ Database Schema & ERD' },
          { id: 'audit', label: '🛡️ Audit Logs & Activity Timeline' },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: FEATURE TOGGLES */}
      {activeTab === 'features' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">Modular Feature Toggles</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Turn modules ON or OFF for {currentTenant.name}. Disabled modules will disappear from navigation and routes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureList.map((feat) => {
              const isEnabled = currentTenant.features[feat.key];

              return (
                <div
                  key={feat.key}
                  onClick={() => toggleFeature(feat.key)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isEnabled
                      ? 'bg-slate-900/90 border-sky-500/40 hover:border-sky-500'
                      : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-white text-xs">{feat.label}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{feat.desc}</p>
                  </div>

                  <div className="shrink-0">
                    {isEnabled ? (
                      <div className="w-10 h-6 bg-sky-500 rounded-full p-1 flex justify-end shadow-sm">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    ) : (
                      <div className="w-10 h-6 bg-slate-800 rounded-full p-1 flex justify-start">
                        <div className="w-4 h-4 bg-slate-600 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DYNAMIC TERMINOLOGY */}
      {activeTab === 'terminology' && (
        <form onSubmit={handleSaveTerminology} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-white text-base">Custom Terminology Mapping</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define how domain entities are labeled across the UI for this specific tenant.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Group Label (e.g. Class vs Batch)</label>
              <input
                type="text"
                value={labels.group}
                onChange={(e) => setLabels({ ...labels, group: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Group Plural (e.g. Classes vs Batches)</label>
              <input
                type="text"
                value={labels.groupPlural}
                onChange={(e) => setLabels({ ...labels, groupPlural: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Student Label (e.g. Student vs Learner)</label>
              <input
                type="text"
                value={labels.student}
                onChange={(e) => setLabels({ ...labels, student: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Staff Label (e.g. Teacher vs Faculty)</label>
              <input
                type="text"
                value={labels.staff}
                onChange={(e) => setLabels({ ...labels, staff: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Exam Label (e.g. Exam vs Test Series)</label>
              <input
                type="text"
                value={labels.exam}
                onChange={(e) => setLabels({ ...labels, exam: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Homework Label (e.g. Homework vs DPP)</label>
              <input
                type="text"
                value={labels.homework}
                onChange={(e) => setLabels({ ...labels, homework: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
              Save Terminology Labels
            </Button>
          </div>
        </form>
      )}

      {/* TAB 3: BRANDING & IDENTITY */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-white text-base">Institution Identity & Branding</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Update organization name, official communications email, address, and tagline.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Institution Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Motto / Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Admissions Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Helpline Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
              Save Branding Details
            </Button>
          </div>
        </form>
      )}

      {/* TAB 4: SECURITY & SESSIONS */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Section 1: Change Password & Security Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Password Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPwError(null);
                setPwSuccess(false);
                if (newPassword !== confirmPassword) {
                  setPwError('New passwords do not match.');
                  return;
                }
                const res = changePassword(oldPassword, newPassword);
                if (res.success) {
                  setPwSuccess(true);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setTimeout(() => setPwSuccess(false), 3000);
                } else {
                  setPwError(res.error || 'Failed to change password.');
                }
              }}
              className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-sky-400" />
                  Change Password
                </h3>
                {pwSuccess && (
                  <Badge variant="emerald" size="sm">
                    Password Updated
                  </Badge>
                )}
              </div>

              {pwError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">New Password (Min 8 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" size="sm" leftIcon={<Lock className="w-3.5 h-3.5" />}>
                  Update Password
                </Button>
              </div>
            </form>

            {/* Session Management & Timeout Simulator */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-purple-400" />
                    Active Logged-in Sessions
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      logoutAllDevices();
                    }}
                    className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  >
                    Revoke All Sessions
                  </Button>
                </div>

                <div className="space-y-2 mt-3">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        s.isCurrent
                          ? 'bg-sky-500/10 border-sky-500/30'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{s.device}</p>
                          {s.isCurrent && (
                            <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                              This Device
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.browser} • {s.ipAddress}</p>
                      </div>
                      <span className="text-[10px] text-slate-400">{s.lastActiveAt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Simulator Action */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Test Session Timeout</p>
                  <p className="text-[11px] text-slate-400">Trigger simulated 30s session expiration modal</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expireSessionSimulator}
                  className="text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                >
                  Simulate Expiration
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: User Invitations & Team Onboarding */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-sky-400" />
                  Team Invitations & Role Provisioning
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Single-use cryptographic invitations for faculty, staff, and parents.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Invite Team Member
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Invitee</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Token</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Invited By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{inv.name}</td>
                      <td className="p-3 text-slate-300">{inv.email}</td>
                      <td className="p-3">
                        <Badge variant="blue" size="sm">{inv.role}</Badge>
                      </td>
                      <td className="p-3 font-mono text-amber-400 font-bold">{inv.token}</td>
                      <td className="p-3">
                        <Badge variant={inv.status === 'ACCEPTED' ? 'emerald' : 'amber'} size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-slate-400">{inv.invitedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: 7-Step Identity & Access Evaluator Studio */}
          <AuthAccessStudio />
        </div>
      )}

      {/* TAB 4: ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'roles' && <RolesMatrixModule />}

      {/* TAB 5: API & SERVICE CONTRACTS */}
      {activeTab === 'api' && <ApiExplorerModule />}

      {/* TAB 6: DATABASE SCHEMA & ERD */}
      {activeTab === 'schema' && <SchemaExplorerModule />}

      {/* TAB 7: AUDIT LOGS & ACTIVITY TIMELINE */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base">Security & Operational Audit Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Immutable, tenant-isolated audit trail answering who, what, when, and what changed.
                </p>
              </div>
              <Badge variant="purple" size="sm">
                Session {currentTenant.academicYear} • {auditLogs.length} Events Recorded
              </Badge>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search audit trail by actor, action, details..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Categories</option>
                <option value="FEES">Fees & Finance</option>
                <option value="PAYMENTS">Payments</option>
                <option value="ATTENDANCE">Attendance</option>
                <option value="RESULTS">Results & Exams</option>
                <option value="STUDENT">Student Management</option>
                <option value="SETTINGS">Settings</option>
              </select>
            </div>
          </div>

          {/* Audit Events Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">Category & Action</th>
                    <th className="px-6 py-4">Change Details & Diff</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs
                    .filter((l: AuditLog) => {
                      const matchesCat = selectedCategory === 'ALL' || l.category === selectedCategory;
                      const matchesSearch =
                        l.actorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
                        l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                        l.details.toLowerCase().includes(auditSearch.toLowerCase());
                      return matchesCat && matchesSearch;
                    })
                    .map((log: AuditLog) => (
                      <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{log.timestamp}</span>
                          </div>
                          {log.ipAddress && (
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">IP: {log.ipAddress}</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{log.actorName}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{log.actorRole}</span>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant="blue" size="sm">{log.category}</Badge>
                          <p className="font-mono text-[11px] text-sky-400 mt-1 font-semibold">{log.action}</p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-slate-200 font-medium leading-relaxed">{log.details}</p>
                          {(log.oldValues || log.newValues) && (
                            <div className="mt-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center gap-2">
                              <span className="text-rose-400 line-through">{log.oldValues}</span>
                              <span className="text-slate-500">→</span>
                              <span className="text-emerald-400 font-bold">{log.newValues}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Badge
                            variant={log.status === 'SUCCESS' ? 'emerald' : 'rose'}
                            size="sm"
                            dot
                          >
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Invitation Modal */}
      <UserInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSuccess={() => setInvitations(storage.getInvitations(currentTenant.id))}
      />
    </div>
  );
};
