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
import { StudentLifecycleModule } from './modules/students/StudentLifecycleModule';
import { AcademicsModule } from './modules/academics/AcademicsModule';
import { AttendanceModule } from './modules/attendance/AttendanceModule';
import { FeesModule } from './modules/fees/FeesModule';
import { FeeManagementModule } from './modules/fees/FeeManagementModule';
import { FinanceModule } from './modules/finance/FinanceModule';
import { InventoryModule } from './modules/inventory/InventoryModule';
import { LibraryModule } from './modules/library/LibraryModule';
import { TransportModule } from './modules/transport/TransportModule';
import { HostelModule } from './modules/hostel/HostelModule';
import { MessModule } from './modules/mess/MessModule';
import { HealthModule } from './modules/health/HealthModule';
import { ExamsModule } from './modules/exams/ExamsModule';
import { ExaminationAssessmentModule } from './modules/examinations/ExaminationAssessmentModule';
import { TimetableModule } from './modules/timetable/TimetableModule';
import { HomeworkModule } from './modules/homework/HomeworkModule';
import { CommunicationModule } from './modules/communication/CommunicationModule';
import { CrmModule } from './modules/crm/CrmModule';
import { ReportsModule } from './modules/reports/ReportsModule';
import { SuperAdminModule } from './modules/superadmin/SuperAdminModule';
import { SuperAdminSaaSModule } from './modules/superadmin/SuperAdminSaaSModule';
import { TenantManagementModule } from './modules/superadmin/TenantManagementModule';
import { OrganizationModule } from './modules/organization/OrganizationModule';
import { SchoolMasterDataModule } from './modules/masterData/SchoolMasterDataModule';
import { OwnerOnboardingView } from './components/auth/OwnerOnboardingView';
import { SettingsModule } from './modules/settings/SettingsModule';
import { ApiExplorerModule } from './modules/apiExplorer/ApiExplorerModule';
import { SchemaExplorerModule } from './modules/schemaExplorer/SchemaExplorerModule';
import { RolesMatrixModule } from './modules/rolesMatrix/RolesMatrixModule';
import { StaffModule } from './modules/staff/StaffModule';
import { AcademicOperationsModule } from './modules/academicOperations/AcademicOperationsModule';
import { SaaSBillingModule } from './modules/saasBilling/SaaSBillingModule';
import { GlobalAiAssistantBot } from './components/ai/GlobalAiAssistantBot';
import { LandingPage } from './modules/public/LandingPage';
import { SuperAdminShell } from './modules/superadmin/SuperAdminShell';

const READ_ONLY_MODULES = new Set([
  'dashboard', 'academics', 'finance', 'inventory', 'library',
  'transport', 'hostel', 'mess', 'health', 'homework',
  'communication', 'crm', 'reports', 'settings', 'roles-matrix', 'superadmin-plans', 'superadmin-features',
]);

const ReadOnlyModule: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-3">
    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
      Read-only during backend migration. Existing browser records have been preserved but are no longer used.
    </div>
    <div className="pointer-events-none select-text" aria-readonly="true">{children}</div>
  </div>
);

const ROUTE_PERMISSIONS: Record<string, Permission> = {
  students: 'student_lifecycle.view',
  'students/new': 'students.create',
  staff: 'staff.view',
  academics: 'students.view',
  attendance: 'attendance.view',
  'attendance/mark': 'attendance.mark',
  fees: 'fee_management.view',
  finance: 'fees.view',
  inventory: 'fees.view',
  library: 'library.view',
  transport: 'transport.view',
  hostel: 'hostel.view',
  mess: 'mess.view',
  health: 'health.view',
  'fees/new': 'fees.create',
  exams: 'examinations.view',
  results: 'exam_marks.view',
  timetable: 'timetable.view',
  homework: 'homework.view',
  communication: 'communication.send',
  crm: 'students.create',
  reports: 'reports.view',
  settings: 'settings.view',
  organization: 'users.view',
  'master-data': 'master_data.view',
  'api-docs': 'settings.view',
  schema: 'settings.view',
  'roles-matrix': 'roles.manage',
  'superadmin-dashboard': 'tenants.manage',
  'superadmin-tenants': 'tenants.manage',
  'superadmin-plans': 'subscriptions.manage',
  'superadmin-features': 'settings.view',
  'saas-billing': 'settings.view',
};

const SuspendedTenantView: React.FC<{ tenantName: string }> = ({ tenantName }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
      <AlertOctagon className="w-8 h-8" />
    </div>
    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200 mb-3 font-mono">
      Tenant Status • Suspended
    </span>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">{tenantName} Account Suspended</h2>
    <p className="text-slate-600 max-w-md text-sm mb-6 leading-relaxed">
      This institution's SaaS subscription is currently suspended or under billing review. Access to operational features has been temporarily disabled.
    </p>
    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-700 max-w-sm shadow-sm">
      Please contact EduNexus Platform Support at <span className="text-rose-600 font-semibold">billing@edunexus.io</span> to reactivate your instance.
    </div>
  </div>
);

const NotFoundView: React.FC<{ attemptedRoute: string; onBackToDashboard: () => void }> = ({
  attemptedRoute,
  onBackToDashboard,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white border border-slate-200 rounded-3xl shadow-sm animate-fade-in max-w-xl mx-auto my-8">
    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-6">
      <Compass className="w-8 h-8" />
    </div>
    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 mb-3 font-mono">
      HTTP 404 • Not Found
    </span>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h2>
    <p className="text-slate-600 max-w-md text-sm mb-4">
      The route <code className="text-amber-700 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">#{attemptedRoute}</code> does not exist or has been moved.
    </p>
    <Button variant="primary" onClick={onBackToDashboard} leftIcon={<ArrowLeft className="w-4 h-4" />}>
      Return to Dashboard
    </Button>
  </div>
);

const MainRouter: React.FC = () => {
  const { authState, isAuthenticated, isSuperAdmin, can } = useAuth();
  const { currentTenant, isFeatureEnabled } = useTenant();
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-mono">Initializing Authenticated Tenant Session...</p>
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

  // TENANT WORKSPACE & PORTALS (/app/*)
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
        return <StudentLifecycleModule />;
      case 'staff':
        return <AcademicOperationsModule initialTab="staff" />;
      case 'academics':
        return <AcademicsModule />;
      case 'attendance':
        return isFeatureEnabled('attendance') ? (
          <AcademicOperationsModule initialTab="attendance" />
        ) : (
          <UnauthorizedCard permission="attendance.view" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'fees':
        return isFeatureEnabled('fees') ? (
          <FeeManagementModule />
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
          <ExaminationAssessmentModule initialTab={currentNav === 'results' ? 'results' : 'exams'} />
        ) : (
          <UnauthorizedCard permission="exams.view" onBackToDashboard={() => navigateTo('dashboard')} />
        );
      case 'timetable':
        return isFeatureEnabled('timetable') ? (
          <AcademicOperationsModule initialTab="timetable" />
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
        return <TenantManagementModule />;
      case 'superadmin-plans':
        return <SuperAdminSaaSModule />;
      case 'organization':
        return <OrganizationModule />;
      case 'saas-billing':
        return <SaaSBillingModule />;
      case 'master-data':
        return <SchoolMasterDataModule />;
      default:
        return (
          <NotFoundView
            attemptedRoute={activeModule}
            onBackToDashboard={() => navigateTo('app/dashboard')}
          />
        );
    }
  };

  const renderPageContent = () => {
    // 1. PUBLIC MARKETING ROUTES (Doc 62)
    if (isPublicRoute) {
      return <LandingPage onNavigate={navigateTo} subRoute={routeState.fullPath} />;
    }

    // 2. SELF-ONBOARDING WIZARD (Docs 63 & 65)
    if (routeState.path === 'signup' || routeState.path === 'onboarding') {
      if (routeState.path === 'onboarding') return <OwnerOnboardingView initialToken={routeState.query.token} onComplete={() => navigateTo('login')} />;
      return <LoginView onLoginSuccess={() => navigateTo('app/dashboard')} />;
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
            onRenewSession={() => navigateTo('login')}
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
    return (
      <AppShell
        activeNav={activeModule}
        onNavigate={(nav) => navigateTo(nav)}
        onOpenAi={() => setIsAiModalOpen(true)}
      >
        {READ_ONLY_MODULES.has(currentNav) ? <ReadOnlyModule>{renderModule()}</ReadOnlyModule> : renderModule()}
      </AppShell>
    );
  };

  return (
    <>
      {renderPageContent()}

      {/* Universal Floating AI Assistant Bot - accessible everywhere for anyone */}
      <GlobalAiAssistantBot
        onNavigate={navigateTo}
        isOpen={isAiModalOpen}
        onOpen={() => setIsAiModalOpen(true)}
        onClose={() => setIsAiModalOpen(false)}
      />
    </>
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

