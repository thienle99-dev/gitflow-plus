import Dialog from "./Dialog";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * macOS-style confirmation dialog with backdrop, focus trap, Escape to close.
 * Destructive variant uses a red confirm button.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} maxWidth="400px" showCloseButton={false}>
      <p className="text-sm text-text-secondary leading-relaxed mb-5">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 hover:bg-surface-3 border border-border rounded-md transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          autoFocus
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
