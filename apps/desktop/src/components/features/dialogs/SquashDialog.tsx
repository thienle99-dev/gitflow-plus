import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { api } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import type { RebaseTodo } from "@/queries/useGitRebase";
import { GitCommit, X } from "lucide-react";

interface SquashDialogProps {
  open: boolean;
  commitHash: string;
  onClose: () => void;
}

const N_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function SquashDialog({
  open,
  commitHash,
  onClose,
}: SquashDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const setRebaseTargetCommit = useUIStore((s) => s.setRebaseTargetCommit);
  const openDialog = useUIStore((s) => s.openDialog);
  const setPrefilledRebaseTodos = useUIStore((s) => s.setPrefilledRebaseTodos);
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleSquash = async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const todos = await api.rebase.todoList(repoPath, commitHash);
      if (todos.length < 2) {
        showToast("Need at least 2 commits to squash", "error");
        setLoading(false);
        return;
      }
      // Take last N commits (oldest first from API)
      const lastN = todos.slice(-count);
      const configured: RebaseTodo[] = lastN.map((t, i) => ({
        ...t,
        action: i === 0 ? "pick" : "squash",
      }));
      // Store prefilled todos and open InteractiveRebaseDialog
      setPrefilledRebaseTodos(configured);
      setRebaseTargetCommit(commitHash);
      onClose();
      openDialog("interactive-rebase");
    } catch (err: any) {
      showToast(`Failed to fetch commits: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#000000]/45" />
      <div className="relative w-[360px] bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-1-40">
          <GitCommit size={15} className="text-purple-400 shrink-0" />
          <span className="text-xs font-semibold text-text-primary flex-1">
            Squash Last N Commits
          </span>
          <button
            onClick={onClose}
            className="p-0.5 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          <p className="text-2xs text-text-secondary leading-relaxed">
            Squash the last N commits into a single commit. The oldest commit's message will be used as the base, and you can review all messages before finalizing.
          </p>

          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary font-medium">
              Squash last
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-8 px-2 rounded border border-border-40 bg-surface-1-30 text-xs text-text-primary outline-none focus:border-accent-60 cursor-pointer"
            >
              {N_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <label className="text-xs text-text-secondary font-medium">
              commits
            </label>
          </div>

          <p className="text-2xs text-text-muted leading-relaxed">
            Commit <code className="px-1 py-0.5 bg-surface-2-40 rounded text-[10px] font-mono">{commitHash.slice(0, 8)}</code> and its predecessors will be squashed.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-surface-1-20">
          <button
            onClick={onClose}
            className="h-7 px-3 rounded-[5px] text-3xs font-semibold border border-border-40 bg-surface-2-40 text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSquash}
            disabled={loading}
            className="h-7 px-3 rounded-[5px] text-3xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Squash & Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
