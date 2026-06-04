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
}

const initialTheme = readStoredTheme();
applyTheme(initialTheme);

interface RepoState {
  repoPath: string | null;
  selectedRef: string | null;
  recentRepos: string[];
  theme: Theme;
  openRepo: (path: string) => void;
  closeRepo: () => void;
  selectRef: (ref: string | null) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  syncThemeFromStorage: () => void;
  removeRecentRepo: (path: string) => void;
}

export const useRepoStore = create<RepoState>((set) => ({
  repoPath: null,
  selectedRef: null,
  recentRepos: JSON.parse(localStorage.getItem("recentRepos") || "[]"),
  theme: initialTheme,

  openRepo: (path) =>
    set((state) => {
      startRepoOpenMeasurement(path);
      const recent = [
        path,
        ...state.recentRepos.filter((r) => r !== path),
      ].slice(0, 10);
      localStorage.setItem("recentRepos", JSON.stringify(recent));
      return { repoPath: path, selectedRef: null, recentRepos: recent };
    }),

  closeRepo: () => set({ repoPath: null, selectedRef: null }),

  selectRef: (ref) => set({ selectedRef: ref }),

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

  syncThemeFromStorage: () => {
    const theme = readStoredTheme();
    applyTheme(theme);
    set({ theme });
  },

  removeRecentRepo: (path) =>
    set((state) => {
      const recent = state.recentRepos.filter((r) => r !== path);
      localStorage.setItem("recentRepos", JSON.stringify(recent));
      return { recentRepos: recent };
    }),
}));
