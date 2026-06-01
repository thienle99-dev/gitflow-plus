import { ERROR_STYLES, type ErrorToastState } from "@/lib/useErrorHandler";
import { X, RotateCcw, Wifi, Lock, AlertTriangle, FileX, Zap, AlertCircle } from "lucide-react";

interface ErrorToastProps {
  error: ErrorToastState;
  onDismiss: (key: number) => void;
  onRetry?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Wifi: <Wifi size={14} />,
  Lock: <Lock size={14} />,
  AlertTriangle: <AlertTriangle size={14} />,
  FileX: <FileX size={14} />,
  Zap: <Zap size={14} />,
  AlertCircle: <AlertCircle size={14} />,
};

export function ErrorToast({ error, onDismiss, onRetry }: ErrorToastProps) {
  const style = ERROR_STYLES[error.category];

  return (
    <div className="toast min-w-[320px] max-w-[420px]" style={{ bottom: "auto", top: 52, right: 16 }}>
      <div className={`-m-[1px] rounded-lg border ${style.border} ${style.bg} p-3`}>
        <div className="flex items-start gap-2">
          <span className={`shrink-0 mt-0.5 ${style.text}`}>
            {ICON_MAP[style.icon] || <AlertCircle size={14} />}
          </span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-medium ${style.text} truncate`}>
              {error.title}
            </div>
            <div className="text-2xs text-text-muted mt-0.5 leading-tight">
              {error.detail}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {error.retryable && onRetry && (
              <button
                className="ghost p-1 hover:bg-surface-2-50"
                onClick={() => { onRetry(); onDismiss(error.key); }}
                title="Retry"
              >
                <RotateCcw size={12} />
              </button>
            )}
            <button
              className="ghost p-1 hover:bg-surface-2-50"
              onClick={() => onDismiss(error.key)}
              title="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ErrorBannerProps {
  error: string | null;
  category?: "network" | "auth" | "conflict" | "validation" | "system" | "unknown";
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
}

export function ErrorBanner({ error, category = "unknown", onDismiss, action }: ErrorBannerProps) {
  if (!error) return null;
  const style = ERROR_STYLES[category];

  return (
    <div className={`${style.bg} border-b ${style.border} px-3 py-1.5 flex items-center gap-2`}>
      <span className={`shrink-0 ${style.text}`}>
        {ICON_MAP[style.icon] || <AlertCircle size={12} />}
      </span>
      <span className={`text-xs flex-1 ${style.text}`}>{error}</span>
      {action && (
        <button className={`ghost text-2xs ${style.text}`} onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button className="ghost p-0.5 text-text-muted" onClick={onDismiss}>
          <X size={10} />
        </button>
      )}
    </div>
  );
}
