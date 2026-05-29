# Canvas Commit Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SVG-based CommitGraph with a Canvas 2D renderer that handles 5k–20k commits smoothly.

**Architecture:** A single `<canvas>` element renders only the visible rows on each state change (no continuous loop). Hit-testing maps mouse coordinates to commits via row index math. DOM overlays (tooltip, context menu) sit on top of the canvas for interactions that don't need canvas redraws.

**Tech Stack:** React 18, TypeScript, Canvas 2D API, TanStack Query (infinite), Zustand, Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/graph-layout.ts` | Modify | Add incremental layout (accept prev state, append only new commits) |
| `src/components/graph/useCanvasRenderer.ts` | Create | All canvas draw logic |
| `src/components/graph/useHitTest.ts` | Create | Mouse→commit mapping, hover state |
| `src/components/graph/CommitGraph.tsx` | Modify | Replace SVG with canvas + wire new hooks |
| `src/components/graph/Tooltip.tsx` | Create | DOM tooltip overlay |
| `src/lib/graph-layout.test.ts` | Create | Unit tests for layout + incremental update |

---

### Task 1: Incremental graph layout

**Files:**
- Modify: `src/lib/graph-layout.ts`
- Create: `src/lib/graph-layout.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/desktop/src/lib/graph-layout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeGraphLayout } from "./graph-layout";
import type { Commit } from "@/api/tauri";

function makeCommit(hash: string, parents: string[]): Commit {
  return { hash, parents, author: "a", email: "a@a.com", date: "2024-01-01", message: hash, refs: [] };
}

describe("computeGraphLayout", () => {
  it("assigns lane 0 to first commit", () => {
    const commits = [makeCommit("aaa", [])];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].lane).toBe(0);
  });

  it("linear history stays on lane 0", () => {
    const commits = [makeCommit("bbb", ["aaa"]), makeCommit("aaa", [])];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].lane).toBe(0);
    expect(result.commits[1].lane).toBe(0);
  });

  it("merge commit gets new lane for second parent", () => {
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", []),
      makeCommit("feat", []),
    ];
    const result = computeGraphLayout(commits);
    expect(result.commits[1].lane).not.toBe(result.commits[2].lane);
  });

  it("incremental: appending new commits reuses laneMap", () => {
    const first = [makeCommit("bbb", ["aaa"]), makeCommit("aaa", [])];
    const prev = computeGraphLayout(first);

    const next = [makeCommit("ccc", ["bbb"])];
    const result = computeGraphLayout(next, prev);

    expect(result.commits.length).toBe(3);
    expect(result.commits[2].lane).toBe(0); // ccc continues lane 0
  });

  it("incremental: y offset continues from prev", () => {
    const first = [makeCommit("aaa", [])];
    const prev = computeGraphLayout(first);

    const next = [makeCommit("bbb", ["aaa"])];
    const result = computeGraphLayout(next, prev);

    expect(result.commits[1].y).toBe(16 + 32); // ROW_HEIGHT=32, center offset=16
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/desktop && pnpm vitest run src/lib/graph-layout.test.ts
```

Expected: failures on incremental tests (function signature doesn't accept `prev` yet).

- [ ] **Step 3: Update `graph-layout.ts` to support incremental updates**

Replace `src/lib/graph-layout.ts` with:

```ts
import type { Commit, Ref } from "@/api/tauri";

const COLORS = [
  "#0a84ff", "#30d158", "#ff9f0a", "#bf5af2", "#ff375f",
  "#64d2ff", "#ffd60a", "#5e5ce6", "#ff6482", "#00c7be",
];

export interface LayoutCommit {
  hash: string;
  message: string;
  refs: Ref[];
  lane: number;
  y: number;
  x: number;
  parentLanes: number[];
  color: string;
}

export interface LayoutState {
  commits: LayoutCommit[];
  laneMap: Map<string, number>;
  laneColors: Map<number, string>;
  nextLane: number;
}

export function computeGraphLayout(
  commits: Commit[],
  prev?: LayoutState,
): LayoutState {
  const laneMap = prev ? new Map(prev.laneMap) : new Map<string, number>();
  const laneColors = prev ? new Map(prev.laneColors) : new Map<number, string>();
  let nextLane = prev?.nextLane ?? 0;
  const yOffset = prev ? prev.commits.length * 32 : 0;

  const newCommits: LayoutCommit[] = [];

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const y = yOffset + i * 32 + 16;

    const lane = laneMap.get(commit.hash) ?? nextLane++;
    laneMap.set(commit.hash, lane);

    if (!laneColors.has(lane)) {
      laneColors.set(lane, COLORS[lane % COLORS.length]);
    }

    const parentLanes = commit.parents.map((parent, parentIndex) => {
      const parentLane = parentIndex === 0
        ? lane
        : laneMap.get(parent) ?? nextLane++;
      laneMap.set(parent, parentLane);
      return parentLane;
    });

    newCommits.push({
      hash: commit.hash,
      message: commit.message,
      refs: commit.refs || [],
      lane,
      y,
      x: lane * 24 + 24,
      parentLanes,
      color: laneColors.get(lane) || COLORS[0],
    });
  }

  return {
    commits: prev ? [...prev.commits, ...newCommits] : newCommits,
    laneMap,
    laneColors,
    nextLane,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/desktop && pnpm vitest run src/lib/graph-layout.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/graph-layout.ts apps/desktop/src/lib/graph-layout.test.ts
git commit -m "feat: incremental graph layout with persistent laneMap"
```

---

### Task 2: Hit-test hook

**Files:**
- Create: `src/components/graph/useHitTest.ts`

- [ ] **Step 1: Create `useHitTest.ts`**

Create `apps/desktop/src/components/graph/useHitTest.ts`:

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/desktop && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/graph/useHitTest.ts
git commit -m "feat: canvas hit-test hook for commit selection and hover"
```

---

### Task 3: Canvas renderer hook

**Files:**
- Create: `src/components/graph/useCanvasRenderer.ts`

- [ ] **Step 1: Create `useCanvasRenderer.ts`**

Create `apps/desktop/src/components/graph/useCanvasRenderer.ts`:

```ts
import { useEffect } from "react";
import type { LayoutState } from "@/lib/graph-layout";

const ROW_HEIGHT = 32;
const NODE_RADIUS = 5;
const LANE_WIDTH = 24;
const LABEL_OFFSET = 12;
const BUFFER_ROWS = 10;

interface RenderParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  layout: LayoutState | null;
  scrollTop: number;
  containerHeight: number;
  selectedCommit: string | null;
  hoveredLane: number | null;
  totalLanes: number;
}

export function useCanvasRenderer({
  canvasRef,
  layout,
  scrollTop,
  containerHeight,
  selectedCommit,
  hoveredLane,
  totalLanes,
}: RenderParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || layout.commits.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = totalLanes * LANE_WIDTH + LABEL_OFFSET + 400;
    const height = containerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endRow = Math.min(
      layout.commits.length,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS,
    );

    const visible = layout.commits.slice(startRow, endRow);
    const offsetY = -scrollTop;

    // Hover lane highlight
    if (hoveredLane !== null) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      const laneX = hoveredLane * LANE_WIDTH + LABEL_OFFSET;
      ctx.fillRect(laneX - 8, 0, LANE_WIDTH, height);
    }

    // Edges
    for (const commit of visible) {
      const cy = commit.y + offsetY;
      for (const parentLane of commit.parentLanes) {
        const py = cy + ROW_HEIGHT;
        ctx.beginPath();
        ctx.strokeStyle = commit.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        if (parentLane === commit.lane) {
          ctx.moveTo(commit.x, cy);
          ctx.lineTo(commit.x, py);
        } else {
          const px = parentLane * LANE_WIDTH + LANE_WIDTH / 2 + LABEL_OFFSET;
          ctx.moveTo(commit.x, cy);
          ctx.bezierCurveTo(commit.x, cy + ROW_HEIGHT * 0.5, px, py - ROW_HEIGHT * 0.5, px, py);
        }
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    // Nodes
    for (const commit of visible) {
      const cy = commit.y + offsetY;
      const isSelected = commit.hash === selectedCommit;

      ctx.beginPath();
      ctx.arc(commit.x, cy, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#ffffff" : commit.color;
      ctx.fill();
      ctx.strokeStyle = commit.color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    }

    // Labels + ref badges
    ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    for (const commit of visible) {
      const cy = commit.y + offsetY;
      const labelX = commit.x + LABEL_OFFSET + 8;

      const msg = commit.message.length > 60
        ? commit.message.slice(0, 60) + "…"
        : commit.message;

      ctx.fillStyle = "var(--text-primary, #e5e5e5)";
      ctx.fillText(msg, labelX, cy);

      // Ref badges
      let badgeX = labelX + Math.min(commit.message.length, 60) * 6.5 + 8;
      for (const ref of commit.refs) {
        const label = ref.ref_type === "remote"
          ? ref.name.split("/").slice(1).join("/")
          : ref.name;
        const truncated = label.length > 12 ? label.slice(0, 11) + "…" : label;
        const badgeW = truncated.length * 7 + 8;

        const badgeColor =
          ref.ref_type === "head" ? "#ff9f0a"
          : ref.ref_type === "tag" ? "#bf5af2"
          : ref.ref_type === "remote" ? "#636366"
          : "#0a84ff";

        ctx.fillStyle = badgeColor;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(badgeX, cy - 7, badgeW, 14, 3);
          ctx.fill();
        } else {
          ctx.fillRect(badgeX, cy - 7, badgeW, 14);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
        ctx.fillText(truncated, badgeX + 4, cy);
        ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

        badgeX += badgeW + 4;
      }
    }
  }, [canvasRef, layout, scrollTop, containerHeight, selectedCommit, hoveredLane, totalLanes]);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/desktop && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/graph/useCanvasRenderer.ts
git commit -m "feat: canvas 2D renderer hook for commit graph"
```

---

### Task 4: Tooltip component

**Files:**
- Create: `src/components/graph/Tooltip.tsx`

- [ ] **Step 1: Create `Tooltip.tsx`**

Create `apps/desktop/src/components/graph/Tooltip.tsx`:

```tsx
import type { LayoutCommit } from "@/lib/graph-layout";

interface TooltipProps {
  commit: LayoutCommit;
  x: number;
  y: number;
}

export default function Tooltip({ commit, x, y }: TooltipProps) {
  const date = (() => {
    try {
      return new Date(commit.refs.length ? commit.refs[0].name : "").toLocaleDateString();
    } catch {
      return "";
    }
  })();

  return (
    <div
      className="fixed z-50 pointer-events-none px-2 py-1.5 rounded-mac bg-surface-3 border border-border shadow-lg text-xs space-y-0.5"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="font-mono text-text-muted">{commit.hash.slice(0, 7)}</div>
      <div className="text-text-primary max-w-[240px] truncate">{commit.message}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/desktop && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/graph/Tooltip.tsx
git commit -m "feat: tooltip overlay for canvas commit graph"
```

---

### Task 5: Wire everything in CommitGraph

**Files:**
- Modify: `src/components/graph/CommitGraph.tsx`

- [ ] **Step 1: Rewrite `CommitGraph.tsx`**

Replace the full contents of `apps/desktop/src/components/graph/CommitGraph.tsx`:

```tsx
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitLog } from "@/queries/useGitLog";
import { computeGraphLayout, type LayoutState } from "@/lib/graph-layout";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useHitTest } from "./useHitTest";
import Tooltip from "./Tooltip";
import ContextMenu, { type ContextMenuItem } from "@/components/common/ContextMenu";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const LABEL_OFFSET = 12;
const LOAD_MORE_THRESHOLD = 200;

export default function CommitGraph() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGitLog(repoPath);
  const queryClient = useQueryClient();

  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; hash: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<LayoutState | null>(null);

  // Incremental layout: only compute new pages
  const pages = data?.pages ?? [];
  const layout = useMemo(() => {
    if (pages.length === 0) return null;
    let state: LayoutState | undefined;
    for (const page of pages) {
      state = computeGraphLayout(page, state);
    }
    layoutRef.current = state ?? null;
    return state ?? null;
  }, [pages]);

  const totalHeight = layout ? layout.commits.length * ROW_HEIGHT : 0;
  const totalLanes = layout
    ? layout.commits.reduce((max, c) => Math.max(max, c.lane + 1), 1)
    : 1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { hover, handleMouseMove, handleMouseLeave, handleClick, handleContextMenu } =
    useHitTest(layout, scrollTop);

  useCanvasRenderer({
    canvasRef,
    layout,
    scrollTop,
    containerHeight,
    selectedCommit,
    hoveredLane: hover.lane,
    totalLanes,
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    if (hasNextPage && !isFetchingNextPage &&
      el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const copyHash = async (hash: string) => {
    try { await navigator.clipboard.writeText(hash); } catch { /* fallback */ }
  };

  const ctxItems: ContextMenuItem[] = ctxMenu
    ? [
        { label: "Copy hash", icon: <CopyIcon />, shortcut: "⌘C", action: () => copyHash(ctxMenu.hash) },
        { label: "Checkout", icon: <CheckoutIcon />, action: () => checkoutCommit(ctxMenu.hash) },
        { label: "Create branch here", icon: <BranchIcon />, action: () => createBranchFromCommit(ctxMenu.hash) },
      ]
    : [];

  if (isLoading && !layout) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-[28px] flex items-center px-3 border-b border-border text-xs text-text-muted font-medium">
          <span className="animate-pulse">Loading...</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 border-b border-border/30" style={{ height: ROW_HEIGHT }}>
              <div className="rounded-full bg-surface-2 animate-pulse shrink-0" style={{ width: 10, height: 10, opacity: 1 - i * 0.04 }} />
              <div className="rounded bg-surface-2 animate-pulse" style={{ width: `${30 + ((i * 37) % 40)}%`, height: 8, opacity: 1 - i * 0.04 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const svgWidth = totalLanes * LANE_WIDTH + LABEL_OFFSET + 400;

  return (
    <div className="h-full flex flex-col">
      <div className="h-[28px] flex items-center px-3 border-b border-border text-xs text-text-muted font-medium">
        <div className="flex items-center gap-1">
          {repoPath?.split("/").pop()}
          <span className="text-text-muted">—</span>
          <span className="text-text-secondary">{layout?.commits.length ?? 0} commits</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto relative" onScroll={handleScroll}>
        <div style={{ height: totalHeight, width: svgWidth, position: "relative" }}>
          <canvas
            ref={canvasRef}
            style={{ position: "sticky", top: 0, display: "block", cursor: "pointer" }}
            onClick={(e) => handleClick(e, selectCommit)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onContextMenu={(e) => handleContextMenu(e, (x, y, hash) => setCtxMenu({ x, y, hash }))}
          />
        </div>
      </div>

      {isFetchingNextPage && (
        <div className="h-8 flex items-center justify-center text-xs text-text-muted border-t border-border">
          Loading more commits...
        </div>
      )}

      {hover.commit && (
        <Tooltip commit={hover.commit} x={hover.x} y={hover.y} />
      )}

      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxItems} onClose={() => setCtxMenu(null)} />
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/desktop && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run layout tests**

```bash
cd apps/desktop && pnpm vitest run src/lib/graph-layout.test.ts
```

Expected: all 5 pass.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/graph/CommitGraph.tsx
git commit -m "feat: replace SVG commit graph with Canvas 2D renderer"
```

---

### Task 6: Smoke test in app

- [ ] **Step 1: Start the app**

```bash
cd /path/to/repo && pnpm dev
```

- [ ] **Step 2: Open a repo with 1000+ commits, verify:**
  - Skeleton shows immediately on open
  - Commits render as canvas (inspect element — should be `<canvas>`, not `<svg>`)
  - Scrolling is smooth with no jank
  - Clicking a commit selects it (circle turns white, right panel updates)
  - Hovering shows tooltip with hash + message
  - Right-click shows context menu
  - Hovering a lane shows subtle highlight stripe
  - Scrolling to bottom triggers "Loading more commits..." and appends next 50

- [ ] **Step 3: Commit if all good**

```bash
git add -A
git commit -m "chore: verify canvas commit graph smoke test"
```
