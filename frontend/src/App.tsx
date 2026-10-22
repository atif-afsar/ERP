import { canOpenModule } from './services/auth/permissionPolicy';
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
import { apiClient } from './services/api/apiClient';

// Modules
const DashboardModule = React.lazy(() => import('./modules/dashboard/DashboardModule').then(m => ({ default: m.DashboardModule })));
const StudentLifecycleModule = React.lazy(() => import('./modules/students/StudentLifecycleModule').then(m => ({ default: m.StudentLifecycleModule })));
const AcademicOperationsModule = React.lazy(() => import('./modules/academicOperations/AcademicOperationsModule').then(m => ({ default: m.AcademicOperationsModule })));
const FeeManagementModule = React.lazy(() => import('./modules/fees/FeeManagementModule').then(m => ({ default: m.FeeManagementModule })));
const ExaminationAssessmentModule = React.lazy(() => import('./modules/examinations/ExaminationAssessmentModule').then(m => ({ default: m.ExaminationAssessmentModule })));
const StudentParentResultsModule = React.lazy(() => import('./modules/examinations/StudentParentResultsModule').then(m => ({ default: m.StudentParentResultsModule })));
const StudentTimetable = React.lazy(() => import('./modules/timetable/StudentTimetable').then(m => ({ default: m.StudentTimetable })));
const HomeworkModule = React.lazy(() => import('./modules/homework/HomeworkModule').then(m => ({ default: m.HomeworkModule })));
const CommunicationCenterModule = React.lazy(() => import('./modules/communication/CommunicationCenterModule').then(m => ({ default: m.CommunicationCenterModule })));
const ReportsModule = React.lazy(() => import('./modules/reports/ReportsModule').then(m => ({ default: m.ReportsModule })));
const SuperAdminModule = React.lazy(() => import('./modules/superadmin/SuperAdminModule').then(m => ({ default: m.SuperAdminModule })));
const SuperAdminSaaSModule = React.lazy(() => import('./modules/superadmin/SuperAdminSaaSModule').then(m => ({ default: m.SuperAdminSaaSModule })));
const TenantManagementModule = React.lazy(() => import('./modules/superadmin/TenantManagementModule').then(m => ({ default: m.TenantManagementModule })));
const OrganizationModule = React.lazy(() => import('./modules/organization/OrganizationModule').then(m => ({ default: m.OrganizationModule })));
const SchoolMasterDataModule = React.lazy(() => import('./modules/masterData/SchoolMasterDataModule').then(m => ({ default: m.SchoolMasterDataModule })));
const SaaSBillingModule = React.lazy(() => import('./modules/saasBilling/SaaSBillingModule').then(m => ({ default: m.SaaSBillingModule })));
import { OwnerOnboardingView } from './components/auth/OwnerOnboardingView';
import { LandingPage } from './modules/public/LandingPage';

const ROUTE_PERMISSIONS: Record<string, Permission> = {
  students: 'student_lifecycle.view',
  staff: 'staff.view',
  attendance: 'attendance.view',
  fees: 'fee_management.view',
  exams: 'examinations.view',
  results: 'exam_marks.view',
  timetable: 'timetable.view',
  homework: 'homework.view',
  communication: 'communications.view',
  reports: 'fee_reports.view',
  organization: 'users.view',
  'master-data': 'master_data.view',
  'superadmin-dashboard': 'tenants.manage',
  'superadmin-tenants': 'tenants.manage',
  'superadmin-plans': 'subscriptions.manage',
  'saas-billing': 'organization.view',
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
  const { authState, isAuthenticated, isSuperAdmin, currentUser, can } = useAuth();
  const { currentTenant } = useTenant();
  const [ownerEntitlement, setOwnerEntitlement] = useState<{ isActive: boolean } | null>(null);
  const [entitlementError, setEntitlementError] = useState('');
  useEffect(() => {
    let active = true;
    setOwnerEntitlement(null);
    setEntitlementError('');
    if (!isAuthenticated || currentUser.role !== 'TENANT_ADMIN') return;
    apiClient.request<{ entitlement: { isActive: boolean } }>('/api/v1/billing/subscription')
      .then(result => { if (active) setOwnerEntitlement(result.data.entitlement); })
      .catch(error => { if (active) setEntitlementError(error.message); });
    return () => { active = false; };
  }, [isAuthenticated, currentUser.id, currentUser.role]);

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
  const isAuthorized = canOpenModule(currentUser, currentNav);

  const renderModule = () => {
    // Restrict Super Admin to platform operations when operating without school context
    if (isSuperAdmin && (currentNav === 'fees' || currentNav === 'fees/new' || currentNav === 'students' || currentNav === 'students/new' || currentNav === 'finance' || currentNav === 'attendance')) {
      return (
        <UnauthorizedCard
          permission="tenants.manage"
          onBackToDashboard={() => navigateTo('superadmin-dashboard')}
        />
      );
    }

    // Keep the existing shell/logout and own billing recovery usable while
    // preventing expired owners from entering operational screens.
    if (currentUser.role === 'TENANT_ADMIN' && currentNav !== 'saas-billing') {
      if (!ownerEntitlement && !entitlementError) return <p>Checking subscription access...</p>;
      if (entitlementError || !ownerEntitlement?.isActive) return (
        <div className="rounded-xl border bg-white p-6 space-y-3">
          <h2 className="text-xl font-bold">Subscription access required</h2>
          <p>{entitlementError || 'Operational access has expired. Your records are preserved; open billing to recover your subscription.'}</p>
          <Button onClick={() => navigateTo('saas-billing')}>Open billing</Button>
        </div>
      );
    }
    if (!isAuthorized && requiredPermission) {
      return (
        <UnauthorizedCard
          permission={requiredPermission}
          onBackToDashboard={() => navigateTo('dashboard')}
        />
      );
    }

    const moduleNode = (() => {
      switch (currentNav) {
        case 'dashboard':
        case 'superadmin-dashboard':
          return isSuperAdmin ? <SuperAdminModule /> : <DashboardModule onNavigate={(nav) => navigateTo(nav)} />;
        case 'students':
          return <StudentLifecycleModule />;
        case 'staff':
          return <AcademicOperationsModule initialTab="staff" />;
        case 'attendance':
          return <AcademicOperationsModule initialTab="attendance" />;
        case 'timetable':
          return currentUser.role === 'STUDENT' ? <StudentTimetable /> : <AcademicOperationsModule initialTab="timetable" />;
        case 'exams':
        case 'results':
          if (currentUser.role === 'PARENT' || currentUser.role === 'STUDENT') return <StudentParentResultsModule />;
          return <ExaminationAssessmentModule initialTab={currentNav === 'results' ? 'results' : 'exams'} />;
        case 'fees':
          return <FeeManagementModule />;
        case 'homework':
          return <HomeworkModule />;
        case 'communication':
          return <CommunicationCenterModule />;
        case 'reports':
          return <ReportsModule />;
        case 'organization':
          return <OrganizationModule />;
        case 'master-data':
          return <SchoolMasterDataModule />;
        case 'saas-billing':
          return <SaaSBillingModule />;
        case 'superadmin-tenants':
          return <TenantManagementModule />;
        case 'superadmin-plans':
          return <SuperAdminSaaSModule />;
        default:
          return (
            <NotFoundView
              attemptedRoute={activeModule}
              onBackToDashboard={() => navigateTo('app/dashboard')}
            />
          );
      }
    })();

    return moduleNode;
  };

  const renderPageContent = () => {
    // 1. PUBLIC MARKETING ROUTES (Doc 62)
    if (isPublicRoute) {
      return <LandingPage onNavigate={navigateTo} subRoute={routeState.fullPath} />;
    }

    // 2. SELF-ONBOARDING WIZARD (Docs 63 & 65)
    if (routeState.path === 'signup' || routeState.path === 'onboarding') {
      if (routeState.path === 'onboarding') return <OwnerOnboardingView initialToken={routeState.query.token} onComplete={() => navigateTo('login')} />;
      return <LandingPage onNavigate={navigateTo} subRoute="signup" autoOpenPlan={true} />;
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
              } else if (isSuperAdmin) {
                navigateTo('app/superadmin-dashboard');
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

    // 5. Old super admin link: the console now lives inside the app shell.
    if (routeState.path === 'super-admin') {
      navigateTo(isSuperAdmin ? 'app/superadmin-dashboard' : 'app/dashboard');
      return null;
    }

    // 6. TENANT WORKSPACE & PORTALS (/app/*)
    return (
      <AppShell
        activeNav={activeModule}
        onNavigate={(nav) => navigateTo(nav)}
      >
        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
          {renderModule()}
        </React.Suspense>
      </AppShell>
    );
  };

  return (
    <>
      {renderPageContent()}

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


