import React, { createContext, useContext, useState } from 'react';
import { TenantLabels } from '../types';

export type InstitutionType = 'school' | 'coaching' | 'hybrid';
export type PlanEntitlement = 'qr_attendance';

/** The signed-in user's institution, as returned by GET /auth/me. */
export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  entitlements: PlanEntitlement[];
}

export interface CurrentTenant extends Institution {
  currencySymbol: string;
  institutionLabel: string;
}

interface TenantContextType {
  currentTenant: CurrentTenant;
  getLabel: (key: keyof TenantLabels) => string;
  isSchool: boolean;
  isCoaching: boolean;
  /** True when the institution's active plan unlocks a paid feature. */
  hasEntitlement: (entitlement: PlanEntitlement) => boolean;
  activateAuthenticatedTenant: (institution: Institution | null, fallbackTenantId?: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const EMPTY: Institution = { id: '', name: '', type: 'school', entitlements: [] };

const SCHOOL_LABELS: Record<keyof TenantLabels, string> = {
  group: 'Class', subgroup: 'Section', groupPlural: 'Classes', student: 'Student', studentPlural: 'Students',
  staff: 'Staff', staffPlural: 'Staff Members', admission: 'Admission', period: 'Academic Year', exam: 'Exam',
  examPlural: 'Exams', reportCard: 'Report Card', homework: 'Homework', feeStructure: 'Fee Structure',
};
const COACHING_LABELS: Record<keyof TenantLabels, string> = {
  ...SCHOOL_LABELS, group: 'Course', subgroup: 'Batch', groupPlural: 'Courses', period: 'Session',
  exam: 'Test', examPlural: 'Tests', admission: 'Enrollment',
};
const INSTITUTION_LABELS: Record<InstitutionType, string> = { school: 'School', coaching: 'Coaching', hybrid: 'School + Coaching' };

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [institution, setInstitution] = useState<Institution>(EMPTY);

  const activateAuthenticatedTenant = (next: Institution | null, fallbackTenantId?: string) => {
    setInstitution(next ? { ...next, entitlements: next.entitlements || [] } : { ...EMPTY, id: fallbackTenantId || '' });
  };

  const isCoaching = institution.type === 'coaching';
  const labels = isCoaching ? COACHING_LABELS : SCHOOL_LABELS;
  const currentTenant: CurrentTenant = {
    ...institution,
    currencySymbol: '₹',
    institutionLabel: INSTITUTION_LABELS[institution.type] || 'School',
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        getLabel: key => labels[key] || String(key),
        isSchool: !isCoaching,
        isCoaching,
        hasEntitlement: entitlement => institution.entitlements.includes(entitlement),
        activateAuthenticatedTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
