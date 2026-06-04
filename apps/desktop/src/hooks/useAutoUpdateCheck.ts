import { useEffect } from "react";
import { toast } from "sonner";
import { useUIStore } from "@/stores/ui";

const AUTO_UPDATE_LAST_CHECK_KEY = "gitflowAutoUpdateLastCheck";
const AUTO_UPDATE_LAST_NOTIFIED_VERSION_KEY = "gitflowAutoUpdateLastNotifiedVersion";
const AUTO_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const AUTO_UPDATE_START_DELAY_MS = 5_000;

export function useAutoUpdateCheck(enabled: boolean) {
  const openDialog = useUIStore((s) => s.openDialog);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(async () => {
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
        toast.info(`GitFlow Desktop v${update.version} is available`, {
          description: "Open settings to download and install the update.",
          duration: 12_000,
          action: {
            label: "Open Settings",
            onClick: () => openDialog("settings"),
          },
        });
      } catch (err) {
        console.debug("[updater] auto check failed", err);
      }
    }, AUTO_UPDATE_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, openDialog]);
}
