import { useEffect } from "react";
import { applyTheme, useRepoStore } from "./stores/repo";
import RepoView from "./pages/RepoView";
import { ErrorProvider } from "./lib/ErrorContext";

function App() {
  const theme = useRepoStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ErrorProvider>
      <RepoView />
    </ErrorProvider>
  );
}

export default App;
