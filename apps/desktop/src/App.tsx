import { useEffect } from "react";
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
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
