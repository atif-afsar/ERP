import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  requestId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    requestId: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      requestId: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleGoDashboard = () => {
    this.handleReset();
    window.location.hash = '#/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 animate-fade-in">
          <div className="max-w-xl w-full p-8 rounded-3xl bg-white border border-rose-200 shadow-xs text-center space-y-6">

            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200 font-mono">
                Component Recovery Boundary
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-3">
                {this.props.fallbackTitle || 'Something Went Wrong in This View'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                An isolated component error occurred. The remainder of the ERP system remains secure and operational.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left flex items-center justify-between font-mono text-xs text-slate-500">
              <span>Request Reference:</span>
              <span className="text-sky-700 font-semibold">{this.state.requestId}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Component
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoDashboard}
                leftIcon={<Home className="w-4 h-4" />}
              >
                Return to Dashboard
              </Button>
            </div>

            {/* Technical Details Toggle */}
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto"
              >
                <span>{this.state.showDetails ? 'Hide Diagnostics' : 'Show Error Diagnostics'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-[10px] text-rose-600 max-h-40 overflow-y-auto">
                  <p className="font-bold">{this.state.error?.toString()}</p>
                  <pre className="mt-2 text-slate-500 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
