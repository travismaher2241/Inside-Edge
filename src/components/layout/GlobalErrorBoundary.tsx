import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';
import { BetaDiagnostics } from '../../modules/diagnostics/betaDiagnostics';
import { DraftRecoveryEngine } from '../../modules/diagnostics/draftRecoveryEngine';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  hasUnfinishedDrafts: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    hasUnfinishedDrafts: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const hasUnfinishedDrafts = DraftRecoveryEngine.getAllDrafts().length > 0;
    return { hasError: true, error, hasUnfinishedDrafts };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Inside Edge Global Error Boundary Caught:', error, errorInfo);
    BetaDiagnostics.logEvent('global_error_boundary_triggered', 'GlobalErrorBoundary', {
      errorCategory: error.name || 'UncaughtError'
    });
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleResetState = () => {
    this.setState({ hasError: false, error: undefined });
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl">
            <div className="w-14 h-14 bg-rose-950/80 border border-rose-800/80 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inside Edge hit a problem while displaying this screen. Any work that had already been saved remains available. Inside Edge will also attempt to recover unfinished local work where possible.
              </p>
              {this.state.hasUnfinishedDrafts && (
                <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-2.5 rounded-xl text-xs font-medium mt-2">
                  ✓ Your unfinished work is available to recover upon app launch.
                </div>
              )}
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 text-left line-clamp-3">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleResetState}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4 text-slate-400" /> Reload App
              </button>
            </div>

            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
              Inside Edge Beta v0.9.0-beta.3 · Diagnostic log recorded
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
