import { useState, useRef, useCallback } from "react";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { Download, Loader2, Check, XCircle, RefreshCw, Package, Sparkles } from "lucide-react";

type Status = "idle" | "checking" | "available" | "downloading" | "ready" | "error" | "latest";

interface UpdateCheckerProps {
  onClose?: () => void;
  autoCheck?: boolean;
}

export default function UpdateChecker({ onClose, autoCheck }: UpdateCheckerProps) {
  const [status, setStatus] = useState<Status>(autoCheck ? "checking" : "idle");
  const [version, setVersion] = useState("");
  const [body, setBody] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const updateRef = useRef<Update | null>(null);
  const totalBytesRef = useRef(0);

  const check = useCallback(async () => {
    setStatus("checking");
    setError(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        setStatus("latest");
        return;
      }
      updateRef.current = update;
      setVersion(update.version);
      setBody(update.body || "");
      setStatus("available");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  const download = async () => {
    const update = updateRef.current;
    if (!update) return;

    totalBytesRef.current = 0;
    let downloadedBytes = 0;
    setStatus("downloading");

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytesRef.current = event.data.contentLength;
          setProgress(0);
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const total = totalBytesRef.current;
          if (total > 0) setProgress(Math.min(99, Math.round((downloadedBytes / total) * 100)));
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      setStatus("ready");
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const restart = async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      setError(`Restart failed: ${err}`);
      setStatus("error");
    }
  };

  const close = () => {
    if (status === "downloading") return; // don't close mid-download
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={close}>
      <div className="w-[400px] rounded-2xl border border-border-60 bg-surface-0 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-40">
          <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            {status === "ready" ? <Check size={16} /> : <Package size={16} />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-text-primary">Check for Updates</div>
            <div className="text-2xs text-text-muted">GitFlow Desktop</div>
          </div>
          <button onClick={close} className="ghost p-1 rounded text-text-muted hover:text-text-primary">
            <XCircle size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3 min-h-[100px] flex flex-col justify-center">
          {status === "idle" && (
            <div className="text-center space-y-3">
              <div className="text-2xs text-text-muted">Click to check for new updates.</div>
              <button onClick={check} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-mac bg-accent text-accent-fg text-xs font-semibold hover:opacity-90 transition-opacity">
                <RefreshCw size={12} />
                Check for Updates
              </button>
            </div>
          )}

          {status === "checking" && (
            <div className="flex items-center gap-2 text-xs text-text-secondary justify-center py-4">
              <Loader2 size={14} className="animate-spin text-accent" />
              Checking for updates...
            </div>
          )}

          {status === "latest" && (
            <div className="text-center py-4 space-y-2">
              <Check size={24} className="mx-auto text-[#30d158]" />
              <div className="text-sm font-medium text-text-primary">Up to date</div>
              <div className="text-2xs text-text-muted">You're running the latest version.</div>
              <button onClick={() => setStatus("idle")} className="text-2xs text-accent hover:underline mt-2 inline-block">Check again</button>
            </div>
          )}

          {status === "available" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-sm font-semibold text-text-primary">v{version} available</span>
              </div>
              {body && (
                <div className="max-h-32 overflow-y-auto rounded-mac border border-border-40 bg-surface-1-40 px-3 py-2">
                  <pre className="whitespace-pre-wrap text-2xs leading-relaxed text-text-secondary font-sans">{body}</pre>
                </div>
              )}
              <button onClick={download} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-mac bg-accent text-accent-fg text-xs font-semibold hover:opacity-90 transition-opacity">
                <Download size={12} />
                Download & Install
              </button>
            </div>
          )}

          {status === "downloading" && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 size={13} className="animate-spin text-accent" />
                <span>Downloading... {progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="text-center py-4 space-y-3">
              <Check size={24} className="mx-auto text-[#30d158]" />
              <div className="text-sm font-medium text-text-primary">Update ready</div>
              <div className="text-2xs text-text-muted">Restart to apply.</div>
              <button onClick={restart} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-mac bg-accent text-accent-fg text-xs font-semibold hover:opacity-90 transition-opacity">
                <RefreshCw size={12} />
                Restart Now
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <div className="rounded-mac border border-[#ff453a]/25 bg-[#ff453a]/10 px-3 py-2 text-xs text-[#ff453a]">{error || "Update check failed."}</div>
              <button onClick={check} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-mac border border-border text-xs font-semibold text-text-primary hover:bg-surface-2 transition-colors">
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}