import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Building, 
  CreditCard, 
  Settings, 
  FileText, 
  LogOut, 
  Activity, 
  Users, 
  CheckCircle2, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface SuperAdminShellProps {
  onNavigate: (route: string) => void;
  activeSubRoute?: string;
  onOpenAi: () => void;
}

export const SuperAdminShell: React.FC<SuperAdminShellProps> = ({ onNavigate, activeSubRoute = 'dashboard', onOpenAi }) => {
  const { currentUser, logout } = useAuth();
  const allTenants = storage.getTenants();
  const allStudents = storage.getAllStudents();
  const auditLogs = storage.getAuditLogs();

  const [activeTab, setActiveTab] = useState<string>(activeSubRoute || 'dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Platform Health & MRR', icon: Activity },
    { id: 'organizations', label: 'Tenants & Campuses', icon: Building, count: allTenants.length },
    { id: 'subscriptions', label: 'SaaS Plans & Quotas', icon: CreditCard },
    { id: 'features', label: 'Feature Flags Catalog', icon: Settings },
    { id: 'audit', label: 'System Audit Trail', icon: FileText, count: auditLogs.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="EduNexus"
            className="w-10 h-10 rounded-xl object-contain shadow-sm bg-slate-50 p-0.5 border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base tracking-tight">EduNexus Cloud</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Super Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Platform Management Console</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500 hover:text-slate-800"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate('app/dashboard')}
          >
            Exit to Tenant Workspace
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-700 hover:bg-amber-50 text-xs"
            leftIcon={<Sparkles className="w-4 h-4 text-amber-500" />}
            onClick={onOpenAi}
          >
            AI Platform Advisor
          </Button>

          <div className="pl-3 border-l border-slate-200 flex items-center gap-2">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full ring-1 ring-amber-300 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs ring-1 ring-amber-300 shrink-0">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'A'}
              </div>
            )}
            <div className="hidden sm:block text-left text-xs">
              <p className="font-bold text-slate-900 leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-amber-600 font-semibold">Super Administrator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Responsive Navigation Strip */}
      <div className="md:hidden flex overflow-x-auto gap-2 p-2.5 bg-white border-b border-slate-200 shadow-2xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Framework */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 gap-8">
        {/* Left Side Navigation */}
        <aside className="w-64 space-y-1.5 hidden md:block shrink-0">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Platform Product Surface
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-500 font-mono">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Surface Content Area */}
        <main className="flex-1 space-y-6">
          {/* TAB: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-xs">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Active Institutional Tenants</p>
                  <p className="text-3xl font-extrabold text-slate-900">{allTenants.length}</p>
                  <p className="text-xs text-emerald-600">100% Active • Zero Suspensions</p>
                </div>
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-xs">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Global Student Base</p>
                  <p className="text-3xl font-extrabold text-slate-900">{allStudents.length}</p>
                  <p className="text-xs text-amber-600">Across 2 Provisioned Campuses</p>
                </div>
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-xs">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Platform Monthly MRR</p>
                  <p className="text-3xl font-extrabold text-slate-900">₹4.85 Lakh</p>
                  <p className="text-xs text-emerald-600">Automated Billing & Invoicing</p>
                </div>
              </div>

              {/* Institutions Directory */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">Provisioned SaaS Tenants</h3>
                  <Badge variant="amber" size="sm">Multi-Tenant Isolated</Badge>
                </div>
                <div className="space-y-3">
                  {allTenants.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={t.logo} alt={t.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                          <p className="text-xs text-slate-500">{t.tenantType} • Plan: {t.planName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="emerald" size="sm">{t.status.toUpperCase()}</Badge>
                        <span className="text-xs text-slate-500">Renews {t.subscriptionRenewalDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Organizations */}
          {activeTab === 'organizations' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-900">Tenants & Campus Organizations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allTenants.map((t) => (
                  <div key={t.id} className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{t.name}</h4>
                        <p className="text-xs text-slate-500">{t.address}</p>
                      </div>
                      <Badge variant="emerald" size="sm">{t.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Tenant UUID: <span className="font-mono text-amber-700">{t.id}</span></p>
                      <p>Contact: {t.email} • {t.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Subscriptions */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-900">SaaS Subscription Plans</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm">Starter Academy</h4>
                  <p className="text-2xl font-bold text-amber-600">₹1,999<span className="text-xs text-slate-500">/mo</span></p>
                  <p className="text-xs text-slate-500">Up to 300 students per campus.</p>
                </div>
                <div className="p-5 bg-white border-2 border-amber-400 rounded-xl space-y-2 shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm">Campus Pro</h4>
                  <p className="text-2xl font-bold text-amber-600">₹4,999<span className="text-xs text-slate-500">/mo</span></p>
                  <p className="text-xs text-slate-500">Up to 1,500 students with Online Fees.</p>
                </div>
                <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm">Institutional Trust</h4>
                  <p className="text-2xl font-bold text-amber-600">₹9,999<span className="text-xs text-slate-500">/mo</span></p>
                  <p className="text-xs text-slate-500">Unlimited students & multi-campus RLS.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Features */}
          {activeTab === 'features' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-900">Platform Feature Catalog</h3>
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 text-xs shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Automated QR Gate Attendance</span>
                  <Badge variant="emerald" size="sm">Enabled Globally</Badge>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">CBSE Report Cards & Marksheets</span>
                  <Badge variant="emerald" size="sm">Enabled Globally</Badge>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Online Fees Payment Gateway</span>
                  <Badge variant="emerald" size="sm">Enabled Globally</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">AI Education Assistant</span>
                  <Badge variant="emerald" size="sm">Active (Beta)</Badge>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Audit */}
          {activeTab === 'audit' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-900">Platform Security Audit Log</h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-96 overflow-y-auto space-y-2 text-xs">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{log.action}</p>
                      <p className="text-[11px] text-slate-500">{log.actorName} ({log.actorRole}) • {log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
