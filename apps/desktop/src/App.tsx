import { useEffect } from "react";
import { applyTheme, useRepoStore } from "./stores/repo";
import RepoView from "./pages/RepoView";
import TrayPanelView from "./pages/TrayPanelView";
import { ErrorProvider } from "./lib/ErrorContext";
import ErrorBoundary from "./components/ui/feedback/ErrorBoundary";

function App() {
  const theme = useRepoStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isTrayWindow = window.location.search.includes("window=tray");

  return (
    <ErrorBoundary>
      <ErrorProvider>
        {isTrayWindow ? <TrayPanelView /> : <RepoView />}
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
