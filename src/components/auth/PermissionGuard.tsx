import React from 'react';
import { Permission } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../ui/Button';

interface PermissionGuardProps {
  permission: Permission;
  resourceId?: string;
  fallback?: React.ReactNode;
  showUnauthorizedState?: boolean;
  onBackToDashboard?: () => void;
  children: React.ReactNode;
}

export const UnauthorizedCard: React.FC<{
  permission: Permission;
  onBackToDashboard?: () => void;
}> = ({ permission, onBackToDashboard }) => {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl animate-fade-in max-w-2xl mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-lg shadow-rose-500/5">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20 mb-3">
        HTTP 403 • Forbidden
      </span>
      <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
      <p className="text-slate-400 max-w-md text-sm mb-4">
        Your active role (<span className="text-sky-400 font-semibold">{currentUser.role.replace('_', ' ')}</span>) lacks the permission required to access this resource.
      </p>
      
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-400 mb-6 flex items-center gap-2">
        <Lock className="w-4 h-4 text-amber-400" />
        <span>Required Permission: </span>
        <code className="text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{permission}</code>
      </div>

      {onBackToDashboard && (
        <Button
          variant="primary"
          onClick={onBackToDashboard}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Return to Dashboard
        </Button>
      )}
    </div>
  );
};

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  resourceId,
  fallback = null,
  showUnauthorizedState = false,
  onBackToDashboard,
  children,
}) => {
  const { can } = useAuth();

  const isAuthorized = can(permission, resourceId);

  if (!isAuthorized) {
    if (showUnauthorizedState) {
      return (
        <UnauthorizedCard
          permission={permission}
          onBackToDashboard={onBackToDashboard}
        />
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
