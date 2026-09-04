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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Top Bar */}
      <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight">EduNexus Cloud</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Super Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Platform Management Console</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-400 hover:text-white"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate('app/dashboard')}
          >
            Exit to Tenant Workspace
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs"
            leftIcon={<Sparkles className="w-4 h-4 text-amber-400" />}
            onClick={onOpenAi}
          >
            AI Platform Advisor
          </Button>

          <div className="pl-3 border-l border-slate-800 flex items-center gap-2">
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.name} 
              className="w-8 h-8 rounded-full ring-1 ring-amber-500/30 object-cover" 
            />
            <div className="hidden sm:block text-left text-xs">
              <p className="font-bold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-amber-400 font-semibold">Super Administrator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Framework */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 gap-8">
        {/* Left Side Navigation */}
        <aside className="w-64 space-y-1.5 hidden md:block shrink-0">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400 font-mono">
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
                <div className="p-5 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-1 shadow-lg">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Active Institutional Tenants</p>
                  <p className="text-3xl font-extrabold text-white">{allTenants.length}</p>
                  <p className="text-xs text-emerald-400">100% Active • Zero Suspensions</p>
                </div>
                <div className="p-5 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-1 shadow-lg">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Global Student Base</p>
                  <p className="text-3xl font-extrabold text-white">{allStudents.length}</p>
                  <p className="text-xs text-amber-300">Across 2 Provisioned Campuses</p>
                </div>
                <div className="p-5 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-1 shadow-lg">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Platform Monthly MRR</p>
                  <p className="text-3xl font-extrabold text-white">₹4.85 Lakh</p>
                  <p className="text-xs text-emerald-400">Auto-Billed on Supabase Cloud</p>
                </div>
              </div>

              {/* Institutions Directory */}
              <div className="p-6 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">Provisioned SaaS Tenants</h3>
                  <Badge variant="amber" size="sm">Multi-Tenant Isolated</Badge>
                </div>
                <div className="space-y-3">
                  {allTenants.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={t.logo} alt={t.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="font-bold text-white text-sm">{t.name}</h4>
                          <p className="text-xs text-slate-400">{t.tenantType} • Plan: {t.planName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="emerald" size="sm">{t.status.toUpperCase()}</Badge>
                        <span className="text-xs text-slate-400">Renews {t.subscriptionRenewalDate}</span>
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
              <h3 className="text-lg font-bold text-white">Tenants & Campus Organizations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allTenants.map((t) => (
                  <div key={t.id} className="p-5 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{t.name}</h4>
                        <p className="text-xs text-slate-400">{t.address}</p>
                      </div>
                      <Badge variant="emerald" size="sm">{t.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <p>Tenant UUID: <span className="font-mono text-amber-300">{t.id}</span></p>
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
              <h3 className="text-lg font-bold text-white">SaaS Subscription Plans</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm">Starter Academy</h4>
                  <p className="text-2xl font-bold text-amber-300">₹1,999<span className="text-xs text-slate-400">/mo</span></p>
                  <p className="text-xs text-slate-400">Up to 300 students per campus.</p>
                </div>
                <div className="p-5 bg-slate-800/60 border border-amber-500/40 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm">Campus Pro</h4>
                  <p className="text-2xl font-bold text-amber-300">₹4,999<span className="text-xs text-slate-400">/mo</span></p>
                  <p className="text-xs text-slate-400">Up to 1,500 students with Online Fees.</p>
                </div>
                <div className="p-5 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm">Institutional Trust</h4>
                  <p className="text-2xl font-bold text-amber-300">₹9,999<span className="text-xs text-slate-400">/mo</span></p>
                  <p className="text-xs text-slate-400">Unlimited students & multi-campus RLS.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Features */}
          {activeTab === 'features' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-white">Platform Feature Catalog</h3>
              <div className="p-5 bg-slate-800/60 border border-slate-700 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="font-semibold text-white">Automated QR Gate Attendance</span>
                  <Badge variant="emerald" size="sm">Enabled Globally</Badge>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="font-semibold text-white">CBSE Report Cards & Marksheets</span>
                  <Badge variant="emerald" size="sm">Enabled Globally</Badge>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="font-semibold text-white">Online Fees Payment Gateway</span>
                  <Badge variant="emerald" size="sm">Enabled Globally</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">AI Education Assistant</span>
                  <Badge variant="emerald" size="sm">Active (Beta)</Badge>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Audit */}
          {activeTab === 'audit' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-white">Platform Security Audit Log</h3>
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl max-h-96 overflow-y-auto space-y-2 text-xs">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{log.action}</p>
                      <p className="text-[11px] text-slate-400">{log.actorName} ({log.actorRole}) • {log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{log.timestamp.slice(0, 16).replace('T', ' ')}</span>
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
