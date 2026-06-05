import { useEffect } from "react";
import { Toaster } from "sonner";
import { applyTheme, useRepoStore } from "./stores/repo";
import RepoView from "./pages/RepoView";
import TrayPanelView from "./pages/TrayPanelView";
import { ErrorProvider } from "./lib/ErrorContext";
import ErrorBoundary from "./components/ui/feedback/ErrorBoundary";
import { useAutoUpdateCheck } from "./hooks/useAutoUpdateCheck";
import ForceUpdateGate from "./components/features/updater/ForceUpdateGate";

function App() {
  const theme = useRepoStore((s) => s.theme);
  const syncFromStorage = useRepoStore((s) => s.syncFromStorage);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "theme" || event.key === "repoPath" || event.key === "recentRepos") {
        syncFromStorage();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncFromStorage);
    window.addEventListener("gitflow-settings-updated", syncFromStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncFromStorage);
      window.removeEventListener("gitflow-settings-updated", syncFromStorage);
    };
  }, [syncFromStorage]);

  const isTrayWindow = window.location.search.includes("window=tray");
  useAutoUpdateCheck(!isTrayWindow);

  useEffect(() => {
    document.documentElement.classList.toggle("tray-window", isTrayWindow);
    document.body.classList.toggle("tray-window", isTrayWindow);

    return () => {
      document.documentElement.classList.remove("tray-window");
      document.body.classList.remove("tray-window");
    };
  }, [isTrayWindow]);

  return (
    <ErrorBoundary>
      <ErrorProvider>
        {isTrayWindow ? <TrayPanelView /> : <RepoView />}
        <ForceUpdateGate enabled={!isTrayWindow} />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              color: "var(--text-primary)",
              fontSize: "12px",
            },
            classNames: {
              error: "sonner-error",
              success: "sonner-success",
              info: "sonner-info",
            },
          }}
          closeButton
        />
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
