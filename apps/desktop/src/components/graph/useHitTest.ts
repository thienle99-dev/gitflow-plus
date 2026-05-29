import { useCallback, useState } from "react";
import type { LayoutState, LayoutCommit } from "@/lib/graph-layout";

const ROW_HEIGHT = 32;

export interface HoverState {
  commit: LayoutCommit | null;
  lane: number | null;
  x: number;
  y: number;
}

export function useHitTest(layout: LayoutState | null, scrollTop: number) {
  const [hover, setHover] = useState<HoverState>({ commit: null, lane: null, x: 0, y: 0 });

  const commitAtY = useCallback((offsetY: number): LayoutCommit | null => {
    if (!layout) return null;
    const row = Math.floor((offsetY + scrollTop) / ROW_HEIGHT);
    return layout.commits[row] ?? null;
  }, [layout, scrollTop]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const commit = commitAtY(e.nativeEvent.offsetY);
    setHover({
      commit,
      lane: commit?.lane ?? null,
      x: e.clientX,
      y: e.clientY,
    });
  }, [commitAtY]);

  const handleMouseLeave = useCallback(() => {
    setHover({ commit: null, lane: null, x: 0, y: 0 });
  }, []);

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
