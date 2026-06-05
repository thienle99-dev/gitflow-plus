import { useRef, useEffect, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitLog } from "@/queries/useGitLog";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import ContextMenu, { type ContextMenuItem } from "@/components/ui/overlay/ContextMenu";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useHitTest } from "./useHitTest";
import { useGraphLayoutWorker } from "@/lib/useGraphLayoutWorker";
import type { LayoutState } from "@/lib/graph-layout";
import type { GraphRenderIndex } from "./useCanvasRenderer";
import CommitTooltip from "./CommitTooltip";
import { showToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import { formatCommitDate } from "@/lib/date";
import { usePreflightGate } from "@/hooks/usePreflightGate";
import { Search, X } from "lucide-react";

const ROW_HEIGHT = 38;
const EDGE_BLOCK_SIZE = 128;
type CommitFilterScope = "all" | "commit" | "author" | "hash" | "date" | "ref";

const FILTER_SCOPE_OPTIONS: Array<{ value: CommitFilterScope; label: string; placeholder: string }> = [
  { value: "all", label: "All", placeholder: "Filter commits" },
  { value: "commit", label: "Commit", placeholder: "Message text" },
  { value: "author", label: "Author", placeholder: "Author name or email" },
  { value: "hash", label: "Hash", placeholder: "Commit hash" },
  { value: "date", label: "Date", placeholder: "Date, e.g. Jun 3" },
  { value: "ref", label: "Ref", placeholder: "Branch or tag" },
];

export default function CommitGraph() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedRef = useRepoStore((s) => s.selectedRef);
  const theme = useRepoStore((s) => s.theme);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGitLog(repoPath, selectedRef);
  const queryClient = useQueryClient();

  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; hash: string } | null>(null);
  const [confirmCherryPick, setConfirmCherryPick] = useState<string | null>(null);
  const [confirmRevert, setConfirmRevert] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<CommitFilterScope>("all");

  // Preflight gates for risky operations
  const cherryPickGate = usePreflightGate("cherry-pick");
  const revertGate = usePreflightGate("revert");
  const [filterQuery, setFilterQuery] = useState("");

  // Graph layout + render index computed off the main thread via Web Worker
  const { layout, graphIndex } = useGraphLayoutWorker(data, repoPath);
  const filterText = filterQuery.trim().toLowerCase();
  const isFiltering = filterText.length > 0;
  const { visibleLayout, visibleGraphIndex } = useMemo(() => {
    if (!filterText) {
      return { visibleLayout: layout, visibleGraphIndex: graphIndex };
    }
    return createFilteredGraphLayout(layout, filterText, filterScope);
  }, [layout, graphIndex, filterText, filterScope]);
  const commits = visibleLayout.commits;

  // TanStack Virtual — manages scroll position, total size, and infinite loading
  const virtualizer = useVirtualizer({
    count: hasNextPage ? commits.length + 1 : commits.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const scrollTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const totalSize = virtualizer.getTotalSize();

  const totalLanes = useMemo(
    () => visibleLayout.commits.reduce((max, c) => Math.max(max, c.lane + 1), 1),
    [visibleLayout],
  );

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let frame: number | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const measure = (rect?: DOMRectReadOnly) => {
      const width = Math.round(rect?.width ?? el.clientWidth);
      const height = Math.round(rect?.height ?? el.clientHeight);
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      setContainerWidth(width);
      setContainerHeight(height);
    };

    const scheduleMeasure = (rect?: DOMRectReadOnly) => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measure(rect);
      });
    };

    measure();
    scheduleMeasure();
    const observer = new ResizeObserver((entries) => {
      scheduleMeasure(entries[0]?.contentRect);
    });
    const handleWindowResize = () => scheduleMeasure();
    observer.observe(el);
    window.addEventListener("resize", handleWindowResize);
    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      observer.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  // Hit-test hook — hover state + event handlers
  const { hover, handleMouseMove, handleMouseLeave, handleClick, handleContextMenu } =
    useHitTest(visibleLayout, scrollTop);

  // Canvas renderer — redraws whenever deps change
  useCanvasRenderer({
    canvasRef,
    layout: visibleLayout,
    graphIndex: visibleGraphIndex,
    scrollTop,
    containerHeight,
    containerWidth,
    selectedCommit,
    hoveredLane: hover.lane,
    totalLanes,
    theme,
  });

  // Infinite loading — triggered when the last virtual item becomes visible
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (!isFiltering && lastItem.index >= commits.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, fetchNextPage, commits.length, isFiltering]);

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
    const ok = await cherryPickGate.runPreflight();
    if (!ok) return;
    setConfirmCherryPick(hash);
  };

  const doCherryPick = async (hash: string) => {
    setConfirmCherryPick(null);
    try {
      const res = await api.cherryPick.pick(repoPath!, hash);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      } else {
        showToast(`Cherry-pick had conflicts: \n${res.conflicted_files.join("\n")}`, "error");
        queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      }
    } catch (e) {
      console.error(e);
      showToast(`Cherry-pick failed: ${e}`, "error");
    }
  };

  const revertCommit = async (hash: string) => {
    if (!repoPath) return;
    const ok = await revertGate.runPreflight();
    if (!ok) return;
    setConfirmRevert(hash);
  };

  const doRevert = async (hash: string) => {
    setConfirmRevert(null);
    try {
      await api.commit.revert(repoPath!, hash);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    } catch (e) {
      console.error(e);
      showToast(`Revert failed: ${e}`, "error");
    }
  };

  if ((isLoading || commits.length === 0) && !graphIndex.commitByHash.size) {
    return (
      <div className="h-full flex flex-col" role="status" aria-label="Loading commit graph">
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
              className="flex items-center gap-3 px-3 border-b border-border-40"
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
        {
          label: "Revert commit...",
          icon: <RevertIcon />,
          action: () => revertCommit(ctxMenu.hash),
        },
        {
          label: "Squash last N commits...",
          icon: <RevertIcon />,
          action: () => {
            useUIStore.getState().openSquashDialog(ctxMenu.hash);
          },
        },
        {
          label: "Interactive rebase from here...",
          icon: <RevertIcon />,
          action: () => {
            useUIStore.getState().setRebaseTargetCommit(ctxMenu.hash);
            useUIStore.getState().openDialog("interactive-rebase");
          },
        },
      ]
    : [];

  return (
    <>
    <div className="h-full min-h-0 w-full overflow-hidden flex flex-col" role="application" aria-label="Commit graph">
      {/* Header */}
      <div className="min-h-9 flex items-center gap-3 px-3 py-1.5 border-b border-border text-xs text-text-muted font-medium shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {repoPath?.split("/").pop()}
          <span className="text-text-muted">—</span>
          <span className="min-w-0 truncate text-text-secondary">
            {selectedRef || "All Branches"} — {isFiltering ? `${commits.length} of ${layout.commits.length}` : commits.length} commits
          </span>
        </div>
        <div className="flex w-[min(380px,42vw)] min-w-[260px] items-center overflow-hidden rounded border border-border-40 bg-surface-1-30 focus-within:border-accent-60" role="search" aria-label="Filter commits">
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value as CommitFilterScope)}
            className="h-6 w-[86px] shrink-0 border-r border-border-30 bg-transparent px-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary outline-none"
            aria-label="Filter field"
            title="Filter field"
          >
            {FILTER_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-0 flex-1">
            <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-muted-70" />
            <input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={FILTER_SCOPE_OPTIONS.find((option) => option.value === filterScope)?.placeholder}
              className="h-6 w-full bg-transparent pl-7 pr-7 text-[11px] font-medium text-text-primary outline-none placeholder:text-text-muted-60"
              aria-label="Search commits"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded text-text-muted hover:bg-surface-2-60 hover:text-text-primary"
                title="Clear filter"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable graph area — managed by TanStack Virtual */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden"
      >
        {isFiltering && commits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-text-muted">
            <Search size={18} className="text-text-muted-60" />
            <div className="font-semibold text-text-secondary">No loaded commits match</div>
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="h-7 rounded border border-border-40 bg-surface-1-30 px-3 text-2xs font-semibold text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div style={{ minHeight: "100%", height: totalSize, position: "relative" }}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Commit graph visualization. Right-click for context menu."
              style={{ position: "sticky", top: 0, display: "block", cursor: "pointer" }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleClick(e, selectCommit)}
              onContextMenu={(e) =>
                handleContextMenu(e, (x, y, hash) => setCtxMenu({ x, y, hash }))
              }
            />
          </div>
        )}
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

    <ConfirmDialog
      open={!!confirmCherryPick}
      title="Cherry-pick Commit"
      message={`Apply the changes from commit ${confirmCherryPick?.substring(0, 7)} onto the current branch?`}
      impactItems={[
        {
          label: "A new commit will be created with the same changes on the current branch",
          severity: "info",
        },
        {
          label: "May cause conflicts if the changes overlap with current work",
          severity: "warning",
        },
      ]}
      confirmLabel="Cherry-pick"
      cancelLabel="Cancel"
      onConfirm={() => doCherryPick(confirmCherryPick!)}
      onCancel={() => setConfirmCherryPick(null)}
    />
    {cherryPickGate.preflightDialog}
    {revertGate.preflightDialog}
    <ConfirmDialog
      open={!!confirmRevert}
      title="Revert Commit"
      message={`Create a new commit that undoes the changes from ${confirmRevert?.substring(0, 7)}?`}
      impactItems={[
        {
          label: "A new 'revert' commit will be added to the current branch",
          severity: "info",
        },
        {
          label: "The original commit is not removed — this is a forward-fix, not a rewrite",
          severity: "info",
        },
        {
          label: "May cause conflicts if later changes depend on this commit",
          severity: "warning",
        },
      ]}
      confirmLabel="Revert"
      cancelLabel="Cancel"
      variant="destructive"
      onConfirm={() => doRevert(confirmRevert!)}
      onCancel={() => setConfirmRevert(null)}
    />
    </>
  );
}

function createFilteredGraphLayout(
  layout: LayoutState,
  query: string,
  scope: CommitFilterScope,
): { visibleLayout: LayoutState; visibleGraphIndex: GraphRenderIndex } {
  const terms = query.split(/\s+/).filter(Boolean);
  const commits = layout.commits
    .filter((commit) => matchesCommitFilter(commit, terms, scope))
    .map((commit, row) => ({
      ...commit,
      y: row * ROW_HEIGHT + ROW_HEIGHT / 2,
    }));

  const visibleLayout: LayoutState = {
    commits,
    laneMap: layout.laneMap,
    laneColors: layout.laneColors,
    nextLane: layout.nextLane,
  };

  return {
    visibleLayout,
    visibleGraphIndex: buildRenderIndexForVisibleCommits(visibleLayout),
  };
}

function matchesCommitFilter(
  commit: LayoutState["commits"][number],
  terms: string[],
  scope: CommitFilterScope,
) {
  const refText = commit.refs
    .map((ref) => `${ref.name} ${ref.ref_type}`)
    .join(" ");
  const formattedDate = formatFilterDate(commit.date);
  const valuesByScope: Record<CommitFilterScope, string[]> = {
    all: [
      commit.message,
      commit.hash,
      commit.hash.slice(0, 7),
      commit.author,
      commit.email,
      commit.date,
      formattedDate,
      refText,
    ],
    commit: [commit.message],
    author: [commit.author, commit.email],
    hash: [commit.hash, commit.hash.slice(0, 7)],
    date: [commit.date, formattedDate],
    ref: [refText],
  };
  const haystack = valuesByScope[scope].join(" ").toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

function formatFilterDate(date: string) {
  const normalized = date.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
    "$1T$2$3:$4",
  );
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  const displayed = formatCommitDate(date);
  return [
    displayed,
    parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    parsed.toISOString().slice(0, 10),
  ].join(" ");
}

function buildRenderIndexForVisibleCommits(layout: LayoutState): GraphRenderIndex {
  const rowByHash = new Map<string, number>(
    layout.commits.map((commit, row) => [commit.hash, row]),
  );
  const blockCount = Math.max(
    1,
    Math.ceil(Math.max(1, layout.commits.length) / EDGE_BLOCK_SIZE),
  );
  const edgeBlocks: GraphRenderIndex["edgeBlocks"] = Array.from(
    { length: blockCount },
    () => [],
  );
  let edgeId = 0;

  for (let row = 0; row < layout.commits.length; row++) {
    const commit = layout.commits[row];
    for (let parentIndex = 0; parentIndex < commit.parents.length; parentIndex++) {
      const parentRow = rowByHash.get(commit.parents[parentIndex]);
      if (parentRow === undefined || parentRow <= row) continue;

      const edge = {
        id: edgeId++,
        fromRow: row,
        toRow: parentRow,
        fromLane: commit.lane,
        toLane: commit.parentLanes[parentIndex] ?? commit.lane,
        color: commit.color,
      };
      const startBlock = Math.max(0, Math.floor(edge.fromRow / EDGE_BLOCK_SIZE));
      const endBlock = Math.min(
        edgeBlocks.length - 1,
        Math.floor(edge.toRow / EDGE_BLOCK_SIZE),
      );
      for (let block = startBlock; block <= endBlock; block++) {
        edgeBlocks[block].push(edge);
      }
    }
  }

  return {
    commitByHash: new Map(layout.commits.map((commit) => [commit.hash, commit])),
    edgeBlocks,
    blockSize: EDGE_BLOCK_SIZE,
  };
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

function RevertIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}
