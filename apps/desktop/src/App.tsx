import { useEffect } from "react";
import { useRepoStore } from "./stores/repo";
import RepoView from "./pages/RepoView";
import { ErrorProvider } from "./lib/ErrorContext";

const THEME_CLASSES = [
  "dark",
  "gruvbox-dark",
  "gruvbox-dark-soft",
  "gruvbox-dark-hard",
  "gruvbox-light",
  "gruvbox-light-soft",
];

function App() {
  const theme = useRepoStore((s) => s.theme);

  useEffect(() => {
    const el = document.documentElement;
    THEME_CLASSES.forEach((c) => el.classList.remove(c));
    if (theme !== "light") el.classList.add(theme);
  }, [theme]);

  return (
    <ErrorProvider>
      <RepoView />
    </ErrorProvider>
  );
}

export default App;
