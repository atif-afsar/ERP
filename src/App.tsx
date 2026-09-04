import React, { useState, useEffect } from 'react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { Button } from './components/ui/Button';
import { ShieldAlert, ArrowLeft, HelpCircle, Compass, LogIn, AlertOctagon, Loader2 } from 'lucide-react';
import { Permission } from './types';
import { UnauthorizedCard } from './components/auth/PermissionGuard';
import { LoginView } from './components/auth/LoginView';
import { SessionExpiredModal } from './components/auth/SessionExpiredModal';

// Modules
import { DashboardModule } from './modules/dashboard/DashboardModule';
import { StudentsModule } from './modules/students/StudentsModule';
import { AcademicsModule } from './modules/academics/AcademicsModule';
import { AttendanceModule } from './modules/attendance/AttendanceModule';
import { FeesModule } from './modules/fees/FeesModule';
import { FinanceModule } from './modules/finance/FinanceModule';
import { InventoryModule } from './modules/inventory/InventoryModule';
import { LibraryModule } from './modules/library/LibraryModule';
import { TransportModule } from './modules/transport/TransportModule';
import { HostelModule } from './modules/hostel/HostelModule';
import { MessModule } from './modules/mess/MessModule';
import { HealthModule } from './modules/health/HealthModule';
import { ExamsModule } from './modules/exams/ExamsModule';
import { TimetableModule } from './modules/timetable/TimetableModule';
import { HomeworkModule } from './modules/homework/HomeworkModule';
import { CommunicationModule } from './modules/communication/CommunicationModule';
import { CrmModule } from './modules/crm/CrmModule';
import { ReportsModule } from './modules/reports/ReportsModule';
import { SuperAdminModule } from './modules/superadmin/SuperAdminModule';
import { SettingsModule } from './modules/settings/SettingsModule';
import { ApiExplorerModule } from './modules/apiExplorer/ApiExplorerModule';
import { SchemaExplorerModule } from './modules/schemaExplorer/SchemaExplorerModule';
import { RolesMatrixModule } from './modules/rolesMatrix/RolesMatrixModule';
import { StaffModule } from './modules/staff/StaffModule';
import { AiAssistantModal } from './modules/ai/AiAssistantModal';
import { LandingPage } from './modules/public/LandingPage';
import { OnboardingWizard } from './modules/onboarding/OnboardingWizard';
import { SuperAdminShell } from './modules/superadmin/SuperAdminShell';

const ROUTE_PERMISSIONS: Record<string, Permission> = {
  students: 'students.view',
  'students/new': 'students.create',
  staff: 'staff.read',
  academics: 'students.view',
  attendance: 'attendance.view',
  'attendance/mark': 'attendance.mark',
  fees: 'fees.view',
  finance: 'fees.view',
  inventory: 'fees.view',
  library: 'library.view',
  transport: 'transport.view',
  hostel: 'hostel.view',
  mess: 'mess.view',
  health: 'health.view',
  'fees/new': 'fees.create',
  exams: 'exams.view',
  results: 'exams.view',
  timetable: 'timetable.view',
  homework: 'homework.view',
  communication: 'communication.send',
  crm: 'students.create',
  reports: 'reports.view',
  settings: 'settings.view',
  'api-docs': 'settings.view',
  schema: 'settings.view',
  'roles-matrix': 'roles.manage',
  'superadmin-dashboard': 'tenants.manage',
  'superadmin-tenants': 'tenants.manage',
  'superadmin-plans': 'subscriptions.manage',
  'superadmin-features': 'settings.view',
};

const SuspendedTenantView: React.FC<{ tenantName: string }> = ({ tenantName }) => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-2xl">
      <AlertOctagon className="w-8 h-8" />
    </div>
    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20 mb-3 font-mono">
      Tenant Status • Suspended
    </span>
    <h2 className="text-2xl font-bold text-white mb-2">{tenantName} Account Suspended</h2>
    <p className="text-slate-400 max-w-md text-sm mb-6 leading-relaxed">
      This institution's SaaS subscription is currently suspended or under billing review. Access to operational features has been temporarily disabled.
    </p>
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-sm">
      Please contact EduNexus Platform Support at <span className="text-sky-400 font-semibold">billing@edunexus.io</span> to reactivate your instance.
    </div>
  </div>
);

const NotFoundView: React.FC<{ attemptedRoute: string; onBackToDashboard: () => void }> = ({
  attemptedRoute,
  onBackToDashboard,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl animate-fade-in max-w-xl mx-auto my-8">
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
      <Compass className="w-8 h-8" />
    </div>
    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20 mb-3 font-mono">
      HTTP 404 • Not Found
    </span>
    <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
    <p className="text-slate-400 max-w-md text-sm mb-4">
      The route <code className="text-amber-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">#{attemptedRoute}</code> does not exist or has been moved.
    </p>
    <Button variant="primary" onClick={onBackToDashboard} leftIcon={<ArrowLeft className="w-4 h-4" />}>
      Return to Dashboard
    </Button>
  </div>
);

const MainRouter: React.FC = () => {
  const { authState, isAuthenticated, isSuperAdmin, can, login, currentUser } = useAuth();
  const { currentTenant, isFeatureEnabled, switchTenant } = useTenant();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Helper to get normalized route from window hash
  const getHashRoute = (): { rawHash: string; path: string; fullPath: string; query: Record<string, string>; subParam?: string } => {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    const [pathPart, queryPart] = (rawHash || '').split('?');
    const query: Record<string, string> = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((val, key) => {
        query[key] = val;
      });
    }
    const segments = pathPart.split('/').filter(Boolean);
    const fullPath = pathPart;
    const mainPath = segments[0] || '';
    const subParam = segments[1];

    return { rawHash, path: mainPath, fullPath, query, subParam };
  };

  const [routeState, setRouteState] = useState(getHashRoute);

  // Sync route on hash change (Back/Forward browser buttons)
  useEffect(() => {
    const handleHashChange = () => {
      setRouteState(getHashRoute());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (navTarget: string) => {
    const cleanTarget = navTarget.startsWith('/') ? navTarget.slice(1) : navTarget;
    window.location.hash = `#/${cleanTarget}`;
  };

  // Zero-Flicker Loading State
  if (authState === 'UNKNOWN') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-mono">Initializing Authenticated Tenant Session...</p>
      </div>
    );
  }

  // 1. PUBLIC MARKETING ROUTES (Doc 62)
  const isPublicRoute = 
    routeState.rawHash === '' || 
    routeState.path === 'landing' || 
    routeState.path === 'features' || 
    routeState.path === 'solutions' || 
    routeState.path === 'pricing' || 
    routeState.path === 'how-it-works';

  if (isPublicRoute) {
    return <LandingPage onNavigate={navigateTo} subRoute={routeState.fullPath} />;
  }

  // 2. SELF-ONBOARDING WIZARD (Docs 63 & 65)
  if (routeState.path === 'signup' || routeState.path === 'onboarding') {
    return (
      <OnboardingWizard
        onComplete={(newTenant) => {
          switchTenant(newTenant.id);
          navigateTo('app/dashboard');
        }}
        onCancel={() => navigateTo('')}
      />
    );
  }

  // 3. AUTHENTICATION & LOGIN (Doc 63)
  if (routeState.path === 'login' || !isAuthenticated) {
    return (
      <>
        <LoginView
          onLoginSuccess={() => {
            const redirect = routeState.query.redirect;
            if (redirect && redirect.startsWith('/') && !redirect.includes('://')) {
              navigateTo(redirect.slice(1));
            } else {
              navigateTo('app/dashboard');
            }
          }}
          redirectUrl={routeState.query.redirect}
        />

        {/* Session Expired Modal if triggered */}
        <SessionExpiredModal
          isOpen={authState === 'SESSION_EXPIRED'}
          onRenewSession={() => login(currentUser.id)}
          onRedirectToLogin={() => navigateTo('login')}
        />
      </>
    );
  }

  // 4. SUSPENDED TENANT STATE (Section 48)
  if (authState === 'TENANT_SUSPENDED' && !isSuperAdmin) {
    return <SuspendedTenantView tenantName={currentTenant.name} />;
  }

  // 5. SEPARATE SUPER ADMIN SURFACE (Doc 64)
  if (routeState.path === 'super-admin') {
    if (!isSuperAdmin) {
      return (
        <UnauthorizedCard
          permission="tenants.manage"
          onBackToDashboard={() => navigateTo('app/dashboard')}
        />
      );
    }
    return (
      <SuperAdminShell
        onNavigate={navigateTo}
        activeSubRoute={routeState.subParam}
        onOpenAi={() => setIsAiModalOpen(true)}
      />
    );
  }

  // 6. TENANT WORKSPACE & PORTALS (/app/*)
  const activeModule = routeState.path === 'app' 
    ? (routeState.subParam || 'dashboard') 
    : (routeState.path || 'dashboard');

  const currentNav = isSuperAdmin && activeModule === 'dashboard' ? 'superadmin-dashboard' : activeModule;

  // Permission & Feature verification
  const requiredPermission = ROUTE_PERMISSIONS[currentNav];
  const isAuthorized = !requiredPermission || can(requiredPermission);

  const renderModule = () => {
    if (!isAuthorized && requiredPermission) {
      return (
        <UnauthorizedCard
          permission={requiredPermission}
          onBackToDashboard={() => navigateTo('dashboard')}
        />
      );
    }

    switch (currentNav) {
      case 'dashboard':
      case 'superadmin-dashboard':
        return isSuperAdmin ? (
          <SuperAdminModule />
        ) : (
          <DashboardModule
            onNavigate={(nav) => navigateTo(nav)}
            onOpenAi={() => setIsAiModalOpen(true)}
          />
        );
      case 'students':
        return <StudentsModule />;
      case 'staff':
        return <StaffModule />;
      case 'academics':
        return <AcademicsModule />;
      case 'attendance':
        return isFeatureEnabled('attendance') ? (
          <AttendanceModule />
        ) : (
          <UnauthorizedCard permission="attendance.view" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'fees':
        return isFeatureEnabled('fees') ? (
          <FeesModule />
        ) : (
          <UnauthorizedCard permission="fees.view" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'finance':
        return <FinanceModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'library':
        return <LibraryModule />;
      case 'transport':
        return <TransportModule />;
      case 'hostel':
        return <HostelModule />;
      case 'mess':
        return <MessModule />;
      case 'health':
        return <HealthModule />;
      case 'exams':
      case 'results':
        return isFeatureEnabled('exams') ? (
          <ExamsModule defaultTab={currentNav === 'results' ? 'report_cards' : undefined} />
        ) : (
          <UnauthorizedCard permission="exams.view" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'timetable':
        return isFeatureEnabled('timetable') ? (
          <TimetableModule />
        ) : (
          <UnauthorizedCard permission="timetable.view" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'homework':
        return isFeatureEnabled('homework') ? (
          <HomeworkModule />
        ) : (
          <UnauthorizedCard permission="homework.view" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'communication':
        return isFeatureEnabled('communication') ? (
          <CommunicationModule />
        ) : (
          <UnauthorizedCard permission="communication.send" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'crm':
        return isFeatureEnabled('inquiryCrm') ? (
          <CrmModule />
        ) : (
          <UnauthorizedCard permission="students.create" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'reports':
        return <ReportsModule />;
      case 'api-docs':
        return <ApiExplorerModule />;
      case 'schema':
        return <SchemaExplorerModule />;
      case 'roles-matrix':
        return <RolesMatrixModule />;
      case 'settings':
      case 'superadmin-features':
        return <SettingsModule />;
      case 'superadmin-tenants':
      case 'superadmin-plans':
        return <SuperAdminModule />;
      default:
        return (
          <NotFoundView
            attemptedRoute={activeModule}
            onBackToDashboard={() => navigateTo('app/dashboard')}
          />
        );
    }
  };

  return (
    <AppShell
      activeNav={activeModule}
      subTitle={routeState.subParam ? `Item ID: ${routeState.subParam}` : undefined}
      onNavigate={(nav) => navigateTo(nav)}
      onOpenAi={() => setIsAiModalOpen(true)}
    >
      {renderModule()}

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </AppShell>
  );
};

export function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;

