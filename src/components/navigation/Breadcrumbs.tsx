import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export interface BreadcrumbItem {
  id: string;
  label: string;
  navTarget?: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  activeNav: string;
  subTitle?: string;
  onNavigate: (navId: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeNav,
  subTitle,
  onNavigate,
}) => {
  const { getLabel, isSchool } = useTenant();

  const getNavLabel = (nav: string): string => {
    switch (nav) {
      case 'dashboard':
      case 'superadmin-dashboard':
        return 'Dashboard';
      case 'students':
        return getLabel('studentPlural');
      case 'academics':
        return getLabel('groupPlural');
      case 'attendance':
        return 'Attendance & QR';
      case 'fees':
        return 'Fees & Finance';
      case 'exams':
        return getLabel('examPlural');
      case 'timetable':
        return 'Timetable';
      case 'homework':
        return getLabel('homework');
      case 'communication':
        return 'Notices & WhatsApp';
      case 'crm':
        return isSchool ? 'Admission Inquiries' : 'Lead CRM';
      case 'reports':
        return 'Reports & Analytics';
      case 'settings':
      case 'superadmin-features':
        return 'Settings';
      case 'superadmin-tenants':
        return 'Tenants & Institutions';
      case 'superadmin-plans':
        return 'Subscription Plans';
      default:
        return nav.charAt(0).toUpperCase() + nav.slice(1);
    }
  };

  if (activeNav === 'dashboard' && !subTitle) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 px-1">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-1 hover:text-sky-400 transition-colors p-1 rounded-md hover:bg-slate-800/50"
        title="Go to Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline font-medium">Home</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

      {subTitle ? (
        <>
          <button
            onClick={() => onNavigate(activeNav)}
            className="hover:text-sky-400 transition-colors p-1 rounded-md hover:bg-slate-800/50 font-medium"
          >
            {getNavLabel(activeNav)}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="text-sky-300 font-semibold truncate max-w-xs">{subTitle}</span>
        </>
      ) : (
        <span className="text-slate-200 font-semibold">{getNavLabel(activeNav)}</span>
      )}
    </nav>
  );
};
