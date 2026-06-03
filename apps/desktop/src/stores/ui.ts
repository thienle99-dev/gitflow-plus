import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  selectedCommit: string | null;
  selectedFile: string | null;
  selectedFileStage: "staged" | "unstaged" | null;
  selectedStashIndex: number | null;
  diffViewMode: "split" | "unified";
  activeDialog: string | null;
  mergeTargetBranch: string | null;
  compareBranchTarget: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  selectCommit: (hash: string | null) => void;
  selectFile: (path: string | null, stage?: "staged" | "unstaged" | null) => void;
  setSelectedStashIndex: (index: number | null) => void;
  setDiffViewMode: (mode: "split" | "unified") => void;
  openDialog: (name: string) => void;
  closeDialog: () => void;
  setMergeTargetBranch: (branch: string | null) => void;
  setCompareBranchTarget: (branch: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: true,
  selectedCommit: null,
  selectedFile: null,
  selectedFileStage: null,
  selectedStashIndex: null,
  diffViewMode: "split",
  activeDialog: null,
  mergeTargetBranch: null,
  compareBranchTarget: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
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
  closeDialog: () => set({ activeDialog: null, mergeTargetBranch: null, compareBranchTarget: null }),
  setMergeTargetBranch: (branch) => set({ mergeTargetBranch: branch }),
  setCompareBranchTarget: (branch) => set({ compareBranchTarget: branch }),
}));
