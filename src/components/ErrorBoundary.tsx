import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { RotateCcw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Exception caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#E9EDF3] neu-bg text-slate-800 flex flex-col items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 sm:p-8 neu-panel rounded-3xl text-center space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-sm">
                <AlertTriangle className="h-7 w-7" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Something went wrong
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                An unexpected interface error occurred. Your account data and progress remain safe and unaffected.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl neu-button-primary text-xs font-semibold text-white flex items-center justify-center space-x-1.5"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Home</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl neu-button text-xs font-semibold text-slate-700 flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
              <BrandLogo size="xs" showWordmark={false} />
              <span>ApplyVise AI Resilience Shield</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
