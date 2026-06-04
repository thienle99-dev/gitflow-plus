import { create } from "zustand";

export type OperationStatus = "running" | "completed" | "failed" | "cancelled";
export type OperationType = "git" | "ai";

export interface Operation {
  id: string;
  type: OperationType;
  label: string;
  detail?: string;
  status: OperationStatus;
  startedAt: number;
  endedAt?: number;
  error?: string;
}

interface OperationsState {
  operations: Operation[];
  isOpen: boolean;
  maxHistory: number;

  // Actions
  addOperation: (op: Omit<Operation, "status" | "startedAt"> & { status?: OperationStatus; startedAt?: number }) => void;
  updateOperation: (id: string, updates: Partial<Pick<Operation, "status" | "detail" | "error" | "endedAt">>) => void;
  removeOperation: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

export const useOperationsStore = create<OperationsState>((set, get) => ({
  operations: [],
  isOpen: false,
  maxHistory: 50,

  addOperation: (op) =>
    set((state) => {
      const operation: Operation = {
        ...op,
        status: op.status ?? "running",
        startedAt: op.startedAt ?? Date.now(),
      };
      return {
        operations: [operation, ...state.operations].slice(0, state.maxHistory),
      };
    }),

  updateOperation: (id, updates) =>
    set((state) => ({
      operations: state.operations.map((op) =>
        op.id === id ? { ...op, ...updates } : op,
      ),
    })),

  removeOperation: (id) =>
    set((state) => ({
      operations: state.operations.filter((op) => op.id !== id),
    })),

  clearCompleted: () =>
    set((state) => ({
      operations: state.operations.filter((op) => op.status === "running"),
    })),

  clearAll: () => set({ operations: [] }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (open) => set({ isOpen: open }),
}));
