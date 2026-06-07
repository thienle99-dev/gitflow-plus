import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useReflogList } from "@/queries/useGitReflog";
import { showToast } from "@/lib/toast";
import { api } from "@/api/tauri";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitCommitHorizontal, RotateCcw, RefreshCw, AlertTriangle } from "lucide-react";
import Dialog from "@/components/ui/overlay/Dialog";

type ResetMode = "soft" | "mixed" | "hard";

const RESET_MODES: { value: ResetMode; label: string; description: string }[] = [
  {
    value: "soft",
    label: "--soft",
    description: "Keep all changes staged. HEAD moves, index and working tree untouched.",
  },
  {
    value: "mixed",
    label: "--mixed (default)",
    description: "Unstage all changes. HEAD moves, index resets, working tree kept.",
  },
  {
    value: "hard",
    label: "--hard",
    description: "Discard all changes. HEAD moves, index and working tree both reset.",
  },
];

interface ResetDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ResetDialog({ open, onClose }: ResetDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();

  const { data: reflogEntries, isLoading, refetch } = useReflogList(repoPath, 50);

  const [resetMode, setResetMode] = useState<ResetMode>("mixed");
  const [selectedHash, setSelectedHash] = useState<string>("");
  const [manualHash, setManualHash] = useState<string>("");

  const resetMutation = useMutation<string, Error, { hash: string; mode: string }>({
    mutationFn: ({ hash, mode }) => api.reflog.resetToCommit(repoPath!, hash, mode),
    onSuccess: (msg) => {
      showToast(msg || `Git reset (--${resetMode}) successful`);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      onClose();
    },
    onError: (e) => {
      showToast(`Reset failed: ${e.message || e}`, "error");
    },
  });

  const activeHash = manualHash.trim() || selectedHash;
  const isValidHash = /^[a-f0-9]{4,40}$/i.test(activeHash);
  const isHard = resetMode === "hard";

  const handleReset = () => {
    if (!repoPath || !activeHash || !isValidHash) return;
    resetMutation.mutate({ hash: activeHash, mode: resetMode });
  };

  const handleSelectEntry = (hash: string) => {
    setSelectedHash(hash);
    setManualHash("");
  };

  const handleClose = () => {
    // Reset local state on close
    setResetMode("mixed");
    setSelectedHash("");
    setManualHash("");
    onClose();
  };

  const isPending = resetMutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} title="Git Reset" maxWidth="520px">
      <div className="flex flex-col gap-4 pt-1">
        {/* Reset mode selector */}
        <div className="space-y-1.5">
          <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Reset mode</span>
          <div className="grid grid-cols-3 gap-1.5">
            {RESET_MODES.map((mode) => {
              const active = resetMode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => setResetMode(mode.value)}
                  className={`flex flex-col gap-0.5 p-2.5 rounded-mac border text-left transition-all cursor-pointer ${
                    active
                      ? isHard
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-accent/50 bg-accent/10"
                      : "border-border-40 bg-surface-1 hover:bg-surface-2"
                  }`}
                >
                  <span className={`text-xs font-semibold ${active && isHard ? "text-red-400" : active ? "text-accent" : "text-text-primary"}`}>
                    {mode.label}
                  </span>
                  <span className="text-[10px] text-text-muted leading-tight mt-0.5">
                    {mode.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hard mode warning */}
        {isHard && activeHash && (
          <div className="flex items-start gap-2.5 rounded-mac bg-red-500/10 border border-red-500/30 px-3.5 py-2.5">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-red-300">Destructive operation</span>
              <p className="text-[11px] text-red-300/70 mt-0.5 leading-relaxed">
                Hard reset discards all uncommitted changes in working tree and index.
                Commits after <code className="text-red-200 bg-red-500/15 px-1 rounded text-[10px] font-mono">{activeHash.slice(0, 7)}</code> will be lost from this branch.
                Use "Restore to commit" from the reflog panel to recover if needed.
              </p>
            </div>
          </div>
        )}

        {/* Manual hash input */}
        <div className="space-y-1.5">
          <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
            Target commit
          </span>
          <input
            type="text"
            value={manualHash}
            onChange={(e) => {
              setManualHash(e.target.value);
              if (e.target.value) setSelectedHash("");
            }}
            placeholder="Paste full or partial commit hash..."
            className="w-full text-xs bg-surface-1 border border-border-40 text-text-primary px-2.5 py-1.5 rounded focus:outline-none focus:border-accent-60 transition-colors font-mono placeholder:text-text-muted/50"
          />
        </div>

        {/* Divider or */}
        {reflogEntries && reflogEntries.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-40" />
            <span className="text-2xs text-text-muted font-medium">or select from reflog</span>
            <div className="flex-1 h-px bg-border-40" />
          </div>
        )}

        {/* Reflog list */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto rounded-mac border border-border-40 bg-surface-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={14} className="animate-spin text-text-muted" />
            </div>
          ) : !reflogEntries || reflogEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <RotateCcw size={20} className="text-text-muted mb-1.5" strokeWidth={1.5} />
              <p className="text-xs text-text-secondary">No reflog entries</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Make commits or checkouts to populate the reflog.
              </p>
            </div>
          ) : (
            reflogEntries.map((entry) => {
              const isSelected = selectedHash === entry.commit_hash && !manualHash;
              return (
                <button
                  key={`${entry.index}:${entry.commit_hash}`}
                  onClick={() => handleSelectEntry(entry.commit_hash)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-left border-b border-border-20 last:border-b-0 transition-colors cursor-pointer ${
                    isSelected
                      ? isHard
                        ? "bg-red-500/10 border-l-2 border-l-red-500"
                        : "bg-accent/10 border-l-2 border-l-accent"
                      : "hover:bg-surface-2 border-l-2 border-l-transparent"
                  }`}
                >
                  <GitCommitHorizontal size={12} className="shrink-0 mt-0.5 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono font-bold text-text-secondary bg-surface-2 rounded px-1 py-0.5">
                        {entry.commit_hash.slice(0, 7)}
                      </code>
                      <span className="text-[9px] text-text-muted">HEAD@{entry.index}</span>
                    </div>
                    <p className="text-[10px] text-text-primary mt-0.5 truncate leading-snug">
                      {entry.description}
                    </p>
                    <span className="text-[9px] text-text-muted">{entry.date}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-40">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={!isValidHash || isPending || !repoPath}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isHard
                ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                : "bg-accent text-accent-fg hover:opacity-90"
            }`}
          >
            {isPending ? (
              <span className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
            ) : (
              <RotateCcw size={12} />
            )}
            {isPending ? "Resetting..." : `Reset ${resetMode !== "mixed" ? `--${resetMode}` : ""}`.trim()}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
