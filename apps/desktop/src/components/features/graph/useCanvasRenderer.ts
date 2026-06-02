import { useEffect } from "react";
import type { LayoutState } from "@/lib/graph-layout";
import { logPerformance } from "@/lib/performance";
import type { Theme } from "@/stores/repo";

const ROW_HEIGHT = 28;
const NODE_RADIUS = 3.5;
const MAX_GRAPH_COLUMN_WIDTH = 260;
const BUFFER_ROWS = 10;
const GRAPH_LEFT_PADDING = 18;
const BADGE_GAP = 8;
const HASH_COLUMN_WIDTH = 72;
const AUTHOR_COLUMN_WIDTH = 150;
const DATE_COLUMN_WIDTH = 116;
const COLUMN_GAP = 16;
const RIGHT_PADDING = 18;

export interface GraphEdgeSegment {
  id: number;
  fromRow: number;
  toRow: number;
  fromLane: number;
  toLane: number;
  color: string;
}

export interface GraphRenderIndex {
  commitByHash: Map<string, LayoutState["commits"][number]>;
  edgeBlocks: GraphEdgeSegment[][];
  blockSize: number;
}

interface RenderParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  layout: LayoutState | null;
  graphIndex: GraphRenderIndex | null;
  scrollTop: number;
  containerHeight: number;
  containerWidth: number;
  selectedCommit: string | null;
  hoveredLane: number | null;
  totalLanes: number;
  theme: Theme;
}

export function useCanvasRenderer({
  canvasRef,
  layout,
  graphIndex,
  scrollTop,
  containerHeight,
  containerWidth,
  selectedCommit,
  hoveredLane,
  totalLanes,
  theme,
}: RenderParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || !graphIndex || layout.commits.length === 0) return;
    const startedAt = performance.now();

    const dpr = window.devicePixelRatio || 1;
    const laneWidth = getLaneWidth(totalLanes);
    const scrollContainer = canvas.parentElement?.parentElement;
    const measuredHeight = scrollContainer?.clientHeight || 0;
    const measuredWidth = scrollContainer?.clientWidth || 0;
    const height = Math.max(1, containerHeight, measuredHeight);
    const width = Math.max(1, containerWidth, measuredWidth);
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endRow = Math.min(
      layout.commits.length,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS,
    );

    const visible = layout.commits.slice(startRow, endRow);
    const visibleEdges = getVisibleEdges(graphIndex, startRow, endRow);
    const offsetY = -scrollTop;
    const graphRight = getVisibleGraphRight(visible, visibleEdges, laneWidth);
    const messageX = Math.max(84, graphRight + 24);
    const columns = getColumns(width, messageX);

    const pixelWidth = Math.ceil(width * dpr);
    const pixelHeight = Math.ceil(height * dpr);
    if (canvas.width !== pixelWidth) {
      canvas.width = pixelWidth;
    }
    if (canvas.height !== pixelHeight) {
      canvas.height = pixelHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.body);
    const surface0 = styles.getPropertyValue("--surface-0").trim() || "#1c1c1e";
    const textPrimary = styles.getPropertyValue("--text-primary").trim() || "#e5e5e5";
    const textSecondary = styles.getPropertyValue("--text-secondary").trim() || "#a1a1a6";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = surface0;
    ctx.fillRect(0, 0, width, height);

    // Hover lane highlight
    if (hoveredLane !== null) {
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      const laneX = laneXFor(hoveredLane, laneWidth);
      ctx.fillRect(laneX - 6, 0, laneWidth + 3, height);
    }

    const selected = selectedCommit
      ? visible.find((commit) => commit.hash === selectedCommit)
      : null;
    if (selected) {
      const cy = selected.y + offsetY;
      ctx.fillStyle = "rgba(10,132,255,0.10)";
      ctx.fillRect(0, cy - ROW_HEIGHT / 2, width, ROW_HEIGHT);
    }

    // Edges are indexed by row blocks, so scroll/hover redraws only touch the
    // visible interval instead of scanning the entire loaded history.
    for (const edge of visibleEdges) {
      const cy = edge.fromRow * ROW_HEIGHT + ROW_HEIGHT / 2 + offsetY;
      const py = edge.toRow * ROW_HEIGHT + ROW_HEIGHT / 2 + offsetY;
      if (Math.max(cy, py) < -ROW_HEIGHT || Math.min(cy, py) > height + ROW_HEIGHT) {
        continue;
      }
      ctx.beginPath();
      ctx.strokeStyle = edge.color;
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 1.35;
      if (edge.toLane === edge.fromLane) {
        const x = laneXFor(edge.fromLane, laneWidth);
        ctx.moveTo(x, cy);
        ctx.lineTo(x, py);
      } else {
        const x = laneXFor(edge.fromLane, laneWidth);
        const px = laneXFor(edge.toLane, laneWidth);
        const bendY = Math.min(py, cy + ROW_HEIGHT * 0.58);
        ctx.moveTo(x, cy);
        ctx.bezierCurveTo(x, bendY, px, bendY, px, bendY);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Nodes
    for (const commit of visible) {
      const cy = commit.y + offsetY;
      const isSelected = commit.hash === selectedCommit;
      const x = laneXFor(commit.lane, laneWidth);

      ctx.beginPath();
      ctx.arc(x, cy, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#ffffff" : commit.color;
      ctx.fill();
      ctx.strokeStyle = commit.color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    }

    // Labels + metadata columns
    ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    for (const commit of visible) {
      const cy = commit.y + offsetY;
      const isSelected = commit.hash === selectedCommit;

      ctx.font = `${isSelected ? "600 " : ""}12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
      ctx.fillStyle = isSelected ? "#0a84ff" : textPrimary;
      const refs = commit.refs.slice(0, 3);
      const badgeLabels = refs.map((ref) => {
        const label = ref.ref_type === "remote"
          ? ref.name.split("/").slice(1).join("/")
          : ref.name;
        return label.length > 12 ? label.slice(0, 11) + "…" : label;
      });
      const badgeWidths = refs.map((_, index) => badgeLabels[index].length * 7 + 10);
      const totalBadgeWidth = badgeWidths.reduce((sum, badgeW) => sum + badgeW + 4, 0);
      const maxTextWidth = Math.max(80, columns.hashX - messageX - BADGE_GAP);
      const msg = truncateText(ctx, commit.message, maxTextWidth);
      ctx.fillText(msg, messageX, cy);

      // Ref badges
      if (refs.length > 0 && totalBadgeWidth > 0) {
        const messageWidth = Math.min(ctx.measureText(msg).width, maxTextWidth);
        let badgeX = messageX + messageWidth + BADGE_GAP;

        if (badgeX > messageX + 40 && badgeX + totalBadgeWidth < columns.hashX - BADGE_GAP) {
          for (let i = 0; i < refs.length; i++) {
            const ref = refs[i];
            const truncated = badgeLabels[i];
            const badgeW = badgeWidths[i];
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
            ctx.fillText(truncated, badgeX + 5, cy);
            ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

            badgeX += badgeW + 4;
          }
        }
      }

      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillStyle = isSelected ? "#0a84ff" : textSecondary;
      ctx.fillText(commit.hash.slice(0, 7), columns.hashX, cy);

      ctx.font = "11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.fillStyle = textSecondary;
      ctx.fillText(truncateText(ctx, commit.author || "Unknown", AUTHOR_COLUMN_WIDTH - 8), columns.authorX, cy);
      ctx.fillText(truncateText(ctx, formatCommitDate(commit.date), DATE_COLUMN_WIDTH - 8), columns.dateX, cy);
    }

    logPerformance("graph_canvas_render", performance.now() - startedAt, {
      commits: layout.commits.length,
      visibleRows: visible.length,
      edges: visibleEdges.length,
      width,
      height,
    });
  }, [canvasRef, layout, graphIndex, scrollTop, containerHeight, containerWidth, selectedCommit, hoveredLane, totalLanes, theme]);
}

function getColumns(width: number, messageX: number) {
  const dateX = Math.max(
    messageX + 360 + HASH_COLUMN_WIDTH + AUTHOR_COLUMN_WIDTH + COLUMN_GAP * 3,
    width - DATE_COLUMN_WIDTH - RIGHT_PADDING,
  );
  const authorX = dateX - AUTHOR_COLUMN_WIDTH - COLUMN_GAP;
  const hashX = authorX - HASH_COLUMN_WIDTH - COLUMN_GAP;

  return { hashX, authorX, dateX };
}

function laneXFor(lane: number, laneWidth: number) {
  return lane * laneWidth + GRAPH_LEFT_PADDING;
}

function getVisibleGraphRight(
  visible: LayoutState["commits"],
  visibleEdges: GraphEdgeSegment[],
  laneWidth: number,
) {
  let maxLane = visible.reduce((max, commit) => Math.max(max, commit.lane), 0);

  for (const edge of visibleEdges) {
    maxLane = Math.max(maxLane, edge.fromLane, edge.toLane);
  }

  return laneXFor(maxLane, laneWidth) + NODE_RADIUS;
}

function getVisibleEdges(index: GraphRenderIndex, startRow: number, endRow: number) {
  const startBlock = Math.max(0, Math.floor(startRow / index.blockSize));
  const endBlock = Math.min(index.edgeBlocks.length - 1, Math.floor(Math.max(startRow, endRow - 1) / index.blockSize));
  const seen = new Set<number>();
  const edges: GraphEdgeSegment[] = [];

  for (let block = startBlock; block <= endBlock; block++) {
    const bucket = index.edgeBlocks[block];
    if (!bucket) continue;
    for (const edge of bucket) {
      if (seen.has(edge.id)) continue;
      if (edge.toRow < startRow || edge.fromRow > endRow) continue;
      seen.add(edge.id);
      edges.push(edge);
    }
  }

  return edges;
}

function getLaneWidth(totalLanes: number) {
  if (totalLanes <= 1) return 12;
  const available = MAX_GRAPH_COLUMN_WIDTH - GRAPH_LEFT_PADDING - 16;
  return Math.max(5, Math.min(12, available / Math.max(1, totalLanes - 1)));
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo) + ellipsis;
}

function formatCommitDate(date: string) {
  const normalized = date.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
    "$1T$2$3:$4",
  );
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return date.slice(0, 16);
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
