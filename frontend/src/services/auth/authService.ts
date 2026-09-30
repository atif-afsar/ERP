import { apiClient } from '../api/apiClient';
import { UserProfile } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';

export interface AuthSessionData { user: UserProfile; token?: string; expiresAt?: number; }
function apiFailure<T>(error: any, fallback: string): ServiceResult<T> {
  const status = Number(error?.status) || 0;
  const code = status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN'
    : status === 409 ? 'CONFLICT' : status === 422 ? 'VALIDATION_ERROR'
    : status === 429 ? 'RATE_LIMITED' : 'NETWORK_ERROR';
  return fail(code, error?.message || fallback, error, status || undefined);
}

export const authService = {
  async signIn(email: string, password: string): Promise<ServiceResult<AuthSessionData>> {
    if (!email.trim() || !password) return fail('VALIDATION_ERROR', 'Email and password are required.', null, 422);
    try {
      const response = await apiClient.request<{ user: UserProfile; token: string; expiresAt: number }>(
        '/api/v1/auth/signin', { method: 'POST', body: { email: email.trim().toLowerCase(), password } });
      if (!response.data?.token || !response.data.user) return fail('INTERNAL_ERROR', 'Authentication response was incomplete.');
      apiClient.setAuthToken(response.data.token);
      return ok(response.data);
    } catch (error: any) {
      apiClient.setAuthToken(null);
      return apiFailure(error, 'Unable to sign in.');
    }
  },
  async signUp(): Promise<ServiceResult<UserProfile>> {
    return fail('FORBIDDEN', 'Public account creation is disabled. Contact an institution administrator.', null, 403);
  },
  async signOut(): Promise<ServiceResult<boolean>> {
    try { await apiClient.request('/api/v1/auth/signout', { method: 'POST' }); return ok(true); }
    catch (error: any) { return apiFailure(error, 'Unable to revoke the session.'); }
    finally { apiClient.setAuthToken(null); }
  },
  async resetPassword(): Promise<ServiceResult<boolean>> {
    return fail('NOT_FOUND', 'Password reset is not available yet. Contact an administrator.', null, 501);
  },
  async updatePassword(oldPassword: string, newPassword: string): Promise<ServiceResult<boolean>> {
    if (newPassword.length < 8) return fail('VALIDATION_ERROR', 'Password must be at least 8 characters long.', null, 422);
    try {
      await apiClient.request('/api/v1/auth/password', { method: 'POST', body: { oldPassword, newPassword } });
      apiClient.setAuthToken(null);
      return ok(true);
    } catch (error: any) { return apiFailure(error, 'Unable to change password.'); }
  },
  async restoreSession(): Promise<ServiceResult<AuthSessionData | null>> {
    const token = apiClient.getAuthToken();
    if (!token) return ok(null);
    try {
      const response = await apiClient.request<{ user: UserProfile; expiresAt: number }>('/api/v1/auth/me');
      return response.data?.user ? ok({ ...response.data, token }) : fail('INTERNAL_ERROR', 'Session response was incomplete.');
    } catch (error: any) {
      apiClient.setAuthToken(null);
      return apiFailure(error, 'Session could not be restored.');
    }
  },
  onAuthStateChanged(callback: (event: string, session: null) => void) {
    const handler = () => callback('SIGNED_OUT', null);
    window.addEventListener('edunexus_unauthorized', handler);
    return () => window.removeEventListener('edunexus_unauthorized', handler);
  },
};
