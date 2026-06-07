import { create } from "zustand";

export interface WorkspaceTab {
  path: string;
  name: string;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activePath: string | null;
  railCollapsed: boolean;
  addTab: (path: string) => void;
  removeTab: (path: string) => void;
  setActive: (path: string) => void;
  closeOthers: (path: string) => void;
  closeAll: () => void;
  toggleRailCollapsed: () => void;
}

function repoName(path: string): string {
  return path.split(/[/\\]/).filter(Boolean).pop() || path;
}

const LS_KEY = "gitflowWorkspaceTabs";

function loadTabs(): WorkspaceTab[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTabs(tabs: WorkspaceTab[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(tabs)); } catch {}
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: loadTabs(),
  activePath: null,
  railCollapsed: false,

  toggleRailCollapsed: () => set((s) => ({ railCollapsed: !s.railCollapsed })),

  addTab: (path) => {
    set((state) => {
      const exists = state.tabs.some((t) => t.path === path);
      if (exists) return { activePath: path };
      const tab: WorkspaceTab = { path, name: repoName(path) };
      const tabs = [...state.tabs, tab];
      saveTabs(tabs);
      return { tabs, activePath: path };
    });
  },

  removeTab: (path) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.path !== path);
      saveTabs(tabs);
      let activePath = state.activePath;
      if (activePath === path) {
        activePath = tabs.length > 0 ? tabs[tabs.length - 1].path : null;
      }
      return { tabs, activePath };
    });
  },

  setActive: (path) => {
    set({ activePath: path });
  },

  closeOthers: (path) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.path === path);
      const tabs = tab ? [tab] : [];
      saveTabs(tabs);
      return { tabs, activePath: path };
    });
  },

  closeAll: () => {
    saveTabs([]);
    set({ tabs: [], activePath: null });
  },
}));
