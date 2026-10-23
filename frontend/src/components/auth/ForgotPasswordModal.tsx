import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Mail, MailCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth/authService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sends a reset link by email. The link opens #/reset-password (ResetPasswordView).
export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await authService.forgotPassword(email);
    setSubmitting(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setStep('sent');
  };

  const handleClose = () => {
    setStep('request');
    setEmail('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={step === 'sent' ? 'Check your email' : 'Reset your password'} maxWidth="md">
      <div className="space-y-4 py-2">
        {step === 'request' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500">
              Enter the email address you sign in with. If it matches an account, we'll email you a link to set a new password. The link works for 15 minutes.
            </p>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </div>
          </form>
        )}

        {step === 'sent' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <MailCheck className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-700 max-w-sm mx-auto">
              If <strong>{email}</strong> belongs to an account, a reset link is on its way. Check your inbox and spam folder.
            </p>
            <Button variant="primary" size="sm" className="mx-auto" onClick={handleClose}>Back to sign in</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
