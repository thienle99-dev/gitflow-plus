import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitLog } from "@/queries/useGitLog";
import { computeGraphLayout, type LayoutState } from "@/lib/graph-layout";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import ContextMenu, { type ContextMenuItem } from "@/components/common/ContextMenu";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useHitTest } from "./useHitTest";
import CommitTooltip from "./CommitTooltip";

const ROW_HEIGHT = 28;
const LOAD_MORE_THRESHOLD = 200; // px from bottom

export default function CommitGraph() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedRef = useRepoStore((s) => s.selectedRef);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGitLog(repoPath, selectedRef);
  const queryClient = useQueryClient();

  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutCacheRef = useRef<{
    pages: NonNullable<typeof data>["pages"];
    layout: LayoutState;
  } | null>(null);

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; hash: string } | null>(null);

  const layout = useMemo(() => {
    const pages = data?.pages ?? [];
    const cache = layoutCacheRef.current;
    let layout: LayoutState | null = null;
    let startPage = 0;

    if (
      cache &&
      cache.pages.length <= pages.length &&
      cache.pages.every((page, index) => page === pages[index])
    ) {
      layout = cache.layout;
      startPage = cache.pages.length;
    }

    for (let i = startPage; i < pages.length; i++) {
      layout = computeGraphLayout(pages[i], layout ?? undefined);
    }

    const nextLayout = layout ?? computeGraphLayout([]);
    layoutCacheRef.current = { pages: [...pages], layout: nextLayout };
    return nextLayout;
  }, [data]);
  const commits = layout.commits;

  const totalHeight = layout.commits.length * ROW_HEIGHT;
  const scrollHeight = Math.max(totalHeight, containerHeight);
  const totalLanes = useMemo(
    () => layout.commits.reduce((max, c) => Math.max(max, c.lane + 1), 1),
    [layout],
  );

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { height, width } = entries[0].contentRect;
      setContainerHeight(height);
      setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Hit-test hook — hover state + event handlers
  const { hover, handleMouseMove, handleMouseLeave, handleClick, handleContextMenu } =
    useHitTest(layout, scrollTop);

  // Canvas renderer — redraws whenever deps change
  useCanvasRenderer({
    canvasRef,
    layout,
    scrollTop,
    containerHeight,
    containerWidth,
    selectedCommit,
    hoveredLane: hover.lane,
    totalLanes,
  });

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      setScrollTop(el.scrollTop);
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      // fallback — clipboard may be unavailable in some WebView contexts
    }
  };

  const checkoutCommit = async (hash: string) => {
    if (!repoPath) return;
    try {
      await api.branches.checkout(repoPath, hash);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    } catch (e) {
      console.error(e);
    }
  };

  const createBranchFromCommit = async (hash: string) => {
    const name = prompt("Branch name:");
    if (!name || !repoPath) return;
    try {
      await api.branches.create(repoPath, name, hash);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
    } catch (e) {
      console.error(e);
    }
  };

  const createTagFromCommit = async (hash: string) => {
    const name = prompt("Tag name:");
    if (!name || !repoPath) return;
    const message = prompt("Tag message (optional):") || "";
    try {
      await api.tag.create(repoPath, name, hash, message);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "tags"] });
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
    } catch (e) {
      console.error(e);
    }
  };

  const cherryPickCommit = async (hash: string) => {
    if (!repoPath) return;
    if (!confirm(`Are you sure you want to cherry-pick commit ${hash.substring(0, 7)}?`)) return;
    try {
      const res = await api.cherryPick.pick(repoPath, hash);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      } else {
        alert(`Cherry-pick had conflicts: \n${res.conflicted_files.join("\n")}`);
        queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      }
    } catch (e) {
      console.error(e);
      alert(`Cherry-pick failed: ${e}`);
    }
  };

  if (isLoading && commits.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-[28px] flex items-center px-3 border-b border-border text-xs text-text-muted font-medium">
          <div className="flex items-center gap-1">
            {repoPath?.split("/").pop()}
            <span className="text-text-muted">—</span>
            <span className="text-text-secondary animate-pulse">Loading...</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 border-b border-border/30"
              style={{ height: ROW_HEIGHT }}
            >
              <div
                className="rounded-full bg-surface-2 animate-pulse shrink-0"
                style={{ width: 10, height: 10, opacity: 1 - i * 0.04 }}
              />
              <div
                className="rounded bg-surface-2 animate-pulse"
                style={{ width: `${30 + ((i * 37) % 40)}%`, height: 8, opacity: 1 - i * 0.04 }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const ctxItems: ContextMenuItem[] = ctxMenu
    ? [
        {
          label: "Copy hash",
          icon: <CopyIcon />,
          shortcut: "⌘C",
          action: () => copyHash(ctxMenu.hash),
        },
        {
          label: "Checkout commit",
          icon: <CheckoutIcon />,
          action: () => checkoutCommit(ctxMenu.hash),
        },
        {
          label: "Create branch here...",
          icon: <BranchIcon />,
          action: () => createBranchFromCommit(ctxMenu.hash),
        },
        {
          label: "Create tag here...",
          icon: <TagIcon />,
          action: () => createTagFromCommit(ctxMenu.hash),
        },
        {
          label: "Cherry-pick commit...",
          icon: <CherryPickIcon />,
          action: () => cherryPickCommit(ctxMenu.hash),
        },
      ]
    : [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-[28px] flex items-center px-3 border-b border-border text-xs text-text-muted font-medium shrink-0">
        <div className="flex items-center gap-1">
          {repoPath?.split("/").pop()}
          <span className="text-text-muted">—</span>
          <span className="text-text-secondary">
            {selectedRef || "All Branches"} — {commits.length} commits
          </span>
        </div>
      </div>

      {/* Scrollable graph area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        {/* Tall div establishes the virtual scroll height */}
        <div style={{ minHeight: "100%", height: scrollHeight, position: "relative" }}>
          {/* Canvas is sticky so it stays in view while the div scrolls behind it */}
          <canvas
            ref={canvasRef}
            style={{ position: "sticky", top: 0, display: "block", cursor: "pointer" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleClick(e, selectCommit)}
            onContextMenu={(e) =>
              handleContextMenu(e, (x, y, hash) => setCtxMenu({ x, y, hash }))
            }
          />
        </div>
      </div>

      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="h-8 flex items-center justify-center text-xs text-text-muted border-t border-border shrink-0">
          Loading more commits...
        </div>
      )}

      {/* Hover tooltip */}
      {hover.commit && (
        <CommitTooltip commit={hover.commit} x={hover.x} y={hover.y} />
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckoutIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function CherryPickIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}
