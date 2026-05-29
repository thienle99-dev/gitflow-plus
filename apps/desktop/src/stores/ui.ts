import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  selectedCommit: string | null;
  selectedFile: string | null;
  diffViewMode: "split" | "unified";
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  selectCommit: (hash: string | null) => void;
  selectFile: (path: string | null) => void;
  setDiffViewMode: (mode: "split" | "unified") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedCommit: null,
  selectedFile: null,
  diffViewMode: "split",

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  selectCommit: (hash) => set({ selectedCommit: hash, selectedFile: null }),
  selectFile: (path) => set({ selectedFile: path }),
  setDiffViewMode: (mode) => set({ diffViewMode: mode }),
}));
