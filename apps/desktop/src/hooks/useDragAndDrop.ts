import { useCallback, useState } from "react";

/**
 * Drag payload discriminated by `kind`. Carried via `dataTransfer` in
 * native HTML5 drag events. Both the source (commit/branch) and the
 * target (commit row / branch row) use this hook so the wire format
 * is symmetric.
 *
 * Format on `dataTransfer`:
 *   application/x-gitflow-commit  → { kind: "commit", hash: string }
 *   application/x-gitflow-branch  → { kind: "branch", name: string, current: boolean }
 *
 * Why custom MIME types: native HTML5 DnD requires a non-empty
 * `dataTransfer.types` for `dragover` to fire `dropEffect = "move"`.
 * Plain text wouldn't tell the drop target what kind of entity
 * arrived.
 */

export type DragKind = "commit" | "branch";

export interface CommitDrag {
  kind: "commit";
  hash: string;
}

export interface BranchDrag {
  kind: "branch";
  name: string;
  current: boolean;
}

export type DragPayload = CommitDrag | BranchDrag;

const MIME_COMMIT = "application/x-gitflow-commit";
const MIME_BRANCH = "application/x-gitflow-branch";

/** Set on a draggable element (commit row in the graph or a branch row in the sidebar). */
export function getDragSourceProps(
  payload: DragPayload,
): {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
} {
  return {
    draggable: true,
    onDragStart: (e) => {
      const mime = payload.kind === "commit" ? MIME_COMMIT : MIME_BRANCH;
      e.dataTransfer.setData(mime, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: (e) => {
      // Clear residual data so it doesn't leak into the next drag.
      e.dataTransfer.clearData(MIME_COMMIT);
      e.dataTransfer.clearData(MIME_BRANCH);
    },
  };
}

/** Hook for the drop target. Tracks whether this target is the active drop zone. */
export function useDropTarget(
  onDrop: (payload: DragPayload, e: React.DragEvent) => void,
): {
  isOver: boolean;
  dropProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
} {
  const [isOver, setIsOver] = useState(false);

  const canAccept = useCallback((e: React.DragEvent): boolean => {
    const types = Array.from(e.dataTransfer.types);
    return types.includes(MIME_COMMIT) || types.includes(MIME_BRANCH);
  }, []);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canAccept(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [canAccept],
  );

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!canAccept(e)) return;
      e.preventDefault();
      setIsOver(true);
    },
    [canAccept],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when we actually leave the target (not when entering a child).
    if (e.currentTarget === e.target) {
      setIsOver(false);
    }
  }, []);

  const onDropHandler = useCallback(
    (e: React.DragEvent) => {
      if (!canAccept(e)) return;
      e.preventDefault();
      setIsOver(false);
      const commitRaw = e.dataTransfer.getData(MIME_COMMIT);
      const branchRaw = e.dataTransfer.getData(MIME_BRANCH);
      const raw = commitRaw || branchRaw;
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as DragPayload;
        onDrop(payload, e);
      } catch {
        // Malformed payload — ignore.
      }
    },
    [canAccept, onDrop],
  );

  return {
    isOver,
    dropProps: { onDragOver, onDragEnter, onDragLeave, onDrop: onDropHandler },
  };
}
