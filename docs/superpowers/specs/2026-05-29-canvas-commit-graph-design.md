# Canvas Commit Graph — Design Spec

**Date:** 2026-05-29  
**Status:** Approved  
**Scope:** Replace SVG-based CommitGraph with Canvas 2D renderer for performance at 5k–20k commits

---

## Problem

Current SVG renderer creates thousands of DOM nodes (`<circle>`, `<path>`, `<text>`) even with virtual scroll. At 5k+ commits the browser layout engine slows down significantly on scroll and on initial paint. `computeGraphLayout` also re-runs on the full commit array every time a new page loads (O(n²) total).

---

## Approach

Canvas 2D + virtual scroll (single `<canvas>`, draw only visible rows on each state change). No continuous `requestAnimationFrame` loop — redraw is triggered only when deps change (`layout`, `scrollTop`, `selectedCommit`, `hoveredLane`).

---

## Architecture

### Files changed / created

| File | Change |
|---|---|
| `components/graph/CommitGraph.tsx` | Slim container: owns scroll, data fetching, hit-test state. Renders `<canvas>` + DOM overlays |
| `components/graph/useCanvasRenderer.ts` | New hook: all draw logic, takes canvas ref + render params, returns nothing |
| `components/graph/useHitTest.ts` | New hook: mouse→commit mapping, hover lane, tooltip state |
| `lib/graph-layout.ts` | Add incremental update: accept `prevState` to append new pages without recomputing old ones |

### Data flow

```
useGitLog (infinite query)
  → pages.flat() → commits[]
  → computeGraphLayout(commits, prevState?) → LayoutCommit[] + LaneState
  → CanvasGraph receives: layout, scrollTop, containerHeight, selectedCommit, hoveredLane
  → useCanvasRenderer draws visible window on canvas
  → useHitTest maps mouse events → commit/lane
  → DOM overlays: Tooltip (absolute div), ContextMenu (existing component)
```

---

## Render Loop

`useCanvasRenderer` runs inside a `useEffect` with deps `[layout, scrollTop, containerHeight, selectedCommit, hoveredLane]`.

Draw order per frame:
1. `ctx.clearRect(0, 0, width, height)`
2. Compute `visibleRange` from `scrollTop` + `containerHeight` + `BUFFER` (10 rows)
3. **Edges** — for each visible commit, draw lines/bezier curves to parent lanes. Use `ctx.beginPath` + `ctx.stroke` batched by color to minimize state changes.
4. **Hover lane highlight** — semi-transparent vertical stripe over hovered lane
5. **Nodes** — `ctx.arc` circles, fill color = commit color, stroke white if selected
6. **Labels** — `ctx.fillText`, truncated at 60 chars, `font = "12px system-ui"`
7. **Ref badges** — `ctx.fillRect` (rounded via `ctx.roundRect`) + `ctx.fillText` for badge labels

Canvas `height` = `totalCommits * ROW_HEIGHT` (tall canvas, scrolled via container div). Canvas `width` = `totalLanes * LANE_WIDTH + LABEL_OFFSET + 400`.

DPR scaling: multiply canvas pixel dimensions by `window.devicePixelRatio`, scale ctx with `ctx.scale(dpr, dpr)` for sharp rendering on retina.

---

## Hit Testing

All mouse events on the `<canvas>` element.

```
row index  = Math.floor((offsetY + scrollTop) / ROW_HEIGHT)
commit     = layout.commits[rowIndex]
```

- **click** → `selectCommit(commit.hash)`
- **mousemove** → set `hoveredCommit` (for tooltip) + `hoveredLane` (for lane highlight), triggers canvas redraw
- **mouseleave** → clear hover state
- **contextmenu** → set `ctxMenu` state with `{ x: clientX, y: clientY, hash }`, show existing `ContextMenu` component

---

## Tooltip

DOM `<div>` absolutely positioned over the canvas container, shown when `hoveredCommit !== null`. Contains: short hash, author, relative date. Not drawn on canvas — avoids canvas redraw on every mouse move pixel.

Position: `{ left: clientX + 12, top: clientY - 8 }`, clamped to viewport edges.

---

## Incremental Layout

`computeGraphLayout` signature changes to:

```ts
function computeGraphLayout(
  newCommits: Commit[],
  prev?: { commits: LayoutCommit[]; laneMap: Map<string, number>; nextLane: number }
): { commits: LayoutCommit[]; laneMap: Map<string, number>; nextLane: number }
```

When `prev` is provided, start `i` offset from `prev.commits.length`, reuse `laneMap` and `nextLane`. Append results to `prev.commits`. This makes each page load O(page_size) instead of O(total).

`CommitGraph` stores layout state in a `useRef` (not `useState`) to avoid extra renders, updates it when new pages arrive.

---

## Interactions Summary

| Interaction | Implementation |
|---|---|
| Click commit | Hit test → `selectCommit` |
| Context menu | Hit test → DOM ContextMenu component |
| Hover tooltip | Hit test → DOM tooltip overlay |
| Highlight branch lane | `hoveredLane` state → canvas redraw with lane stripe |
| Scroll | Container div `onScroll` → `scrollTop` state → canvas redraw |
| Load more | Scroll threshold → `fetchNextPage` (unchanged) |

---

## What Does NOT Change

- `useGitLog` infinite query (unchanged)
- `ContextMenu` component (unchanged)
- Skeleton loading state (unchanged)
- `useGitStatus`, `useGitBranches`, all other queries (unchanged)
- Rust backend (unchanged)

---

## Out of Scope

- OffscreenCanvas / Web Worker (not needed at 20k commits)
- Tile caching
- Search/filter highlight on graph (Phase 2)
- Zoom levels
