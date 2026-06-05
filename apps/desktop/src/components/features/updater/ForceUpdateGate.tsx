import { useCallback, useEffect, useRef, useState } from "react";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { AlertTriangle, Check, Download, Loader2, RefreshCw } from "lucide-react";
import { fetchLatestReleaseForceUpdate, isForceUpdateReleaseBody } from "@/lib/force-update";

type ForceUpdateStatus = "checking" | "hidden" | "required" | "downloading" | "ready" | "error";

interface ForceUpdateState {
  status: ForceUpdateStatus;
  version: string;
  body: string;
  progress: number;
  error: string | null;
}

const initialState: ForceUpdateState = {
  status: "checking",
  version: "",
  body: "",
  progress: 0,
  error: null,
};

export default function ForceUpdateGate({ enabled }: { enabled: boolean }) {
  const updateRef = useRef<Update | null>(null);
  const totalBytesRef = useRef(0);
  const [state, setState] = useState<ForceUpdateState>(initialState);

  const checkRequiredUpdate = useCallback(async () => {
    if (!enabled) {
      setState((prev) => ({ ...prev, status: "hidden" }));
      return;
    }

    setState((prev) => ({ ...prev, status: "checking", error: null }));
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        updateRef.current = null;
        setState((prev) => ({ ...prev, status: "hidden" }));
        return;
      }

      const manifestForce = isForceUpdateReleaseBody(update.body);
      let body = update.body || "";
      let forced = manifestForce;

      try {
        const latest = await fetchLatestReleaseForceUpdate(update.version);
        forced = forced || latest.forced;
        body = latest.body || body;
      } catch (releaseErr) {
        console.debug("[force-update] release metadata check failed", releaseErr);
      }

      if (!forced) {
        updateRef.current = null;
        setState((prev) => ({ ...prev, status: "hidden" }));
        return;
      }

      updateRef.current = update;
      setState({
        status: "required",
        version: update.version,
        body,
        progress: 0,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.debug("[force-update] update check failed", err);
      setState((prev) => (
        prev.version
          ? { ...prev, status: "error", error: message }
          : { ...prev, status: "hidden", error: null }
      ));
    }
  }, [enabled]);

  useEffect(() => {
    const timer = window.setTimeout(checkRequiredUpdate, 1_500);
    return () => window.clearTimeout(timer);
  }, [checkRequiredUpdate]);

  const downloadAndInstall = async () => {
    const update = updateRef.current;
    if (!update) {
      await checkRequiredUpdate();
      return;
    }

    totalBytesRef.current = 0;
    let downloadedBytes = 0;
    setState((prev) => ({ ...prev, status: "downloading", progress: 0, error: null }));

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytesRef.current = event.data.contentLength;
          setState((prev) => ({ ...prev, progress: 0 }));
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const total = totalBytesRef.current;
          if (total > 0) {
            setState((prev) => ({
              ...prev,
              progress: Math.min(99, Math.round((downloadedBytes / total) * 100)),
            }));
          }
        } else if (event.event === "Finished") {
          setState((prev) => ({ ...prev, progress: 100 }));
        }
      });
      setState((prev) => ({ ...prev, status: "ready", progress: 100 }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, status: "error", error: message }));
    }
  };

  const restart = async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, status: "error", error: `Restart failed: ${message}` }));
    }
  };

  if (!enabled || state.status === "hidden" || state.status === "checking") {
    return null;
  }

  const isDownloading = state.status === "downloading";
  const isReady = state.status === "ready";
  const isError = state.status === "error";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-xl">
      <div className="w-[min(520px,92vw)] rounded-2xl border border-border-60 bg-surface-0 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-40 bg-surface-1-40">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent-10 text-accent flex items-center justify-center border border-accent-20 shrink-0">
              {isReady ? <Check size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text-primary">Required update</h2>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                GitFlow v{state.version} is required before you can continue using the app.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {state.body && (
            <div className="max-h-44 overflow-y-auto rounded-mac border border-border-40 bg-surface-1-40 px-3 py-2">
              <pre className="whitespace-pre-wrap text-2xs leading-relaxed text-text-secondary font-sans">
                {state.body}
              </pre>
            </div>
          )}

          {isDownloading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 size={13} className="animate-spin text-accent" />
                <span>Downloading and installing update... {state.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${state.progress}%` }} />
              </div>
            </div>
          )}

          {isError && (
            <div className="rounded-mac border border-[#ff453a]/25 bg-[#ff453a]/10 px-3 py-2 text-xs text-[#ff453a]">
              {state.error || "Update failed. Please retry."}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            {isReady ? (
              <button
                type="button"
                onClick={restart}
                className="inline-flex h-8 items-center gap-1.5 rounded-mac bg-accent px-4 text-xs font-semibold text-accent-fg hover:opacity-90 transition-opacity"
              >
                Restart Now
              </button>
            ) : (
              <>
                {isError && (
                  <button
                    type="button"
                    onClick={checkRequiredUpdate}
                    className="inline-flex h-8 items-center gap-1.5 rounded-mac border border-border bg-surface-1 px-3 text-xs font-semibold text-text-primary hover:bg-surface-2 transition-colors"
                  >
                    <RefreshCw size={12} />
                    Retry Check
                  </button>
                )}
                <button
                  type="button"
                  onClick={downloadAndInstall}
                  disabled={isDownloading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-mac bg-accent px-4 text-xs font-semibold text-accent-fg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {isDownloading ? "Installing..." : "Download & Install"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
