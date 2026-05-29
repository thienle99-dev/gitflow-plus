import { useEffect } from "react";
import type { LayoutState } from "@/lib/graph-layout";

const ROW_HEIGHT = 28;
const NODE_RADIUS = 3.5;
const MAX_GRAPH_COLUMN_WIDTH = 260;
const LABEL_OFFSET = 12;
const BUFFER_ROWS = 10;
const GRAPH_LEFT_PADDING = 18;
const BADGE_GAP = 8;

interface RenderParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  layout: LayoutState | null;
  scrollTop: number;
  containerHeight: number;
  containerWidth: number;
  selectedCommit: string | null;
  hoveredLane: number | null;
  totalLanes: number;
}

export function useCanvasRenderer({
  canvasRef,
  layout,
  scrollTop,
  containerHeight,
  containerWidth,
  selectedCommit,
  hoveredLane,
  totalLanes,
}: RenderParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || layout.commits.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const laneWidth = getLaneWidth(totalLanes);
    const width = Math.max(containerWidth, MAX_GRAPH_COLUMN_WIDTH + 320);
    const height = containerHeight;

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

    const styles = getComputedStyle(document.documentElement);
    const textPrimary = styles.getPropertyValue("--text-primary").trim() || "#e5e5e5";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endRow = Math.min(
      layout.commits.length,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS,
    );

    const visible = layout.commits.slice(startRow, endRow);
    const commitByHash = new Map(layout.commits.map((commit) => [commit.hash, commit]));
    const offsetY = -scrollTop;
    const visibleMaxLane = visible.reduce((max, commit) => Math.max(max, commit.lane), 0);
    const visibleGraphWidth = visibleMaxLane * laneWidth + GRAPH_LEFT_PADDING + 18;
    const graphColumnWidth = Math.min(
      MAX_GRAPH_COLUMN_WIDTH,
      visibleGraphWidth,
    );
    const messageX = Math.max(84, graphColumnWidth + 22);

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

    // Edges. Iterate all loaded edges and clip by viewport so long-running lanes
    // stay visible even when their source commit has scrolled out of view.
    for (const commit of layout.commits) {
      const cy = commit.y + offsetY;
      for (let i = 0; i < commit.parentLanes.length; i++) {
        const parentLane = commit.parentLanes[i];
        const parent = commitByHash.get(commit.parents[i]);
        if (parent && parent.y <= commit.y) {
          continue;
        }
        const py = parent ? parent.y + offsetY : cy + ROW_HEIGHT;
        if (Math.max(cy, py) < -ROW_HEIGHT || Math.min(cy, py) > height + ROW_HEIGHT) {
          continue;
        }
        ctx.beginPath();
        ctx.strokeStyle = commit.color;
        ctx.globalAlpha = 0.72;
        ctx.lineWidth = 1.35;
        if (parentLane === commit.lane) {
          const x = laneXFor(commit.lane, laneWidth);
          ctx.moveTo(x, cy);
          ctx.lineTo(x, py);
        } else {
          const x = laneXFor(commit.lane, laneWidth);
          const px = laneXFor(parentLane, laneWidth);
          const bendY = Math.min(py, cy + ROW_HEIGHT * 0.58);
          ctx.moveTo(x, cy);
          ctx.bezierCurveTo(x, bendY, px, bendY, px, bendY);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
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

    // Labels + ref badges
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
      const badgeStartX = refs.length > 0
        ? Math.max(messageX + 120, width - totalBadgeWidth - 18)
        : width - 18;
      const maxTextWidth = Math.max(80, badgeStartX - messageX - BADGE_GAP);
      const msg = truncateText(ctx, commit.message, maxTextWidth);
      ctx.fillText(msg, messageX, cy);

      // Ref badges
      let badgeX = badgeStartX;
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
  }, [canvasRef, layout, scrollTop, containerHeight, containerWidth, selectedCommit, hoveredLane, totalLanes]);
}

function laneXFor(lane: number, laneWidth: number) {
  return lane * laneWidth + GRAPH_LEFT_PADDING;
}

function getLaneWidth(totalLanes: number) {
  if (totalLanes <= 1) return 12;
  const available = MAX_GRAPH_COLUMN_WIDTH - GRAPH_LEFT_PADDING - 16;
  return Math.max(8, Math.min(12, available / Math.max(1, totalLanes - 1)));
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
