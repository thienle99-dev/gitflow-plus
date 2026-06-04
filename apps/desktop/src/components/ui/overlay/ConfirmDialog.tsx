import { AlertTriangle, Info } from "lucide-react";
import Dialog from "./Dialog";

export interface ImpactItem {
  /** Short description of what will happen */
  label: string;
  /** "irreversible" renders red with AlertTriangle, "warning" renders amber, "info" renders blue */
  severity?: "irreversible" | "warning" | "info";
  /** Optional file paths or other details shown in a monospace block */
  details?: string[];
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Structured impact list shown between the message and the action buttons */
  impactItems?: ImpactItem[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * macOS-style confirmation dialog with backdrop, focus trap, Escape to close.
 * Destructive variant uses a red confirm button.
 * Focus defaults to the cancel button (safe default) for destructive actions.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  impactItems,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} maxWidth="440px" showCloseButton={false}>
      <p id="confirm-dialog-message" className="text-sm text-text-secondary leading-relaxed mb-4">{message}</p>

      {impactItems && impactItems.length > 0 && (
        <div className="mb-5 space-y-2">
          {impactItems.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                item.severity === "irreversible"
                  ? "bg-[#ff375f]/10 border border-[#ff375f]/25"
                  : item.severity === "warning"
                    ? "bg-[#ff9f0a]/10 border border-[#ff9f0a]/25"
                    : "bg-accent/10 border border-accent/25"
              }`}
            >
              {item.severity === "irreversible" ? (
                <AlertTriangle size={13} className="text-[#ff375f] shrink-0 mt-0.5" />
              ) : item.severity === "warning" ? (
                <AlertTriangle size={13} className="text-[#ff9f0a] shrink-0 mt-0.5" />
              ) : (
                <Info size={13} className="text-accent shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <span className={`font-medium ${
                  item.severity === "irreversible"
                    ? "text-[#ff375f]"
                    : item.severity === "warning"
                      ? "text-[#ff9f0a]"
                      : "text-accent"
                }`}>
                  {item.label}
                </span>
                {item.details && item.details.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {item.details.slice(0, 8).map((d, j) => (
                      <div key={j} className="font-mono text-[11px] text-text-muted truncate">{d}</div>
                    ))}
                    {item.details.length > 8 && (
                      <div className="text-[11px] text-text-muted italic">
                        +{item.details.length - 8} more...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2" role="group" aria-label="Dialog actions">
        <button
          onClick={onCancel}
          autoFocus={variant === "destructive"}
          className="px-4 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 hover:bg-surface-3 border border-border rounded-md transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          autoFocus={variant !== "destructive"}
          aria-label={confirmLabel}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
            variant === "destructive"
              ? "bg-[#ff375f] text-white hover:bg-[#ff375f]/85"
              : "bg-accent text-accent-fg hover:opacity-90"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
