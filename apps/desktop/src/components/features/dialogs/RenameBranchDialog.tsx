import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { GitBranch, X } from "lucide-react";

interface RenameBranchDialogProps {
  open: boolean;
  branchName: string;
  onClose: () => void;
}

export default function RenameBranchDialog({ open, branchName, onClose }: RenameBranchDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedRef = useRepoStore((s) => s.selectedRef);
  const selectRef = useRepoStore((s) => s.selectRef);
  const queryClient = useQueryClient();

  const [newName, setNewName] = useState(branchName);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the input whenever the dialog opens for a different branch.
  useEffect(() => {
    if (open) {
      setNewName(branchName);
      setError(null);
      setLoading(false);
      // Focus + select-all so the user can immediately type the new name.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, branchName]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath) return;

    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Branch name cannot be empty");
      return;
    }
    if (/\s/.test(trimmed)) {
      setError("Branch name cannot contain spaces");
      return;
    }
    if (trimmed === branchName) {
      setError("New name is the same as the current name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.branches.rename(repoPath, branchName, trimmed);
      if (selectedRef === branchName) {
        selectRef(trimmed);
      }
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      showToast(`Renamed branch "${branchName}" to "${trimmed}"`);
      onClose();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center anim-overlay-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="absolute inset-0 bg-[#000000]/45" />
      <div className="relative w-[400px] bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden anim-dialog-enter">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-1-40">
          <GitBranch size={15} className="text-accent shrink-0" />
          <span className="text-xs font-semibold text-text-primary flex-1">Rename Branch</span>
          <button
            onClick={onClose}
            disabled={loading}
            className="ghost p-1 text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            <X size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-2xs text-[#ff453a] leading-relaxed break-words select-text">
              {error}
            </div>
          )}

          <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-2xs font-semibold text-text-secondary">Current Name</label>
              <div className="h-8 px-2.5 flex items-center bg-surface-2 border border-border-40 rounded-mac text-xs font-mono text-text-muted">
                {branchName}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-2xs font-semibold text-text-secondary">New Name</label>
              <input
                ref={inputRef}
                type="text"
                required
                placeholder="e.g. feature/login-page"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError(null);
                }}
                className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted font-mono"
                disabled={loading}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3.5 border-t border-border-60 -mx-4 -mb-4 px-4 py-2.5 bg-surface-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newName.trim() || newName.trim() === branchName}
              className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1 min-w-[64px] justify-center"
            >
              {loading ? "Renaming…" : "Rename"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
