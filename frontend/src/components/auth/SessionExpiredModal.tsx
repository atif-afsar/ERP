import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Clock, ShieldAlert, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onRenewSession: () => void;
  onRedirectToLogin: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onRenewSession,
  onRedirectToLogin,
}) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(30);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRedirectToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onRedirectToLogin]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onRedirectToLogin}
      title="Session Timeout Notice"
      maxWidth="sm"
    >
      <div className="text-center py-3 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <div>
          <h4 className="font-bold text-white text-base">Your Active Session Has Expired</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            To protect institutional data and tenant privacy, your session has timed out due to inactivity.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-mono">
          Auto-redirecting to login in <span className="text-amber-400 font-bold">{countdown}s</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            size="sm"
            onClick={onRedirectToLogin}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Sign In Again
          </Button>
          <Button
            variant="primary"
            className="flex-1 justify-center"
            size="sm"
            onClick={onRenewSession}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Renew Session
          </Button>
        </div>
      </div>
    </Modal>
  );
};
