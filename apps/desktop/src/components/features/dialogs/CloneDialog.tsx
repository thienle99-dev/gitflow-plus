import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { X, Download } from "lucide-react";

interface CloneDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CloneDialog({ open, onClose }: CloneDialogProps) {
  const openRepo = useRepoStore((s) => s.openRepo);
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  const extractDefaultFolder = (cloneUrl: string) => {
    const match = cloneUrl.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1].replace(/\/$/, "") : "";
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    setSuccess(null);
    // Auto-suggest destination when URL changes
    if (value && !destination) {
      const folder = extractDefaultFolder(value);
      if (folder) {
        // Try to use parent of current repo or home
        setDestination(`~/Projects/${folder}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !destination.trim()) {
      setError("URL and destination are required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.repo.clone(url.trim(), destination.trim());
      setSuccess(`Repository cloned successfully`);
      // Auto-open the cloned repo after a brief delay
      setTimeout(() => {
        openRepo(destination.trim());
        onClose();
      }, 1500);
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        setDestination(selected as string);
        setError(null);
      }
    } catch {
      // Fallback for non-Tauri environment
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/65 backdrop-blur-md z-[9998] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1-40">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Clone Repository</span>
          </div>
          <button
            onClick={onClose}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-primary">Repository URL</label>
            <input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="w-full text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
              autoFocus
            />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-primary">Destination Path</label>
            <div className="flex gap-2">
              <input
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setError(null); }}
                placeholder="/Users/user/Projects/my-repo"
                className="flex-1 text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={handleSelectDestination}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-surface-2 text-text-primary"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded border border-red-500/20">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="text-xs text-green-400 bg-green-500/10 px-2.5 py-1.5 rounded border border-green-500/20">
              {success} — Opening repository...
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || !url.trim() || !destination.trim()}
              className="flex-1 h-8 bg-accent text-accent-fg text-xs font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Download size={12} />
                  Clone
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-8 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
