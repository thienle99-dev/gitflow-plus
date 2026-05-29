import { create } from "zustand";

export type Theme = "dark" | "light" | "gruvbox-dark" | "gruvbox-dark-soft" | "gruvbox-dark-hard" | "gruvbox-light" | "gruvbox-light-soft";

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
}

export const useRepoStore = create<RepoState>((set) => ({
  repoPath: null,
  selectedRef: null,
  recentRepos: JSON.parse(localStorage.getItem("recentRepos") || "[]"),
  theme: (localStorage.getItem("theme") as Theme) || "dark",

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
      return { theme: next };
    }),

  setTheme: (theme: Theme) => {
    localStorage.setItem("theme", theme);
    set({ theme });
  },
}));
