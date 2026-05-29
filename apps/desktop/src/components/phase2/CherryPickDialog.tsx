import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useCherryPick, useCherryPickAbort } from "@/queries/useGitCherryPick";
import { GitCommit, AlertTriangle, X, Copy } from "lucide-react";

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-[420px] bg-surface-0 border border-border rounded-mac shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          {hasConflicts ? (
            <AlertTriangle size={16} className="text-[#ff9f0a]" />
          ) : (
            <GitCommit size={16} className="text-accent" />
          )}
          <span className="text-sm font-medium text-text-primary flex-1">
            {hasConflicts ? "Cherry-Pick Conflicts" : "Cherry-Pick Commit"}
          </span>
          <button onClick={onClose} className="ghost p-1">
            <X size={14} />
          </button>
        </div>

        {/* Commit info */}
        <div className="px-3 py-2 border-b border-border bg-surface-1">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono text-text-muted">commit</span>
            <code className="text-xs font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">
              {commitHash.slice(0, 7)}
            </code>
            <button
              className="ghost p-0.5 opacity-50 hover:opacity-100"
              onClick={() => navigator.clipboard.writeText(commitHash)}
              title="Copy full hash"
            >
              <Copy size={10} />
            </button>
          </div>
          {commitMessage && (
            <div className="text-xs text-text-primary mt-1 truncate">
              {commitMessage}
            </div>
          )}
        </div>

        {/* Options */}
        {!hasConflicts && (
          <div className="px-3 py-3 space-y-3">
            <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={noCommit}
                onChange={(e) => setNoCommit(e.target.checked)}
                className="rounded"
              />
              <div>
                <span>--no-commit</span>
                <span className="text-text-muted ml-1">
                  (stage changes without committing)
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Conflict info */}
        {hasConflicts && cherryPick.data?.conflicted_files?.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <div className="text-xs font-medium text-[#ff375f] mb-1">Conflicted files:</div>
            {cherryPick.data.conflicted_files.map((f) => (
              <div key={f} className="text-xs text-text-muted pl-3">- {f}</div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-surface-1">
          {hasConflicts ? (
            <>
              <span className="text-xs text-text-muted flex-1">
                Resolve conflicts before completing
              </span>
              <button
                onClick={handleAbort}
                disabled={cherryPickAbort.isPending}
                className="px-3 py-1 text-xs text-text-muted hover:text-text-primary border border-border rounded-mac transition-colors"
              >
                {cherryPickAbort.isPending ? "Aborting..." : "Abort"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-3 py-1 text-xs text-text-muted hover:text-text-primary border border-border rounded-mac transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCherryPick}
                disabled={cherryPick.isPending}
                className="flex items-center gap-1.5 px-3 py-1 bg-accent text-accent-fg text-xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
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
