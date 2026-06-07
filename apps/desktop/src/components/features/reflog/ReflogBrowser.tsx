import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useReflogList, useRestoreToCommit } from "@/queries/useGitReflog";
import { showToast } from "@/lib/toast";
import {
  GitCommitHorizontal,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";

const ACTION_COLORS: Record<string, string> = {
  commit: "text-[#30d158]",
  reset: "text-[#ff453a]",
  checkout: "text-[#0a84ff]",
  merge: "text-[#bf5af2]",
  rebase: "text-[#ff9f0a]",
  "cherry-pick": "text-[#64d2ff]",
  pull: "text-[#0a84ff]",
  amend: "text-[#ff9f0a]",
  other: "text-text-muted",
};

const ACTION_LABELS: Record<string, string> = {
  commit: "Commit",
  reset: "Reset",
  checkout: "Checkout",
  merge: "Merge",
  rebase: "Rebase",
  "cherry-pick": "Cherry-pick",
  pull: "Pull",
  amend: "Amend",
  other: "Other",
};

export default function ReflogBrowser() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: entries, isLoading, refetch } = useReflogList(repoPath, 50);
  const restoreMutation = useRestoreToCommit(repoPath);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRestore = async () => {
    if (!restoreTarget || !repoPath) return;
    try {
      const msg = await restoreMutation.mutateAsync(restoreTarget);
      showToast(msg, "success");
      setConfirmOpen(false);
      setRestoreTarget(null);
    } catch (e: any) {
      showToast(`Restore failed: ${e}`, "error");
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-60 shrink-0 bg-surface-1-40">
        <div className="flex items-center gap-2">
          <RotateCcw size={13} className="text-accent" />
          <span className="text-xs font-bold text-text-primary">Reflog</span>
          <span className="text-[10px] text-text-muted">Safety net</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-6 w-6 inline-flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Refresh reflog"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {!entries || entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <RotateCcw size={24} className="text-text-muted mb-2" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-text-secondary">No reflog entries</p>
            <p className="text-[10px] text-text-muted mt-1 max-w-[200px]">
              The reflog records every action you take. Make a commit or checkout to populate it.
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const color = ACTION_COLORS[entry.action] || ACTION_COLORS.other;
            const label = ACTION_LABELS[entry.action] || entry.action;
            const isRestoring = restoreMutation.isPending && restoreTarget === entry.commit_hash;

            return (
              <div
                key={`${entry.index}:${entry.commit_hash}`}
                className="px-3 py-2 border-b border-border-20 hover:bg-surface-1-30 transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  {/* Action badge */}
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold bg-surface-2 border border-border-40 ${color}`}>
                    {label}
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono font-bold text-text-secondary bg-surface-2 rounded px-1 py-0.5">
                        {entry.commit_hash.slice(0, 7)}
                      </code>
                      <span className="text-[9px] text-text-muted">
                        HEAD@{entry.index}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-primary mt-0.5 truncate leading-snug">
                      {entry.description}
                    </p>
                    <span className="text-[9px] text-text-muted">{entry.date}</span>
                  </div>

                  {/* Restore button */}
                  <button
                    onClick={() => { setRestoreTarget(entry.commit_hash); setConfirmOpen(true); }}
                    disabled={restoreMutation.isPending}
                    className="shrink-0 h-6 px-2 rounded text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-all bg-transparent border border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-2 disabled:opacity-40"
                    title={`Restore working tree to ${entry.commit_hash.slice(0, 7)} (hard reset)`}
                  >
                    {isRestoring ? (
                      <RefreshCw size={10} className="animate-spin" />
                    ) : (
                      "Restore"
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Restore confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Restore to this commit?"
        message={`This will HARD RESET your working tree and index to ${restoreTarget?.slice(0, 7)}. Any uncommitted changes will be lost. This action is destructive — make sure you have stashed or committed any work you want to keep.`}
        confirmLabel="Restore"
        cancelLabel="Cancel"
        onConfirm={handleRestore}
        onCancel={() => { setConfirmOpen(false); setRestoreTarget(null); }}
        variant="destructive"
      />
    </div>
  );
}
