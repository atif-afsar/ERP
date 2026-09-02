import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, Permission, AuthState, UserInvitation, AuditLog } from '../types';
import { storage } from '../services/storageService';
import { useTenant } from './TenantContext';

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
  loginWithCredentials: (email: string, password?: string) => LoginResult;
  logout: () => void;
  logoutAllDevices: () => void;
  expireSessionSimulator: () => void;
  forgotPassword: (email: string) => { success: boolean; message: string };
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; error?: string };
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
  const { currentTenant } = useTenant();
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => storage.getUsers());

  // Auth State Machine
  const [authState, setAuthState] = useState<AuthState>('UNKNOWN');

  // Find active user
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('edunexus_active_user_id');
    if (saved) return saved;
    const tenantUser = allUsers.find((u) => u.tenantId === currentTenant?.id && u.role === 'TENANT_ADMIN');
    return tenantUser?.id || allUsers[0]?.id || 'user-school-admin';
  });

  // Session state initialization (Zero Flicker)
  useEffect(() => {
    const sessionActive = localStorage.getItem('edunexus_auth_session') !== 'false';
    if (sessionActive) {
      if (currentTenant.status === 'suspended') {
        setAuthState('TENANT_SUSPENDED');
      } else {
        setAuthState('AUTHENTICATED');
      }
    } else {
      setAuthState('UNAUTHENTICATED');
    }
  }, [currentTenant.status]);

  // When tenant changes, ensure user matches tenant if not SuperAdmin
  useEffect(() => {
    const user = allUsers.find((u) => u.id === currentUserId);
    if (user && user.role !== 'SUPER_ADMIN' && user.tenantId !== currentTenant.id) {
      const matchingUser = allUsers.find((u) => u.tenantId === currentTenant.id && u.role === 'TENANT_ADMIN') 
        || allUsers.find((u) => u.tenantId === currentTenant.id)
        || allUsers[0];
      if (matchingUser) {
        setCurrentUserId(matchingUser.id);
      }
    }
  }, [currentTenant.id]);

  const currentUser = allUsers.find((u) => u.id === currentUserId) || allUsers[0];

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
    storage.saveAuditLog(log);
  };

  const switchUser = (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUserId(userId);
      localStorage.setItem('edunexus_active_user_id', userId);
      setAuthState('AUTHENTICATED');
      localStorage.setItem('edunexus_auth_session', 'true');
    }
  };

  const login = (userId: string) => {
    switchUser(userId);
    logSecurityEvent('LOGIN_SUCCESS', `User signed in successfully via 1-click preset.`);
  };

  const loginWithCredentials = (email: string, password = ''): LoginResult => {
    const trimmedEmail = email.trim().toLowerCase();
    const attempts = storage.getFailedAttempts(trimmedEmail);

    // Check rate limit lockout
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const remainingSeconds = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      return {
        success: false,
        error: `Too many failed attempts. Account temporarily locked for ${remainingSeconds}s.`,
        lockedUntil: attempts.lockedUntil,
      };
    }

    const matchedUser = allUsers.find((u) => u.email.toLowerCase() === trimmedEmail);

    // Anti-enumeration: Generic invalid credentials error if user doesn't exist
    if (!matchedUser) {
      const updated = storage.recordFailedLogin(trimmedEmail);
      logSecurityEvent('LOGIN_FAILED', `Failed login attempt for ${trimmedEmail} (Invalid credentials)`, 'FAILED');
      return {
        success: false,
        error: 'Invalid email or password. Please verify your credentials.',
        lockedUntil: updated.lockedUntil,
      };
    }

    // Check account status
    if (matchedUser.status === 'SUSPENDED' || matchedUser.status === 'INACTIVE') {
      logSecurityEvent('LOGIN_BLOCKED', `Blocked login attempt for deactivated user: ${matchedUser.email}`, 'DENIED');
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your institution administrator.',
      };
    }

    // Successful login
    storage.clearFailedLogins(trimmedEmail);
    switchUser(matchedUser.id);
    logSecurityEvent('LOGIN_SUCCESS', `User ${matchedUser.name} (${matchedUser.email}) authenticated.`);
    return { success: true };
  };

  const logout = () => {
    logSecurityEvent('LOGOUT', `User ${currentUser.name} logged out.`);
    setAuthState('UNAUTHENTICATED');
    localStorage.setItem('edunexus_auth_session', 'false');
  };

  const logoutAllDevices = () => {
    storage.revokeAllSessions(currentUser.id);
    logSecurityEvent('LOGOUT_ALL_DEVICES', `Revoked all active sessions for ${currentUser.email}.`);
    logout();
  };

  const expireSessionSimulator = () => {
    setAuthState('SESSION_EXPIRED');
    localStorage.setItem('edunexus_auth_session', 'false');
    logSecurityEvent('SESSION_EXPIRED', `Session expired for ${currentUser.email}.`, 'FAILED');
  };

  const forgotPassword = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    logSecurityEvent('PASSWORD_RESET_REQUEST', `Password reset token requested for ${trimmed}`);
    // Anti-enumeration generic response
    return {
      success: true,
      message: 'If an account matches those details, instructions and a verification code have been dispatched.',
    };
  };

  const changePassword = (oldPassword: string, newPassword: string) => {
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
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
    storage.saveInvitation(newInvitation);
    logSecurityEvent('USER_INVITED', `Invited ${name} (${email}) as ${role}`);
    return { success: true, invitation: newInvitation };
  };

  const switchRole = (role: UserRole) => {
    if (role === 'SUPER_ADMIN') {
      const su = allUsers.find((u) => u.role === 'SUPER_ADMIN');
      if (su) switchUser(su.id);
      return;
    }
    const matched = allUsers.find((u) => u.tenantId === currentTenant.id && u.role === role);
    if (matched) {
      switchUser(matched.id);
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return roles.includes(currentUser.role);
  };

  const can = (permission: Permission, resourceId?: string, branchId?: string): boolean => {
    if (currentUser.role === 'SUPER_ADMIN') return true;

    const allowedPermissions = ROLE_PERMISSIONS[currentUser.role] || [];
    if (!allowedPermissions.includes(permission)) return false;

    // Branch Scoping check
    if (branchId && currentUser.branchIds && currentUser.branchIds.length > 0) {
      if (!currentUser.branchIds.includes(branchId)) return false;
    }

    // Relationship-specific scoping
    if (currentUser.role === 'PARENT' && resourceId) {
      return (currentUser.linkedStudentIds || []).includes(resourceId);
    }

    if (currentUser.role === 'STUDENT' && resourceId) {
      return currentUser.studentId === resourceId;
    }

    if (currentUser.role === 'TEACHER' && resourceId && currentUser.assignedGroupIds) {
      return currentUser.assignedGroupIds.includes(resourceId);
    }

    return true;
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
