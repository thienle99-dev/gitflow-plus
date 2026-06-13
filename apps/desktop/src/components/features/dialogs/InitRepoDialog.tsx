import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { X, FolderPlus, Loader2 } from "lucide-react";

interface InitRepoDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function InitRepoDialog({ open, onClose }: InitRepoDialogProps) {
  const openRepo = useRepoStore((s) => s.openRepo);
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSelectPath = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        setPath(selected as string);
        setError(null);
      }
    } catch {
      // Fallback for non-Tauri environment
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) {
      setError("Path is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.repo.init(path.trim());
      openRepo(path.trim());
      onClose();
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/65 backdrop-blur-md z-[9998] flex items-center justify-center p-6 anim-overlay-enter">
      <div className="w-full max-w-md bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden anim-dialog-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1-40">
          <div className="flex items-center gap-2">
            <FolderPlus size={14} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Create Repository</span>
          </div>
          <button
            onClick={loading ? undefined : onClose}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Path */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-primary">Directory Path</label>
            <div className="flex gap-2">
              <input
                value={path}
                onChange={(e) => { setPath(e.target.value); setError(null); }}
                placeholder="/Users/user/Projects/my-repo"
                className="flex-1 text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                onClick={handleSelectPath}
                disabled={loading}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-surface-2 text-text-primary disabled:opacity-40"
              >
                Browse
              </button>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              The directory will be created if it doesn't exist. Git will initialize an empty repository here.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded border border-red-500/20">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!path.trim() || loading}
              className="flex-1 h-8 bg-accent text-accent-fg text-xs font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FolderPlus size={12} />
              )}
              {loading ? "Creating..." : "Create Repository"}
            </button>
            {!loading && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-8 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
