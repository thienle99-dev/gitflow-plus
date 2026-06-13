import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitBranches } from "@/queries/useGitLog";
import { useWorktreeAdd } from "@/queries/useWorktrees";
import { FolderTree, X, ChevronDown } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

interface AddWorktreeDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AddWorktreeDialog({ open, onClose }: AddWorktreeDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: branches } = useGitBranches(repoPath);
  const worktreeAdd = useWorktreeAdd(repoPath);

  const [targetPath, setTargetPath] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [branch, setBranch] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const localBranches = branches?.filter((b) => !b.remote) || [];

  const handleBrowse = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        setTargetPath(selected as string);
        setError(null);
      }
    } catch {
      // User cancelled
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath) return;

    if (!targetPath.trim()) {
      setError("Target path is required");
      return;
    }

    setError(null);

    try {
      await worktreeAdd.mutateAsync({
        targetPath: targetPath.trim(),
        branch: mode === "existing" ? branch || undefined : undefined,
        newBranch: mode === "new" ? newBranch.trim() || undefined : undefined,
      });
      onClose();
      setTargetPath("");
      setBranch("");
      setNewBranch("");
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const repoName = repoPath?.split(/[/\\]/).filter(Boolean).pop() || "repo";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center anim-overlay-enter"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#000000]/45" />
      <div className="relative w-[440px] bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden anim-dialog-enter">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-1-40">
          <FolderTree size={15} className="text-accent shrink-0" />
          <span className="text-xs font-semibold text-text-primary flex-1">Add Worktree</span>
          <button onClick={onClose} className="ghost p-1 text-text-muted hover:text-text-primary">
            <X size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-2xs text-[#ff453a] leading-relaxed break-words select-text">
              {error}
            </div>
          )}

          {/* Target Path */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-semibold text-text-secondary">
              Worktree Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder={`e.g. ../${repoName}-feature`}
                value={targetPath}
                onChange={(e) => { setTargetPath(e.target.value); setError(null); }}
                className="flex-1 h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                autoFocus
                disabled={worktreeAdd.isPending}
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="h-8 px-3 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors shrink-0"
                disabled={worktreeAdd.isPending}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Branch Mode */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-semibold text-text-secondary">
              Branch
            </label>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-2 rounded-mac border border-border-40">
              <button
                type="button"
                className={`py-1 rounded text-3xs font-medium transition-all border border-transparent outline-none ${
                  mode === "existing"
                    ? "bg-surface-0 text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
                onClick={() => setMode("existing")}
                disabled={worktreeAdd.isPending}
              >
                Existing Branch
              </button>
              <button
                type="button"
                className={`py-1 rounded text-3xs font-medium transition-all border border-transparent outline-none ${
                  mode === "new"
                    ? "bg-surface-0 text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
                onClick={() => setMode("new")}
                disabled={worktreeAdd.isPending}
              >
                New Branch
              </button>
            </div>
          </div>

          {mode === "existing" ? (
            <div className="space-y-1.5">
              <label className="block text-3xs font-semibold text-text-muted">Select Branch</label>
              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full h-8 pl-2.5 pr-8 bg-surface-1 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none cursor-pointer appearance-none hover:bg-surface-2 transition-all"
                  disabled={worktreeAdd.isPending}
                >
                  <option value="">HEAD (detached)</option>
                  {localBranches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown size={11} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-3xs font-semibold text-text-muted">New Branch Name</label>
              <input
                type="text"
                required
                placeholder="e.g. feature/new-work"
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                disabled={worktreeAdd.isPending}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3.5 border-t border-border-60 -mx-4 -mb-4 px-4 py-2.5 bg-surface-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              disabled={worktreeAdd.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={worktreeAdd.isPending}
              className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1 min-w-[64px] justify-center"
            >
              {worktreeAdd.isPending ? "Adding..." : "Add Worktree"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
