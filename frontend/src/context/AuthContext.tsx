import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, Permission, AuthState, UserInvitation, AuditLog } from '../types';
import { useTenant } from './TenantContext';
import { authService, rbacService } from '../services/auth';

interface LoginResult {
  success: boolean;
  error?: string;
  lockedUntil?: number;
}

interface AuthContextType {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  authState: AuthState;
  isAuthenticated: boolean;
  login: (userId: string) => void;
  loginWithCredentials: (email: string, password?: string) => Promise<LoginResult> | LoginResult;
  logout: () => void;
  logoutAllDevices: () => void;
  expireSessionSimulator: () => void;
  forgotPassword: (email: string) => { success: boolean; message: string };
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  inviteUser: (email: string, name: string, role: UserRole, branchId?: string) => { success: boolean; invitation?: UserInvitation };
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  hasRole: (roles: UserRole[]) => boolean;
  can: (permission: Permission, resourceId?: string, branchId?: string) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isAccountant: boolean;
  isStaff: boolean;
  isParent: boolean;
  isStudent: boolean;
  
  // For Parent role with multiple children
  activeStudentId: string | null;
  setActiveStudentId: (studentId: string) => void;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'tenants.manage',
    'subscriptions.manage',
    'users.manage',
    'roles.manage',
    'settings.view',
    'settings.update',
    'students.view',
    'students.create',
    'students.update',
    'students.delete',
    'attendance.view',
    'attendance.mark',
    'attendance.create',
    'attendance.update',
    'fees.view',
    'fees.create',
    'fees.update',
    'fees.export',
    'payments.view',
    'payments.record',
    'payments.create',
    'payments.refund',
    'exams.view',
    'exams.create',
    'exams.update',
    'exams.publish',
    'results.view',
    'results.create',
    'results.publish',
    'homework.view',
    'homework.create',
    'homework.update',
    'timetable.view',
    'timetable.manage',
    'communication.send',
    'announcements.view',
    'announcements.create',
    'reports.view',
    'audit.view',
    'documents.view',
  ],
  TENANT_ADMIN: [
    'users.manage',
    'roles.manage',
    'settings.view',
    'settings.update',
    'students.view',
    'students.create',
    'students.update',
    'students.delete',
    'attendance.view',
    'attendance.mark',
    'attendance.create',
    'attendance.update',
    'fees.view',
    'fees.create',
    'fees.update',
    'fees.export',
    'payments.view',
    'payments.record',
    'payments.create',
    'payments.refund',
    'exams.view',
    'exams.create',
    'exams.update',
    'exams.publish',
    'results.view',
    'results.create',
    'results.publish',
    'homework.view',
    'homework.create',
    'homework.update',
    'timetable.view',
    'timetable.manage',
    'communication.send',
    'announcements.view',
    'announcements.create',
    'reports.view',
    'audit.view',
    'documents.view',
    'staff.read',
    'staff.create',
    'staff.update',
    'staff.manage',
    'inventory.view',
    'inventory.manage',
    'library.view',
    'transport.view',
    'hostel.view',
    'mess.view',
    'health.view',
  ],
  BRANCH_MANAGER: [
    'students.view',
    'students.create',
    'students.update',
    'students.delete',
    'attendance.view',
    'attendance.mark',
    'attendance.create',
    'attendance.update',
    'attendance.correct',
    'fees.view',
    'fees.create',
    'fees.update',
    'payments.view',
    'payments.record',
    'payments.create',
    'exams.view',
    'exams.create',
    'exams.update',
    'results.view',
    'results.create',
    'results.publish',
    'homework.view',
    'homework.create',
    'homework.update',
    'timetable.view',
    'timetable.manage',
    'communication.send',
    'announcements.view',
    'announcements.create',
    'reports.view',
    'documents.view',
  ],
  TEACHER: [
    'students.view',
    'attendance.view',
    'attendance.mark',
    'attendance.create',
    'attendance.update',
    'exams.view',
    'exams.update',
    'results.view',
    'results.create',
    'homework.view',
    'homework.create',
    'homework.update',
    'timetable.view',
    'communication.send',
    'announcements.view',
    'documents.view',
  ],
  ACCOUNTANT: [
    'students.view',
    'fees.view',
    'fees.create',
    'fees.update',
    'fees.export',
    'payments.view',
    'payments.record',
    'payments.create',
    'payments.refund',
    'reports.view',
    'announcements.view',
  ],
  RECEPTIONIST: [
    'students.view',
    'students.create',
    'students.update',
    'attendance.view',
    'fees.view',
    'payments.view',
    'payments.record',
    'payments.create',
    'communication.send',
    'announcements.view',
  ],
  STAFF: [
    'students.view',
    'students.create',
    'attendance.view',
    'attendance.mark',
    'fees.view',
    'payments.view',
    'payments.record',
    'communication.send',
    'announcements.view',
  ],
  PARENT: [
    'students.view',
    'attendance.view',
    'fees.view',
    'payments.view',
    'payments.record',
    'exams.view',
    'results.view',
    'homework.view',
    'timetable.view',
    'announcements.view',
    'documents.view',
  ],
  STUDENT: [
    'students.view',
    'attendance.view',
    'fees.view',
    'exams.view',
    'results.view',
    'homework.view',
    'timetable.view',
    'announcements.view',
    'documents.view',
  ],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant, activateAuthenticatedTenant } = useTenant();
  const anonymousUser: UserProfile = {
    id: '', tenantId: '', email: '', name: 'Signed out', phone: '', role: 'STUDENT',
    avatarUrl: '', status: 'INACTIVE', createdAt: '', branchIds: [],
  };
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Auth State Machine
  const [authState, setAuthState] = useState<AuthState>('UNKNOWN');

  // Find active user
  const [currentUserId, setCurrentUserId] = useState('');

  // Session state initialization (Zero Flicker & Live Session Restoration)
  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      const res = await authService.restoreSession();
      if (!isMounted) return;

      if (res.data?.user) {
        activateAuthenticatedTenant(res.data.user.tenantId);
        setAllUsers([res.data.user]);
        setCurrentUserId(res.data.user.id);
        if (currentTenant.status === 'suspended') {
          setAuthState('TENANT_SUSPENDED');
        } else {
          setAuthState('AUTHENTICATED');
        }
      } else {
        setAllUsers([]);
        setCurrentUserId('');
        setAuthState('UNAUTHENTICATED');
      }
    };

    initSession();

    const unsubscribe = authService.onAuthStateChanged((_event, session) => {
      if (_event === 'SIGNED_OUT') {
        if (isMounted) {
          setAllUsers([]);
          setCurrentUserId('');
          setAuthState('UNAUTHENTICATED');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentTenant.status]);

  const currentUser = allUsers.find((u) => u.id === currentUserId) || anonymousUser;

  // Active child for parent portal
  const [activeStudentId, setActiveStudentId] = useState<string | null>(() => {
    return currentUser.linkedStudentIds?.[0] || currentUser.studentId || null;
  });

  useEffect(() => {
    if (currentUser.linkedStudentIds && currentUser.linkedStudentIds.length > 0) {
      setActiveStudentId(currentUser.linkedStudentIds[0]);
    } else if (currentUser.studentId) {
      setActiveStudentId(currentUser.studentId);
    } else {
      setActiveStudentId(null);
    }
  }, [currentUser.id]);

  const logSecurityEvent = (action: string, details: string, status: 'SUCCESS' | 'FAILED' | 'DENIED' = 'SUCCESS') => {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tenantId: currentTenant.id,
      actorId: currentUser?.id || 'anonymous',
      actorName: currentUser?.name || 'Anonymous User',
      actorRole: currentUser?.role || 'GUEST',
      action,
      category: 'AUTHENTICATION',
      entityType: 'UserSession',
      entityId: currentUser?.id || 'unknown',
      details,
      timestamp: new Date().toISOString(),
      status,
      ipAddress: '103.21.124.89 (New Delhi, India)',
    };
    // Server-side audit events will replace this console record when the audit API is migrated.
    console.info('[Security event]', log.action, log.status);
  };

  const switchUser = (userId: string) => {
    console.warn(`Local user switching is disabled (${userId}).`);
  };

  const login = (userId: string) => {
    console.warn(`Preset login is disabled (${userId}).`);
  };

  const loginWithCredentials = async (email: string, password = ''): Promise<LoginResult> => {
    const res = await authService.signIn(email, password);
    if (res.error) {
      logSecurityEvent('LOGIN_FAILED', `Failed login attempt for ${email}: ${res.error.message}`, 'FAILED');
      return {
        success: false,
        error: res.error.message,
      };
    }

    if (res.data?.user) {
      activateAuthenticatedTenant(res.data.user.tenantId);
      setAllUsers([res.data.user]);
      setCurrentUserId(res.data.user.id);
      setAuthState('AUTHENTICATED');
      logSecurityEvent('LOGIN_SUCCESS', `User ${res.data.user.name} (${res.data.user.email}) authenticated.`);
      return { success: true };
    }

    return { success: false, error: 'Authentication failed.' };
  };

  const logout = async () => {
    logSecurityEvent('LOGOUT', `User ${currentUser.name} logged out.`);
    await authService.signOut();
    setAuthState('UNAUTHENTICATED');
    setAllUsers([]);
    setCurrentUserId('');
  };

  const logoutAllDevices = () => {
    logSecurityEvent('LOGOUT_ALL_DEVICES', `Revoked the current token version for ${currentUser.email}.`);
    logout();
  };

  const expireSessionSimulator = () => {
    setAuthState('SESSION_EXPIRED');
    authService.signOut();
    logSecurityEvent('SESSION_EXPIRED', `Session expired for ${currentUser.email}.`, 'FAILED');
  };

  const forgotPassword = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    logSecurityEvent('PASSWORD_RESET_UNAVAILABLE', `Password reset attempted for ${trimmed}`, 'DENIED');
    return {
      success: false,
      message: 'Password reset is not enabled. Contact an institution administrator.',
    };
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }
    const res = await authService.updatePassword(oldPassword, newPassword);
    if (res.error) {
      logSecurityEvent('PASSWORD_CHANGED', `Failed to update password for ${currentUser.email}: ${res.error.message}`, 'FAILED');
      return { success: false, error: res.error.message };
    }
    logSecurityEvent('PASSWORD_CHANGED', `Password updated successfully for ${currentUser.email}`);
    return { success: true };
  };

  const inviteUser = (email: string, name: string, role: UserRole, branchId?: string) => {
    const newInvitation: UserInvitation = {
      id: `invite-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      token: `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };
    logSecurityEvent('USER_INVITE_UNAVAILABLE', `Invite blocked until the invitation API is available for ${email}`, 'DENIED');
    return { success: false, invitation: undefined };
  };

  const switchRole = (role: UserRole) => {
    console.warn(`Local role switching is disabled (${role}).`);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return roles.includes(currentUser.role);
  };

  const can = (permission: Permission, resourceId?: string, branchId?: string): boolean => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    if (currentUser.permissions?.includes(permission)) return true;

    // Direct check against full ROLE_PERMISSIONS matrix
    const directPerms = ROLE_PERMISSIONS[currentUser.role] || [];
    if (directPerms.includes(permission)) {
      return true;
    }

    const result = rbacService.can(currentUser, permission, {
      targetTenantId: currentTenant.id,
      targetStudentId: resourceId,
      targetBranchId: branchId,
    });
    return result.granted;
  };

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isAdmin = currentUser.role === 'TENANT_ADMIN' || isSuperAdmin;
  const isTeacher = currentUser.role === 'TEACHER';
  const isAccountant = currentUser.role === 'ACCOUNTANT';
  const isStaff = currentUser.role === 'STAFF';
  const isParent = currentUser.role === 'PARENT';
  const isStudent = currentUser.role === 'STUDENT';
  const isAuthenticated = authState === 'AUTHENTICATED';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        authState,
        isAuthenticated,
        login,
        loginWithCredentials,
        logout,
        logoutAllDevices,
        expireSessionSimulator,
        forgotPassword,
        changePassword,
        inviteUser,
        switchUser,
        switchRole,
        hasRole,
        can,
        isSuperAdmin,
        isAdmin,
        isTeacher,
        isAccountant,
        isStaff,
        isParent,
        isStudent,
        activeStudentId,
        setActiveStudentId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
