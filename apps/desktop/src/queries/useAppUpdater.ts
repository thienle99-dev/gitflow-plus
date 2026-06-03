import { useState, useCallback, useRef } from "react";
import type { Update, DownloadEvent } from "@tauri-apps/plugin-updater";

export type UpdaterStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error" | "not-available";

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export interface UpdaterState {
  status: UpdaterStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number; // 0-100
  error: string | null;
}

export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>({
    status: "idle",
    updateInfo: null,
    downloadProgress: 0,
    error: null,
  });
  const updateRef = useRef<Update | null>(null);
  const totalBytesRef = useRef<number>(0);

  const checkForUpdates = useCallback(async () => {
    setState({ status: "checking", updateInfo: null, downloadProgress: 0, error: null });

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (update) {
        updateRef.current = update;
        setState({
          status: "available",
          updateInfo: {
            version: update.version,
            date: update.date ?? undefined,
            body: update.body ?? undefined,
          },
          downloadProgress: 0,
          error: null,
        });
      } else {
        setState({ status: "not-available", updateInfo: null, downloadProgress: 0, error: null });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", updateInfo: null, downloadProgress: 0, error: message });
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setState((prev) => ({ ...prev, status: "downloading", downloadProgress: 0, error: null }));
    totalBytesRef.current = 0;

    try {
      let downloadedBytes = 0;

      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytesRef.current = event.data.contentLength;
          setState((prev) => ({ ...prev, downloadProgress: 0 }));
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const total = totalBytesRef.current;
          if (total > 0) {
            setState((prev) => ({
              ...prev,
              downloadProgress: Math.min(99, Math.round((downloadedBytes / total) * 100)),
            }));
          }
        } else if (event.event === "Finished") {
          setState((prev) => ({ ...prev, downloadProgress: 100 }));
        }
      });

      setState((prev) => ({ ...prev, status: "ready", downloadProgress: 100 }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, status: "error", error: message }));
    }
  }, []);

  const relaunch = useCallback(async () => {
    try {
      // Tauri updater plugin installs the update; the app restart is handled by the OS
      // or by invoking the Tauri process relaunch command
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:process|exit", { code: 0 });
    } catch {
      // Fallback: the user may need to restart manually
    }
  }, []);

  const reset = useCallback(() => {
    updateRef.current = null;
    totalBytesRef.current = 0;
    setState({ status: "idle", updateInfo: null, downloadProgress: 0, error: null });
  }, []);

  return {
    ...state,
    checkForUpdates,
    downloadAndInstall,
    relaunch,
    reset,
  };
}
