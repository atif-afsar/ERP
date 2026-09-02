import React, { createContext, useContext, useState, useEffect } from 'react';
import { TenantConfig, TenantLabels, TenantFeatureFlags, TenantType, Branch } from '../types';
import { storage } from '../services/storageService';

interface TenantContextType {
  currentTenant: TenantConfig;
  allTenants: TenantConfig[];
  switchTenant: (tenantId: string) => void;
  updateCurrentTenant: (updates: Partial<TenantConfig>) => void;
  branches: Branch[];
  currentBranch: Branch | null;
  switchBranch: (branchId: string) => void;
  getLabel: (key: keyof TenantLabels) => string;
  isFeatureEnabled: (feature: keyof TenantFeatureFlags) => boolean;
  isSchool: boolean;
  isCoaching: boolean;
  toggleFeature: (feature: keyof TenantFeatureFlags) => void;
  createNewTenant: (newTenant: TenantConfig) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allTenants, setAllTenants] = useState<TenantConfig[]>(() => storage.getTenants());
  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    const savedId = localStorage.getItem('edunexus_active_tenant_id');
    return savedId || allTenants[0]?.id || 'tenant-school-1';
  });

  const [allBranches, setAllBranches] = useState<Branch[]>(() => storage.getBranches());
  const currentTenantBranches = allBranches.filter((b) => b.tenantId === currentTenantId);

  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    const savedBranch = localStorage.getItem('edunexus_active_branch_id');
    return savedBranch || currentTenantBranches.find((b) => b.isMain)?.id || currentTenantBranches[0]?.id || '';
  });

  const currentTenant = allTenants.find((t) => t.id === currentTenantId) || allTenants[0];

  useEffect(() => {
    localStorage.setItem('edunexus_active_tenant_id', currentTenantId);
    // Reset or update branch when tenant changes
    const tenantBranches = allBranches.filter((b) => b.tenantId === currentTenantId);
    const mainBranch = tenantBranches.find((b) => b.isMain) || tenantBranches[0];
    if (mainBranch) {
      setCurrentBranchId(mainBranch.id);
      localStorage.setItem('edunexus_active_branch_id', mainBranch.id);
    }
  }, [currentTenantId]);

  const currentBranch = currentTenantBranches.find((b) => b.id === currentBranchId) || currentTenantBranches[0] || null;

  const switchTenant = (tenantId: string) => {
    const found = allTenants.find((t) => t.id === tenantId);
    if (found) {
      setCurrentTenantId(tenantId);
    }
  };

  const switchBranch = (branchId: string) => {
    const found = currentTenantBranches.find((b) => b.id === branchId);
    if (found) {
      setCurrentBranchId(branchId);
      localStorage.setItem('edunexus_active_branch_id', branchId);
    }
  };

  const updateCurrentTenant = (updates: Partial<TenantConfig>) => {
    const updated = { ...currentTenant, ...updates };
    const newTenants = allTenants.map((t) => (t.id === updated.id ? updated : t));
    setAllTenants(newTenants);
    storage.saveTenants(newTenants);
  };

  const toggleFeature = (feature: keyof TenantFeatureFlags) => {
    const updatedFeatures = {
      ...currentTenant.features,
      [feature]: !currentTenant.features[feature],
    };
    updateCurrentTenant({ features: updatedFeatures });
  };

  const createNewTenant = (newTenant: TenantConfig) => {
    const updatedTenants = [...allTenants, newTenant];
    setAllTenants(updatedTenants);
    storage.saveTenants(updatedTenants);
    setCurrentTenantId(newTenant.id);
  };

  const getLabel = (key: keyof TenantLabels): string => {
    if (currentTenant?.labels && currentTenant.labels[key]) {
      return currentTenant.labels[key];
    }
    // Fallbacks
    const defaults: Record<keyof TenantLabels, string> = {
      group: 'Class/Batch',
      subgroup: 'Section',
      groupPlural: 'Classes/Batches',
      student: 'Student',
      studentPlural: 'Students',
      staff: 'Staff',
      staffPlural: 'Staff Members',
      admission: 'Admission',
      period: 'Academic Session',
      exam: 'Exam',
      examPlural: 'Exams',
      reportCard: 'Report Card',
      homework: 'Homework',
      feeStructure: 'Fee Structure',
    };
    return defaults[key] || String(key);
  };

  const isFeatureEnabled = (feature: keyof TenantFeatureFlags): boolean => {
    return !!currentTenant?.features?.[feature];
  };

  const isSchool = currentTenant?.tenantType === 'SCHOOL';
  const isCoaching = currentTenant?.tenantType === 'COACHING';

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        allTenants,
        switchTenant,
        updateCurrentTenant,
        branches: currentTenantBranches,
        currentBranch,
        switchBranch,
        getLabel,
        isFeatureEnabled,
        isSchool,
        isCoaching,
        toggleFeature,
        createNewTenant,
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
