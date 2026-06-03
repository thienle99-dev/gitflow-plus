import { useEffect } from "react";
import { Toaster } from "sonner";
import { applyTheme, useRepoStore } from "./stores/repo";
import RepoView from "./pages/RepoView";
import TrayPanelView from "./pages/TrayPanelView";
import { ErrorProvider } from "./lib/ErrorContext";
import ErrorBoundary from "./components/ui/feedback/ErrorBoundary";

function App() {
  const theme = useRepoStore((s) => s.theme);
  const syncThemeFromStorage = useRepoStore((s) => s.syncThemeFromStorage);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "theme") syncThemeFromStorage();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncThemeFromStorage);
    window.addEventListener("gitflow-settings-updated", syncThemeFromStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncThemeFromStorage);
      window.removeEventListener("gitflow-settings-updated", syncThemeFromStorage);
    };
  }, [syncThemeFromStorage]);

  const isTrayWindow = window.location.search.includes("window=tray");

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
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--color-surface-2, #1e1e2e)",
              color: "var(--color-text-primary, #cdd6f4)",
              border: "1px solid var(--color-border, #45475a)",
              fontSize: "12px",
              borderRadius: "8px",
            },
            classNames: {
              error: "sonner-error",
              success: "sonner-success",
            },
          }}
          richColors
          closeButton
        />
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
