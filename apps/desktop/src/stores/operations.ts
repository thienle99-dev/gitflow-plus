import { create } from "zustand";
import { api } from "@/api/tauri";

export type OperationStatus = "running" | "completed" | "failed" | "cancelled";
export type OperationType = "git" | "ai";

export interface OperationProgress {
  phase: string;
  percent: number;
  message: string;
}

export interface Operation {
  id: string;
  type: OperationType;
  label: string;
  detail?: string;
  status: OperationStatus;
  startedAt: number;
  endedAt?: number;
  error?: string;
  /** If set, this operation can be cancelled via the backend */
  cancelable?: boolean;
  /** Real-time progress from git stderr */
  progress?: OperationProgress;
}

interface OperationsState {
  operations: Operation[];
  isOpen: boolean;
  maxHistory: number;

  // Actions
  addOperation: (op: Omit<Operation, "status" | "startedAt"> & { status?: OperationStatus; startedAt?: number }) => void;
  updateOperation: (id: string, updates: Partial<Pick<Operation, "status" | "detail" | "error" | "endedAt">>) => void;
  updateProgress: (id: string, progress: OperationProgress) => void;
  removeOperation: (id: string) => void;
  cancelOperation: (id: string) => Promise<void>;
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

  updateProgress: (id, progress) =>
    set((state) => ({
      operations: state.operations.map((op) =>
        op.id === id ? { ...op, progress, detail: progress.message } : op,
      ),
    })),

  removeOperation: (id) =>
    set((state) => ({
      operations: state.operations.filter((op) => op.id !== id),
    })),

  cancelOperation: async (id) => {
    const op = get().operations.find((o) => o.id === id);
    if (!op || op.status !== "running") return;
    set((state) => ({
      operations: state.operations.map((o) =>
        o.id === id ? { ...o, status: "cancelled" as const, endedAt: Date.now() } : o,
      ),
    }));
    // Tell the backend to kill the process
    if (op.cancelable) {
      api.remote.cancelOp(id).catch(() => {});
    }
  },

  clearCompleted: () =>
    set((state) => ({
      operations: state.operations.filter((op) => op.status === "running"),
    })),

  clearAll: () => set({ operations: [] }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (open) => set({ isOpen: open }),
}));

/**
 * Track a direct (non-React-Query) async operation in the operations store.
 * If `apiMethod` is provided, passes an operationId to the backend for cancellation.
 * Listens for `git-progress` events when the operation is cancellable.
 */
export function trackRemoteOp(
  label: string,
  fn: (operationId?: string) => Promise<any>,
  options?: { cancelable?: boolean },
): Promise<any> {
  const id = `remote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  useOperationsStore.getState().addOperation({
    id,
    type: "git",
    label,
    cancelable: options?.cancelable ?? true,
  });

  // Listen for progress events from the backend
  let unlisten: (() => void) | undefined;
  if (options?.cancelable !== false) {
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ operation_id: string; phase: string; percent: number; message: string }>(
        "git-progress",
        (event) => {
          if (event.payload.operation_id === id) {
            useOperationsStore.getState().updateProgress(id, {
              phase: event.payload.phase,
              percent: event.payload.percent,
              message: event.payload.message,
            });
          }
        },
      ).then((fn) => { unlisten = fn; });
    });
  }

  return fn(id).then(
    (result) => {
      unlisten?.();
      useOperationsStore.getState().updateOperation(id, { status: "completed", endedAt: Date.now() });
      return result;
    },
    (error) => {
      unlisten?.();
      const state = useOperationsStore.getState().operations.find((o) => o.id === id);
      // Don't mark as failed if already cancelled by user
      if (state?.status !== "cancelled") {
        useOperationsStore.getState().updateOperation(id, {
          status: "failed",
          endedAt: Date.now(),
          error: error?.message ?? String(error),
        });
      }
      if (state?.status !== "cancelled") throw error;
    }
  );
}
