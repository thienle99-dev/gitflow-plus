import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutState, LayoutCommit } from "@/lib/graph-layout";

const ROW_HEIGHT = 28;

export interface HoverState {
  commit: LayoutCommit | null;
  lane: number | null;
  x: number;
  y: number;
}

export function useHitTest(layout: LayoutState | null, scrollTop: number) {
  const [hover, setHover] = useState<HoverState>({ commit: null, lane: null, x: 0, y: 0 });
  const hoverRef = useRef(hover);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const updateHover = useCallback((next: HoverState) => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const current = hoverRef.current;
      if (
        current.commit?.hash === next.commit?.hash &&
        current.lane === next.lane &&
        current.x === next.x &&
        current.y === next.y
      ) {
        return;
      }
      hoverRef.current = next;
      setHover(next);
    });
  }, []);

  const commitAtY = useCallback((offsetY: number): LayoutCommit | null => {
    if (!layout) return null;
    const row = Math.floor((offsetY + scrollTop) / ROW_HEIGHT);
    return layout.commits[row] ?? null;
  }, [layout, scrollTop]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const commit = commitAtY(e.nativeEvent.offsetY);
    updateHover({
      commit,
      lane: commit?.lane ?? null,
      x: e.clientX,
      y: e.clientY,
    });
  }, [commitAtY, updateHover]);

  const handleMouseLeave = useCallback(() => {
    updateHover({ commit: null, lane: null, x: 0, y: 0 });
  }, [updateHover]);

  const handleClick = useCallback((
    e: React.MouseEvent<HTMLCanvasElement>,
    onSelect: (hash: string) => void,
  ) => {
    const commit = commitAtY(e.nativeEvent.offsetY);
    if (commit) onSelect(commit.hash);
  }, [commitAtY]);

  const handleContextMenu = useCallback((
    e: React.MouseEvent<HTMLCanvasElement>,
    onMenu: (x: number, y: number, hash: string) => void,
  ) => {
    e.preventDefault();
    const commit = commitAtY(e.nativeEvent.offsetY);
    if (commit) onMenu(e.clientX, e.clientY, commit.hash);
  }, [commitAtY]);

  return { hover, handleMouseMove, handleMouseLeave, handleClick, handleContextMenu };
}
