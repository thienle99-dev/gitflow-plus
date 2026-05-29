import { useEffect } from "react";
import { useRepoStore } from "./stores/repo";
import RepoView from "./pages/RepoView";
import { ErrorProvider } from "./lib/ErrorContext";

function App() {
  const theme = useRepoStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ErrorProvider>
      <RepoView />
    </ErrorProvider>
  );
}

export default App;
