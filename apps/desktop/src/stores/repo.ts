import { create } from "zustand";

export type Theme =
  | "dark"
  | "light"
  | "gruvbox-dark"
  | "gruvbox-dark-soft"
  | "gruvbox-dark-hard"
  | "gruvbox-light"
  | "gruvbox-light-soft";

export const THEME_CLASSES: Theme[] = [
  "dark",
  "light",
  "gruvbox-dark",
  "gruvbox-dark-soft",
  "gruvbox-dark-hard",
  "gruvbox-light",
  "gruvbox-light-soft",
];

const isDarkTheme = (theme: Theme) => theme === "dark" || theme.startsWith("gruvbox-dark");

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const targets = [document.documentElement, document.body];

  for (const target of targets) {
    target.classList.remove(...THEME_CLASSES);
    if (theme !== "light") target.classList.add(theme);
    if (isDarkTheme(theme)) target.classList.add("dark");
    target.style.colorScheme = isDarkTheme(theme) ? "dark" : "light";
  }
}

const initialTheme = (localStorage.getItem("theme") as Theme) || "dark";
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
  removeRecentRepo: (path: string) => void;
}

export const useRepoStore = create<RepoState>((set) => ({
  repoPath: null,
  selectedRef: null,
  recentRepos: JSON.parse(localStorage.getItem("recentRepos") || "[]"),
  theme: initialTheme,

  openRepo: (path) =>
    set((state) => {
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
      // Cycle: dark → light → dark for toggle
      const next = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (theme: Theme) => {
    localStorage.setItem("theme", theme);
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
