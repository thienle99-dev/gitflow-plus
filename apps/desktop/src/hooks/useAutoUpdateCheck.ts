import { useEffect } from "react";
import { toast } from "sonner";
import { useUIStore } from "@/stores/ui";

const AUTO_UPDATE_LAST_CHECK_KEY = "gitflowAutoUpdateLastCheck";
const AUTO_UPDATE_LAST_NOTIFIED_VERSION_KEY = "gitflowAutoUpdateLastNotifiedVersion";
const AUTO_UPDATE_MODE_KEY = "gitflowAutoUpdateMode";
export type AutoUpdateMode = "auto-download" | "notify-only" | "disabled";
const AUTO_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const AUTO_UPDATE_START_DELAY_MS = 5_000;

export function getAutoUpdateMode(): AutoUpdateMode {
  return (localStorage.getItem(AUTO_UPDATE_MODE_KEY) as AutoUpdateMode) || "notify-only";
}

export function setAutoUpdateMode(mode: AutoUpdateMode) {
  localStorage.setItem(AUTO_UPDATE_MODE_KEY, mode);
}

export function useAutoUpdateCheck(enabled: boolean) {
  const openDialog = useUIStore((s) => s.openDialog);
  const setPendingUpdateVersion = useUIStore((s) => s.setPendingUpdateVersion);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(async () => {
      const mode = getAutoUpdateMode();
      if (mode === "disabled") return;

      const now = Date.now();
      const lastCheck = Number(localStorage.getItem(AUTO_UPDATE_LAST_CHECK_KEY) || "0");
      if (Number.isFinite(lastCheck) && now - lastCheck < AUTO_UPDATE_CHECK_INTERVAL_MS) {
        return;
      }

      localStorage.setItem(AUTO_UPDATE_LAST_CHECK_KEY, String(now));

      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!update) return;

        const lastNotifiedVersion = localStorage.getItem(AUTO_UPDATE_LAST_NOTIFIED_VERSION_KEY);
        if (lastNotifiedVersion === update.version) return;

        localStorage.setItem(AUTO_UPDATE_LAST_NOTIFIED_VERSION_KEY, update.version);
        setPendingUpdateVersion(update.version);

        if (mode === "auto-download") {
          toast.info(`Downloading v${update.version}…`, {
            description: "The update will be installed automatically. Restart to apply.",
            duration: 8_000,
          });
          try {
            await update.downloadAndInstall(() => {});
            toast.success(`v${update.version} installed. Restart to apply.`, {
              duration: 15_000,
              action: {
                label: "Restart Now",
                onClick: async () => {
                  const { relaunch } = await import("@tauri-apps/plugin-process");
                  await relaunch();
                },
              },
            });
          } catch (dlErr) {
            console.debug("[updater] auto-download failed", dlErr);
            toast.error("Auto-download failed. You can retry from Settings.");
          }
        } else {
          toast.info(`GitFlow v${update.version} is available`, {
            description: "Open settings to download and install the update.",
            duration: 12_000,
            action: {
              label: "Open Settings",
              onClick: () => openDialog("settings"),
            },
          });
        }
      } catch (err) {
        console.debug("[updater] auto check failed", err);
      }
    }, AUTO_UPDATE_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, openDialog, setPendingUpdateVersion]);
}
