import React from 'react';
import { AlertCircle, RefreshCw, Inbox, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { AppError } from '../../types/serviceResult';

interface DataStateWrapperProps {
  isLoading?: boolean;
  error?: AppError | string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  onRetry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
}

export const DataStateWrapper: React.FC<DataStateWrapperProps> = ({
  isLoading,
  error,
  isEmpty,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data to display for this section.',
  emptyAction,
  onRetry,
  children,
  loadingMessage = 'Fetching verified records...',
}) => {
  // 1. Loading State
  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs animate-fade-in my-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 tracking-tight">{loadingMessage}</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Connecting to database and validating tenant isolation policies.
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    const errorMsg = typeof error === 'string' ? error : error.message || 'An unexpected error occurred.';
    const errorCode = typeof error === 'string' ? 'ERROR' : error.code;

    return (
      <div className="p-6 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 shadow-xs animate-fade-in my-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-rose-900">Query Failed</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-200/70 text-rose-800 font-bold">
                {errorCode}
              </span>
            </div>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">{errorMsg}</p>
            {onRetry && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={onRetry}
                  className="bg-white hover:bg-rose-100 text-rose-800 border-rose-300"
                >
                  Retry Request
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State
  if (isEmpty) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs animate-fade-in my-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 tracking-tight">{emptyTitle}</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{emptyDescription}</p>
        {emptyAction && (
          <div className="mt-4">
            <Button
              variant="primary"
              size="sm"
              leftIcon={emptyAction.icon}
              onClick={emptyAction.onClick}
              className="bg-emerald-600 hover:bg-emerald-500 shadow-xs text-white"
            >
              {emptyAction.label}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 4. Normal Render
  return <>{children}</>;
};
