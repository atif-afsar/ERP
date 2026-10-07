import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Building, 
  MapPin, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { currentUser, changePassword } = useAuth();
  const { currentTenant, currentBranch } = useTenant();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword.length < 8) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Password updated successfully! Your new password is now active.' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update password. Please check your current password.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleDisplayName = currentUser.role.replace(/_/g, ' ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile & Security"
      subtitle="View your account information and manage institutional session credentials"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Tab switch */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Account Overview
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('security'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Password & Security
          </button>
        </div>

        {/* Tab 1: Profile Overview */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Header Identity Badge */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">{currentUser.name}</h3>
                <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {currentUser.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800">
                    {roleDisplayName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Active Session
                  </span>
                </div>
              </div>
            </div>

            {/* Institutional Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Institution / School
                </p>
                <p className="font-semibold text-slate-800 truncate">{currentTenant.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">ID: {currentTenant.id}</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Campus Branch
                </p>
                <p className="font-semibold text-slate-800 truncate">{currentBranch?.name || 'Main Campus'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Session 2026–27</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Security Clearance
                </p>
                <p className="font-semibold text-slate-800">
                  {currentUser.role === 'SUPER_ADMIN' ? 'Global Platform Access' : 'Tenant Workspace Scoped'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {currentUser.role === 'SUPER_ADMIN' ? 'Full Authority' : 'Strict RBAC Enforced'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Authentication Status
                </p>
                <p className="font-semibold text-slate-800">Bearer JWT Authenticated</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Expires in 7 days</p>
              </div>
            </div>

            {/* School Owner quick link */}
            {currentUser.role === 'TENANT_ADMIN' && onNavigate && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-900">School Profile & Master Data</p>
                  <p className="text-[11px] text-emerald-700">Configure Springfield Academy's profile, years, and branches.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onNavigate('app/master-data');
                  }}
                >
                  Manage Master Data
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {statusMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Passwords should contain at least 8 characters. For local testing accounts, passwords can be updated instantly without affecting database connectivity.
            </p>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        )}

        <div className="border-t border-slate-100 pt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
