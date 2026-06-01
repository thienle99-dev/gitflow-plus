import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useCherryPick, useCherryPickAbort } from "@/queries/useGitCherryPick";
import { GitCommit, AlertTriangle, X, Copy, ChevronDown } from "lucide-react";

function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 py-1.5 select-none ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-text-primary">{label}</span>
        {description && <span className="text-2xs text-text-muted mt-0.5 leading-normal">{description}</span>}
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-8 h-[18px] bg-surface-3 rounded-full transition-colors duration-200 peer-checked:bg-accent"></div>
        <div className="absolute left-[2px] top-[2px] bg-white w-[14px] h-[14px] rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-3.5"></div>
      </div>
    </label>
  );
}

interface CherryPickDialogProps {
  open: boolean;
  commitHash: string;
  commitMessage?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CherryPickDialog({
  open,
  commitHash,
  commitMessage,
  onClose,
  onSuccess,
}: CherryPickDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const cherryPick = useCherryPick(repoPath);
  const cherryPickAbort = useCherryPickAbort(repoPath);

  const [noCommit, setNoCommit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCherryPick = async () => {
    try {
      const result = await cherryPick.mutateAsync({ hash: commitHash, noCommit });
      if (result.success) {
        showToast(result.message || "Cherry-pick successful");
        onSuccess?.();
        onClose();
      } else {
        showToast(`Conflicts: ${result.conflicted_files?.join(", ") || result.message}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleAbort = async () => {
    try {
      await cherryPickAbort.mutateAsync();
      showToast("Cherry-pick aborted");
      onClose();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  if (!open) return null;

  // If we have conflicts detected from a previous attempt, show abort as well
  const hasConflicts = cherryPick.data && !cherryPick.data.success;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#000000]/45" />
      <div className="relative w-[420px] bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-1/40">
          {hasConflicts ? (
            <AlertTriangle size={15} className="text-[#ff9500] shrink-0" />
          ) : (
            <GitCommit size={15} className="text-accent shrink-0" />
          )}
          <span className="text-xs font-semibold text-text-primary flex-1">
            {hasConflicts ? "Cherry-Pick Conflicts" : "Cherry-Pick Commit"}
          </span>
          <button onClick={onClose} className="ghost p-1 text-text-muted hover:text-text-primary">
            <X size={13} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Commit Info Card */}
          <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono text-text-muted">commit</span>
              <code className="text-xs font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded-sm font-semibold">
                {commitHash.slice(0, 7)}
              </code>
              <button
                className="ghost p-0.5 opacity-50 hover:opacity-100 transition-opacity text-text-secondary"
                onClick={() => navigator.clipboard.writeText(commitHash)}
                title="Copy full hash"
              >
                <Copy size={11} />
              </button>
            </div>
            {commitMessage && (
              <div className="text-xs font-medium text-text-primary leading-normal truncate">
                {commitMessage}
              </div>
            )}
          </div>

          {/* Options Card */}
          {!hasConflicts && (
            <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 animate-in slide-in-from-top-1 duration-150">
              <Switch
                checked={noCommit}
                onChange={setNoCommit}
                label="Stage changes only (--no-commit)"
                description="Apply the commit modifications to working directory without committing automatically."
              />
            </div>
          )}

          {/* Conflict Details Card */}
          {hasConflicts && cherryPick.data?.conflicted_files?.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-mac p-3.5 space-y-2 animate-in slide-in-from-top-1 duration-150">
              <div className="text-2xs font-semibold text-[#ff453a] flex items-center gap-1.5">
                <AlertTriangle size={12} />
                <span>Conflicted Files ({cherryPick.data.conflicted_files.length})</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {cherryPick.data.conflicted_files.map((f) => (
                  <div key={f} className="text-2xs text-text-muted font-mono bg-surface-1/30 border border-border-40/50 rounded px-2 py-1 truncate">
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border-60 bg-surface-1">
          {hasConflicts ? (
            <>
              <span className="text-2xs text-text-muted flex-1 leading-normal">
                Please resolve conflicts manually in working tree.
              </span>
              <button
                onClick={handleAbort}
                disabled={cherryPickAbort.isPending}
                className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              >
                {cherryPickAbort.isPending ? "Aborting..." : "Abort"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              >
                Cancel
              </button>
              <button
                onClick={handleCherryPick}
                disabled={cherryPick.isPending}
                className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity min-w-[64px] flex items-center justify-center"
              >
                {cherryPick.isPending ? "Cherry-picking..." : "Cherry-Pick"}
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 toast">{toast}</div>
      )}
    </div>
  );
}
