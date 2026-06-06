import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, RefreshCw, Terminal, ChevronDown, ChevronRight, Copy, Check, Bug } from "lucide-react";
import { recordCrash } from "@/lib/crashlytics";
import BugReportDialog from "@/components/features/dialogs/BugReportDialog";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  showReportBug: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
    showReportBug: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
    recordCrash(error, errorInfo.componentStack ?? undefined, "ErrorBoundary");
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
    // Invalidate react-query cache and reload if needed
    window.location.reload();
  };

  private handleCopy = async () => {
    if (!this.state.error) return;
    const diagnostics = `Error: ${this.state.error.message}\n\nStack:\n${this.state.error.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    try {
      await navigator.clipboard.writeText(diagnostics);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error("Failed to copy error details", err);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return (
          <>
            {this.props.fallback}
            <BugReportDialog
              open={this.state.showReportBug}
              onClose={() => this.setState({ showReportBug: false })}
            />
          </>
        );
      }

      return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0-90 backdrop-blur-md p-6 select-none animate-in fade-in duration-300">
          <div className="w-[520px] bg-surface-1 border border-border shadow-2xl rounded-mac p-6 flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Danger Icon with Accent styling */}
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#ff453a] animate-pulse">
              <AlertOctagon size={24} />
            </div>

            <div className="space-y-1.5 w-full">
              <h2 className="text-sm font-semibold text-text-primary">
                Something went wrong
              </h2>
              <p className="text-2xs text-text-muted leading-relaxed px-4">
                The application encountered an unexpected runtime error. You can attempt to reload, or copy diagnostic details for debugging.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="w-full bg-surface-2-30 border border-border-40 rounded-mac p-3 text-left">
              <span className="block text-3xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Error Message
              </span>
              <p className="text-2xs font-mono text-[#ff453a] break-words line-clamp-2">
                {this.state.error?.message || "Unknown application error"}
              </p>
            </div>

            {/* Diagnostics Accordion */}
            <div className="w-full">
              <button
                type="button"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="w-full flex items-center gap-1.5 text-3xs font-semibold text-text-secondary hover:text-text-primary transition-colors py-1.5 focus:outline-none"
              >
                {this.state.showDetails ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <Terminal size={11} />
                <span>{this.state.showDetails ? "Hide Stack Trace" : "Show Stack Trace"}</span>
              </button>

              {this.state.showDetails && (
                <div className="mt-2 text-left bg-surface-2 border border-border-40 rounded-mac p-3 overflow-auto max-h-[180px] font-mono text-[10px] text-text-secondary select-text space-y-3 scrollbar-thin animate-in slide-in-from-top-2 duration-150">
                  <div className="flex justify-between items-center border-b border-border-40 pb-1.5 shrink-0">
                    <span className="text-3xs font-semibold text-text-muted uppercase">Diagnostics</span>
                    <button
                      type="button"
                      onClick={this.handleCopy}
                      className="flex items-center gap-1 text-3xs font-semibold text-accent hover:underline focus:outline-none cursor-pointer"
                    >
                      {this.state.copied ? (
                        <>
                          <Check size={10} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={10} />
                          <span>Copy Stack</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap leading-normal break-all">
                    {this.state.error?.stack || "No stack trace available"}
                    {"\n\nComponent Stack:\n"}
                    {this.state.errorInfo?.componentStack || "No component stack trace available"}
                  </pre>
                </div>
              )}
            </div>

            {/* Quick Action Button Group */}
            <div className="flex items-center justify-end gap-2.5 w-full border-t border-border-40 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => this.setState({ showReportBug: true })}
                className="h-8 px-4 bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary rounded-[5px] text-2xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Bug size={11} />
                <span>Report Bug</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="h-8 px-4 bg-accent text-accent-fg rounded-[5px] text-2xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:opacity-90 active:scale-98"
              >
                <RefreshCw size={11} className="animate-spin-once" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
        <BugReportDialog
          open={this.state.showReportBug}
          onClose={() => this.setState({ showReportBug: false })}
        />
        </>
      );
    }

    return this.props.children;
  }
}
