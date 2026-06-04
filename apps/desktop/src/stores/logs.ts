import { create } from "zustand";

interface LogsPanelState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

export const useLogsPanelStore = create<LogsPanelState>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
}));
