import React from 'react';
import { AlertCircle, RefreshCw, FolderSearch, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { NormalizedError } from '../../services/api/errorHandler';

interface ResourceStateProps {
  isLoading: boolean;
  error?: NormalizedError | string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  loadingMessage?: string;
  children: React.ReactNode;
}

export const ResourceState: React.FC<ResourceStateProps> = ({
  isLoading,
  error,
  isEmpty,
  emptyTitle = 'No Records Found',
  emptyDescription = 'There are no items to display matching the current criteria.',
  emptyAction,
  onRetry,
  loadingMessage = 'Loading records...',
  children,
}) => {
  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-slate-800 animate-pulse">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-mono">{loadingMessage}</p>
      </div>
    );
  }

  // 2. Error State (Normalized with Retry)
  if (error) {
    const errorMsg = typeof error === 'string' ? error : error.userMessage;
    const errorCode = typeof error === 'string' ? 'ERROR' : error.code;
    const requestId = typeof error === 'string' ? undefined : error.requestId;

    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-rose-500/30 bg-rose-500/5 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] font-mono border border-rose-500/20 mb-2">
          {errorCode}
        </span>
        <h4 className="font-bold text-white text-sm">Failed to Load Content</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{errorMsg}</p>
        {requestId && (
          <p className="text-[10px] text-slate-500 font-mono mt-1">Ref: {requestId}</p>
        )}

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-4 text-sky-300 border-sky-500/30 hover:bg-sky-500/10"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Request
          </Button>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (isEmpty) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-slate-800/80 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mb-3">
          <FolderSearch className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-white text-sm">{emptyTitle}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{emptyDescription}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  // 4. Success State (Render Children)
  return <>{children}</>;
};
