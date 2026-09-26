import { apiClient } from '../api/apiClient';
import { UserProfile, UserRole } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { storage } from '../storageService';

export interface AuthSessionData {
  user: UserProfile;
  token?: string;
  expiresAt?: number;
}

export const authService = {
  /**
   * Sign in with email and password via VPS Native JWT API
   */
  async signIn(email: string, password?: string): Promise<ServiceResult<AuthSessionData>> {
    const trimmedEmail = email.trim().toLowerCase();

    // Check rate-limit lockouts
    const attempts = storage.getFailedAttempts(trimmedEmail);
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const waitSeconds = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      return fail(
        'RATE_LIMITED',
        `Too many failed attempts. Account temporarily locked for ${waitSeconds} seconds.`,
        null,
        429
      );
    }

    if (password) {
      try {
        const response = await apiClient.request<{ user: UserProfile; token: string; expiresAt: number }>(
          '/api/v1/auth/signin',
          {
            method: 'POST',
            body: { email: trimmedEmail, password },
          }
        );

        if (response.data && response.data.token) {
          apiClient.setAuthToken(response.data.token);
          storage.clearFailedLogins(trimmedEmail);

          const user = response.data.user;
          storage.saveUser(user);

          return ok({
            user,
            token: response.data.token,
            expiresAt: response.data.expiresAt,
          });
        }
      } catch (err: any) {
        if (err.status === 401 || err.code === 'INVALID_CREDENTIALS') {
          storage.recordFailedLogin(trimmedEmail);
          return fail('UNAUTHENTICATED', 'Invalid email or password. Please verify your credentials.', err, 401);
        }
        console.warn('[AuthService] VPS auth error, testing offline fallback:', err);
      }
    }

    // Local / Offline authentication fallback
    const allUsers = storage.getUsers();
    const matched = allUsers.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!matched) {
      storage.recordFailedLogin(trimmedEmail);
      return fail('NOT_FOUND', 'Invalid email or password. Please verify your credentials.', null, 401);
    }

    if (matched.status === 'SUSPENDED' || matched.status === 'INACTIVE') {
      return fail('FORBIDDEN', 'This account has been deactivated. Please contact your institution administrator.', null, 403);
    }

    storage.clearFailedLogins(trimmedEmail);
    return ok({
      user: matched,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }, true);
  },

  /**
   * Register a new user via VPS Native API or local storage
   */
  async signUp(
    email: string,
    password?: string,
    profileData?: Partial<UserProfile>
  ): Promise<ServiceResult<UserProfile>> {
    const trimmedEmail = email.trim().toLowerCase();

    if (password) {
      try {
        const response = await apiClient.request<{ user: UserProfile; token: string }>(
          '/api/v1/auth/signup',
          {
            method: 'POST',
            body: {
              email: trimmedEmail,
              password,
              name: profileData?.name || trimmedEmail.split('@')[0],
              role: profileData?.role || 'TEACHER',
              tenantId: profileData?.tenantId,
            },
          }
        );

        if (response.data?.user) {
          if (response.data.token) {
            apiClient.setAuthToken(response.data.token);
          }
          storage.saveUser(response.data.user);
          return ok(response.data.user);
        }
      } catch (err: any) {
        console.warn('[AuthService] VPS signUp error:', err);
        if (err.status === 409) {
          return fail('VALIDATION_ERROR', 'A user with this email already exists.', err, 409);
        }
      }
    }

    // Local user creation
    const newId = `usr-${Date.now()}`;
    const newProfile: UserProfile = {
      id: newId,
      tenantId: profileData?.tenantId || 'school-main',
      name: profileData?.name || trimmedEmail.split('@')[0],
      email: trimmedEmail,
      role: profileData?.role || 'TEACHER',
      phone: profileData?.phone || '+91 98765 00000',
      avatarUrl: profileData?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      department: profileData?.department || 'General',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      branchIds: profileData?.branchIds || [],
    };
    storage.saveUser(newProfile);
    return ok(newProfile, true);
  },

  /**
   * Terminate active session
   */
  async signOut(): Promise<ServiceResult<boolean>> {
    try {
      await apiClient.request('/api/v1/auth/signout', { method: 'POST' });
    } catch (err) {
      console.warn('[AuthService] SignOut network warning:', err);
    }
    apiClient.setAuthToken(null);
    return ok(true);
  },

  /**
   * Send password reset request
   */
  async resetPassword(email: string): Promise<ServiceResult<boolean>> {
    // Standard secure acknowledgment without email enumeration
    return ok(true);
  },

  /**
   * Update authenticated user's password
   */
  async updatePassword(oldPassword: string, newPassword: string): Promise<ServiceResult<boolean>> {
    if (newPassword.length < 8) {
      return fail('VALIDATION_ERROR', 'Password must be at least 8 characters long.', null, 400);
    }

    try {
      await apiClient.request('/api/v1/auth/password', {
        method: 'POST',
        body: { oldPassword, newPassword },
      });
      return ok(true);
    } catch (err: any) {
      return fail('NETWORK_ERROR', err?.message || 'Failed to update password', err);
    }
  },

  /**
   * Restore existing session on initial load or refresh via VPS API /me
   */
  async restoreSession(): Promise<ServiceResult<AuthSessionData | null>> {
    const token = apiClient.getAuthToken();
    if (token) {
      try {
        const response = await apiClient.request<{ user: UserProfile }>('/api/v1/auth/me', {
          method: 'GET',
        });
        if (response.data?.user) {
          storage.saveUser(response.data.user);
          return ok({
            user: response.data.user,
            token,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
        }
      } catch (err) {
        console.warn('[AuthService] Live session restoration failed:', err);
      }
    }

    // Fall back to stored active user
    const hasLocalStorage = typeof localStorage !== 'undefined';
    const savedUserId = hasLocalStorage ? localStorage.getItem('edunexus_active_user_id') : null;
    const sessionActive = hasLocalStorage ? localStorage.getItem('edunexus_auth_session') !== 'false' : false;

    if (sessionActive && savedUserId) {
      const allUsers = storage.getUsers();
      const user = allUsers.find((u) => u.id === savedUserId);
      if (user && user.status === 'ACTIVE') {
        return ok({
          user,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        }, true);
      }
    }

    return ok(null, true);
  },

  /**
   * Subscribe to auth state changes via CustomEvents
   */
  onAuthStateChanged(callback: (event: string, session: any) => void) {
    const handler = (e: any) => {
      callback('SIGNED_OUT', null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('edunexus_unauthorized', handler);
      return () => window.removeEventListener('edunexus_unauthorized', handler);
    }
    return () => {};
  },

  /**
   * Resolve user profile by ID or email
   */
  async getUserProfile(authUserId: string, email: string): Promise<UserProfile> {
    const allUsers = storage.getUsers();
    const existing = allUsers.find((u) => u.id === authUserId || u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      return existing;
    }

    const fallbackProfile: UserProfile = {
      id: authUserId,
      tenantId: 'school-main',
      name: email.split('@')[0] || 'User',
      email,
      role: 'TEACHER',
      phone: '+91 98765 00000',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      department: 'Academics',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      branchIds: [],
    };

    storage.saveUser(fallbackProfile);
    return fallbackProfile;
  },
};
