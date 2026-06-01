import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  selectedCommit: string | null;
  selectedFile: string | null;
  selectedFileStage: "staged" | "unstaged" | null;
  selectedStashIndex: number | null;
  diffViewMode: "split" | "unified";
  activeDialog: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  selectCommit: (hash: string | null) => void;
  selectFile: (path: string | null, stage?: "staged" | "unstaged" | null) => void;
  setSelectedStashIndex: (index: number | null) => void;
  setDiffViewMode: (mode: "split" | "unified") => void;
  openDialog: (name: string) => void;
  closeDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedCommit: null,
  selectedFile: null,
  selectedFileStage: null,
  selectedStashIndex: null,
  diffViewMode: "split",
  activeDialog: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  selectCommit: (hash) => set({
    selectedCommit: hash,
    selectedFile: null,
    selectedFileStage: null,
    activeDialog: null,
  }),
  selectFile: (path, stage = null) => set({
    selectedFile: path,
    selectedFileStage: path ? stage : null,
    activeDialog: null,
  }),
  setSelectedStashIndex: (index) => set({ selectedStashIndex: index }),
  setDiffViewMode: (mode) => set({ diffViewMode: mode }),
  openDialog: (name) => set({ activeDialog: name }),
  closeDialog: () => set({ activeDialog: null }),
}));
