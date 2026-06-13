import { create } from "zustand";
import { startRepoOpenMeasurement } from "@/lib/performance";

export type Theme =
  | "dark"
  | "light"
  | "system"
  | "nord"
  | "tokyo-night"
  | "github-dark"
  | "dracula"
  | "cyberpunk-green"
  | "monokai-pro"
  | "gruvbox-dark"
  | "gruvbox-dark-soft"
  | "gruvbox-dark-hard"
  | "gruvbox-light"
  | "gruvbox-light-soft"
  | "gruvbox-light-hard"
  | "one-dark"
  | "catppuccin-mocha"
  | "rose-pine"
  | "solarized-dark"
  | "macos-26"
  | "macos-26-light";

export const THEME_CLASSES: Theme[] = [
  "dark",
  "light",
  "system",
  "nord",
  "tokyo-night",
  "github-dark",
  "dracula",
  "cyberpunk-green",
  "monokai-pro",
  "gruvbox-dark",
  "gruvbox-dark-soft",
  "gruvbox-dark-hard",
  "gruvbox-light",
  "gruvbox-light-soft",
  "gruvbox-light-hard",
  "one-dark",
  "catppuccin-mocha",
  "rose-pine",
  "solarized-dark",
  "macos-26",
  "macos-26-light",
];

const isDarkTheme = (theme: Theme): boolean => {
  if (theme === "light" || theme.startsWith("gruvbox-light") || theme === "macos-26-light") return false;
  if (theme === "system") {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return true; // All other themes (dark, nord, tokyo-night, github-dark, dracula, cyberpunk-green, monokai-pro, gruvbox-dark*, one-dark, catppuccin-mocha, rose-pine, solarized-dark) are dark.
};

function isTheme(value: string | null): value is Theme {
  return !!value && THEME_CLASSES.includes(value as Theme);
}

export function readStoredTheme(): Theme {
  const storedTheme = localStorage.getItem("theme");
  return isTheme(storedTheme) ? storedTheme : "dark";
}

let systemThemeListener: (() => void) | null = null;

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const targets = [document.documentElement, document.body];

  // Clean up any existing OS theme listener
  if (systemThemeListener && typeof window !== "undefined") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.removeEventListener("change", systemThemeListener);
    systemThemeListener = null;
  }

  const isDark = isDarkTheme(theme);

  for (const target of targets) {
    target.classList.remove(...THEME_CLASSES);
    if (theme !== "light") target.classList.add(theme);
    if (isDark) target.classList.add("dark");
    target.style.colorScheme = isDark ? "dark" : "light";
  }

  // Set up OS prefers-color-scheme listener if system theme is selected
  if (theme === "system" && typeof window !== "undefined") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    systemThemeListener = () => {
      const isSystemDarkNow = media.matches;
      for (const target of targets) {
        if (isSystemDarkNow) {
          target.classList.add("dark");
          target.style.colorScheme = "dark";
        } else {
          target.classList.remove("dark");
          target.style.colorScheme = "light";
        }
      }
    };
    media.addEventListener("change", systemThemeListener);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gitflow-theme-applied", { detail: { theme } }));
  }
}

const initialTheme = readStoredTheme();
applyTheme(initialTheme);

interface RepoTab {
  id: string;
  repoPath: string | null;
  selectedRef: string | null;
}

let tabCounter = 0;
function nextTabId(): string {
  return `tab_${++tabCounter}`;
}

interface RepoState {
  repoPath: string | null;
  selectedRef: string | null;
  recentRepos: string[];
  theme: Theme;
  repos: RepoTab[];
  activeRepoId: string | null;
  openRepo: (path: string) => void;
  closeRepo: () => void;
  switchRepo: (id: string) => void;
  closeTab: (id: string) => void;
  openRepoDialog: () => void;
  selectRef: (ref: string | null) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  syncFromStorage: () => void;
  removeRecentRepo: (path: string) => void;
}

const initialPath = localStorage.getItem("repoPath") || null;
const initialId = nextTabId();
const initialRepos = initialPath
  ? [{ id: initialId, repoPath: initialPath, selectedRef: null }]
  : [];

export const useRepoStore = create<RepoState>((set, get) => ({
  repoPath: initialPath,
  selectedRef: null,
  recentRepos: JSON.parse(localStorage.getItem("recentRepos") || "[]"),
  theme: initialTheme,
  repos: initialRepos,
  activeRepoId: initialPath ? initialId : null,

  openRepo: (path) =>
    set((state) => {
      startRepoOpenMeasurement(path);
      const recent = [path, ...state.recentRepos.filter((r) => r !== path)].slice(0, 10);
      localStorage.setItem("recentRepos", JSON.stringify(recent));
      localStorage.setItem("repoPath", path);

      const existing = state.repos.find((r) => r.repoPath === path);
      if (existing) {
        return { repoPath: path, selectedRef: null, recentRepos: recent, activeRepoId: existing.id };
      }

      const id = nextTabId();
      const tab: RepoTab = { id, repoPath: path, selectedRef: null };

      return {
        repoPath: path,
        selectedRef: null,
        recentRepos: recent,
        repos: [...state.repos, tab],
        activeRepoId: id,
      };
    }),

  closeRepo: () => {
    localStorage.removeItem("repoPath");
    set({ repoPath: null, selectedRef: null, repos: [], activeRepoId: null });
  },

  switchRepo: (id) =>
    set((state) => {
      const tab = state.repos.find((r) => r.id === id);
      if (!tab) return state;
      localStorage.setItem("repoPath", tab.repoPath || "");
      return { repoPath: tab.repoPath, selectedRef: tab.selectedRef, activeRepoId: id };
    }),

  closeTab: (id) =>
    set((state) => {
      const remaining = state.repos.filter((r) => r.id !== id);
      if (remaining.length === 0) {
        localStorage.removeItem("repoPath");
        return { repos: [], activeRepoId: null, repoPath: null, selectedRef: null };
      }
      // If closing active tab, switch to first remaining
      const wasActive = state.activeRepoId === id;
      const nextActive = wasActive ? remaining[0] : state.repos.find((r) => r.id === state.activeRepoId);
      const activeTab = nextActive || remaining[0];
      localStorage.setItem("repoPath", activeTab.repoPath || "");
      return {
        repos: remaining,
        activeRepoId: activeTab!.id,
        repoPath: activeTab!.repoPath,
        selectedRef: activeTab!.selectedRef,
      };
    }),

  openRepoDialog: () => {
    // Lazy import to avoid circular dep
    import("@/stores/ui").then(({ useUIStore }) => {
      useUIStore.getState().openDialog("clone");
    });
  },

  selectRef: (ref) =>
    set((state) => {
      const repos = state.repos.map((r) =>
        r.id === state.activeRepoId ? { ...r, selectedRef: ref } : r,
      );
      return { selectedRef: ref, repos };
    }),

  toggleTheme: () =>
    set((state) => {
      // Toggle based on computed darkness of current theme
      const next = isDarkTheme(state.theme) ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (theme: Theme) => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
    set({ theme });
  },

  syncFromStorage: () => {
    const theme = readStoredTheme();
    applyTheme(theme);
    const repoPath = localStorage.getItem("repoPath") || null;
    set({ theme, repoPath });
  },

  removeRecentRepo: (path) =>
    set((state) => {
      const recent = state.recentRepos.filter((r) => r !== path);
      localStorage.setItem("recentRepos", JSON.stringify(recent));
      return { recentRepos: recent };
    }),
}));

// Cross-window sync: when localStorage changes in another window (main ↔ tray),
// update this window's store accordingly.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "repoPath") {
      const newPath = event.newValue || null;
      useRepoStore.setState({ repoPath: newPath });
    } else if (event.key === "recentRepos") {
      const newRecent = JSON.parse(event.newValue || "[]");
      useRepoStore.setState({ recentRepos: newRecent });
    }
  });
}
