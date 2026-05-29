import { create } from "zustand";

type Theme = "dark" | "light";

interface RepoState {
  repoPath: string | null;
  recentRepos: string[];
  theme: Theme;
  openRepo: (path: string) => void;
  closeRepo: () => void;
  toggleTheme: () => void;
}

export const useRepoStore = create<RepoState>((set) => ({
  repoPath: null,
  recentRepos: JSON.parse(localStorage.getItem("recentRepos") || "[]"),
  theme: (localStorage.getItem("theme") as Theme) || "dark",

  openRepo: (path) =>
    set((state) => {
      const recent = [
        path,
        ...state.recentRepos.filter((r) => r !== path),
      ].slice(0, 10);
      localStorage.setItem("recentRepos", JSON.stringify(recent));
      return { repoPath: path, recentRepos: recent };
    }),

  closeRepo: () => set({ repoPath: null }),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return { theme: next };
    }),
}));
