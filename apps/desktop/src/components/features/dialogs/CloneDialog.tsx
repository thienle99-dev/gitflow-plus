import { useState, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { api, type CloneProgress } from "@/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { X, Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";

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
  const [progress, setProgress] = useState<CloneProgress | null>(null);

  // Clone options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [shallow, setShallow] = useState(false);
  const [shallowDepth, setShallowDepth] = useState(1);
  const [blobless, setBlobless] = useState(false);

  useEffect(() => {
    if (!open) return;
    let unlisten: (() => void) | null = null;

    listen<CloneProgress>("clone-progress", (event) => {
      setProgress(event.payload);
      if (event.payload.phase === "complete") {
        setSuccess(event.payload.message);
        setLoading(false);
      }
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setProgress(null);
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  if (!open) return null;

  const extractDefaultFolder = (cloneUrl: string) => {
    const match = cloneUrl.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1].replace(/\/$/, "") : "";
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    setSuccess(null);
    if (value && !destination) {
      const folder = extractDefaultFolder(value);
      if (folder) {
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
    setProgress(null);

    try {
      const opts: { depth?: number; filter?: string } = {};
      if (shallow && shallowDepth > 0) opts.depth = shallowDepth;
      if (blobless) opts.filter = "blob:none";

      await api.repo.clone(url.trim(), destination.trim(), opts);
      // Success is handled by the clone-progress listener
      setTimeout(() => {
        openRepo(destination.trim());
        onClose();
      }, 1500);
    } catch (err) {
      setError(`${err}`);
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.repo.cancelClone();
    } catch {
      // ignore
    }
    setLoading(false);
    setProgress(null);
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

  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case "counting": return "Counting objects";
      case "receiving": return "Receiving objects";
      case "resolving": return "Resolving deltas";
      case "remote": return "Remote";
      case "done": return "Done";
      case "complete": return "Complete";
      default: return phase;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/65 backdrop-blur-md z-[9998] flex items-center justify-center p-6 anim-overlay-enter">
      <div className="w-full max-w-md bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden anim-dialog-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1-40">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Clone Repository</span>
          </div>
          <button
            onClick={loading ? handleCancel : onClose}
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
              disabled={loading}
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
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSelectDestination}
                disabled={loading}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-surface-2 text-text-primary disabled:opacity-40"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Advanced options */}
          {!loading && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-primary transition-colors"
              >
                {showAdvanced ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                Advanced
              </button>

              {showAdvanced && (
                <div className="space-y-2.5 pl-3 border-l border-border-40">
                  {/* Shallow */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shallow}
                      onChange={(e) => setShallow(e.target.checked)}
                      className="accent-accent"
                    />
                    <span className="text-xs text-text-primary">Shallow clone</span>
                    <span className="text-2xs text-text-muted">(--depth)</span>
                  </label>
                  {shallow && (
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-2xs text-text-muted">Depth:</span>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={shallowDepth}
                        onChange={(e) => setShallowDepth(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-xs bg-surface-2 border border-border rounded px-2 py-0.5 text-text-primary outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  )}

                  {/* Blobless */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blobless}
                      onChange={(e) => setBlobless(e.target.checked)}
                      className="accent-accent"
                    />
                    <span className="text-xs text-text-primary">Blobless clone</span>
                    <span className="text-2xs text-text-muted">(--filter=blob:none)</span>
                  </label>

                  {/* Hint */}
                  {(shallow || blobless) && (
                    <div className="text-2xs text-text-muted bg-surface-1-30 border border-border-40 rounded px-2 py-1 leading-relaxed">
                      {shallow && blobless
                        ? "Shallow + blobless: fastest clone, no full history or file contents."
                        : shallow
                          ? "Shallow clone: truncates history to N commits. Good for CI or quick lookups."
                          : "Blobless clone: full history but file contents fetched on demand. Good for large repos."}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {loading && progress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {getPhaseLabel(progress.phase)}
                </span>
                {progress.percent > 0 && (
                  <span className="text-[10px] font-mono text-accent">{Math.round(progress.percent)}%</span>
                )}
              </div>
              {progress.percent > 0 && (
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress.percent, 100)}%` }}
                  />
                </div>
              )}
              <p className="text-[9px] text-text-muted font-mono truncate">{progress.message}</p>
            </div>
          )}

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
            {loading ? (
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 h-8 bg-[#ff453a]/10 text-[#ff453a] text-xs font-semibold rounded hover:bg-[#ff453a]/20 transition-colors flex items-center justify-center gap-1.5"
              >
                Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!url.trim() || !destination.trim()}
                className="flex-1 h-8 bg-accent text-accent-fg text-xs font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <Download size={12} />
                Clone
              </button>
            )}
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
