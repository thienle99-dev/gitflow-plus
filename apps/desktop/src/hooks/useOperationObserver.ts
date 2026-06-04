import { useEffect, useRef, useMemo } from "react";
import { useMutationState } from "@tanstack/react-query";
import { useOperationsStore } from "@/stores/operations";
import { labelForMutationKey, operationTypeForKey } from "@/lib/operation-labels";

/** Stable select function — avoids recreating on every render */
function selectMutationState(mutation: any) {
  const s = mutation.state ?? mutation;
  return {
    id: String(mutation.mutationId ?? s.mutationId ?? ""),
    key: mutation.options?.mutationKey ?? s.mutationKey,
    status: s.status,
    submittedAt: s.submittedAt,
    error: s.error,
  };
}

/** Stable filters object */
const MUTATION_FILTERS = {};

/**
 * Observes all React Query mutations globally and syncs them into the
 * operations Zustand store.  Call once at the app root level.
 */
export function useOperationObserver() {
  const addOperation = useOperationsStore((s) => s.addOperation);
  const updateOperation = useOperationsStore((s) => s.updateOperation);
  const seenRef = useRef<Set<string>>(new Set());

  // useMutationState returns state for every mutation in the cache.
  // The `select` receives the raw Mutation object; we read `.state` from it.
  const allStates = useMutationState({
    filters: MUTATION_FILTERS,
    select: selectMutationState,
  });

  useEffect(() => {
    for (const m of allStates) {
      if (!m.id) continue;
      const label = labelForMutationKey(m.key);
      if (!label) continue;

      const opId = `rq-${m.id}`;

      if (!seenRef.current.has(opId)) {
        seenRef.current.add(opId);
        addOperation({
          id: opId,
          type: operationTypeForKey(m.key),
          label,
          startedAt: m.submittedAt ?? Date.now(),
        });
      }

      if (m.status === "success") {
        updateOperation(opId, { status: "completed", endedAt: Date.now() });
      } else if (m.status === "error") {
        updateOperation(opId, {
          status: "failed",
          endedAt: Date.now(),
          error: m.error instanceof Error ? m.error.message : String(m.error ?? "Unknown error"),
        });
      }
    }

    // Prune old entries from seenRef
    if (seenRef.current.size > 200) {
      const activeIds = new Set(useOperationsStore.getState().operations.map((o) => o.id));
      for (const id of seenRef.current) {
        if (!activeIds.has(id)) seenRef.current.delete(id);
      }
    }
  }, [allStates, addOperation, updateOperation]);

  const activeCount = allStates.filter((m: any) => m.status === "pending").length;
  return { activeCount };
}
