import { useEffect } from "react";
import { applyTheme, useRepoStore } from "./stores/repo";
import RepoView from "./pages/RepoView";
import { ErrorProvider } from "./lib/ErrorContext";
import ErrorBoundary from "./components/ui/feedback/ErrorBoundary";

function App() {
  const theme = useRepoStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <ErrorProvider>
        <RepoView />
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
