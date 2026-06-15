import { create } from "zustand";

interface RebaseTodoItem {
  action: string;
  commit_hash: string;
  message: string;
}

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
  rebaseTargetCommit: string | null;
  branchToRename: string | null;
  prefilledRebaseTodos: RebaseTodoItem[] | null;
  amendTargetHash: string | null;
  multiCherryPickHashes: string[];
  squashNState: { open: boolean; commitHash: string | null };
  pendingUpdateVersion: string | null;
  setPendingUpdateVersion: (version: string | null) => void;
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
  setBranchToRename: (branch: string | null) => void;
  setRebaseTargetCommit: (hash: string | null) => void;
  setPrefilledRebaseTodos: (todos: RebaseTodoItem[] | null) => void;
  setAmendTargetHash: (hash: string | null) => void;
  toggleMultiCherryPick: (hash: string) => void;
  clearMultiCherryPick: () => void;
  openSquashDialog: (commitHash: string) => void;
  closeSquashDialog: () => void;
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
  branchToRename: null,
  rebaseTargetCommit: null,
  prefilledRebaseTodos: null,
  amendTargetHash: null,
  squashNState: { open: false, commitHash: null },
  pendingUpdateVersion: null,
  multiCherryPickHashes: [],
  setPendingUpdateVersion: (version) => set({ pendingUpdateVersion: version }),

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
  closeDialog: () => set({ activeDialog: null, mergeTargetBranch: null, compareBranchTarget: null, rebaseTargetCommit: null, prefilledRebaseTodos: null, amendTargetHash: null, branchToRename: null }),
  setMergeTargetBranch: (branch) => set({ mergeTargetBranch: branch }),
  setCompareBranchTarget: (branch) => set({ compareBranchTarget: branch }),
  setBranchToRename: (branch) => set({ branchToRename: branch }),
  setRebaseTargetCommit: (hash) => set({ rebaseTargetCommit: hash }),
  setPrefilledRebaseTodos: (todos) => set({ prefilledRebaseTodos: todos }),
  setAmendTargetHash: (hash) => set({ amendTargetHash: hash }),
  toggleMultiCherryPick: (hash) => set((s) => {
    const next = s.multiCherryPickHashes.includes(hash)
      ? s.multiCherryPickHashes.filter((h) => h !== hash)
      : [...s.multiCherryPickHashes, hash];
    return { multiCherryPickHashes: next };
  }),
  clearMultiCherryPick: () => set({ multiCherryPickHashes: [] }),
  openSquashDialog: (commitHash) => set({ squashNState: { open: true, commitHash } }),
  closeSquashDialog: () => set({ squashNState: { open: false, commitHash: null } }),
}));
