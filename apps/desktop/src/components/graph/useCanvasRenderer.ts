import { useEffect } from "react";
import type { LayoutState } from "@/lib/graph-layout";

const ROW_HEIGHT = 32;
const NODE_RADIUS = 5;
const LANE_WIDTH = 24;
const LABEL_OFFSET = 12;
const BUFFER_ROWS = 10;
const GRAPH_LEFT_PADDING = 24;
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
    const width = Math.max(containerWidth, totalLanes * LANE_WIDTH + LABEL_OFFSET + 320);
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
    const offsetY = -scrollTop;

    // Hover lane highlight
    if (hoveredLane !== null) {
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      const laneX = hoveredLane * LANE_WIDTH + GRAPH_LEFT_PADDING;
      ctx.fillRect(laneX - 10, 0, LANE_WIDTH + 4, height);
    }

    const selected = selectedCommit
      ? visible.find((commit) => commit.hash === selectedCommit)
      : null;
    if (selected) {
      const cy = selected.y + offsetY;
      ctx.fillStyle = "rgba(10,132,255,0.10)";
      ctx.fillRect(0, cy - ROW_HEIGHT / 2, width, ROW_HEIGHT);
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
          const px = parentLane * LANE_WIDTH + GRAPH_LEFT_PADDING;
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
      ctx.lineWidth = isSelected ? 2 : 1.25;
      ctx.stroke();
    }

    // Labels + ref badges
    ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    for (const commit of visible) {
      const cy = commit.y + offsetY;
      const labelX = commit.x + LABEL_OFFSET + 8;
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
        ? Math.max(labelX + 120, width - totalBadgeWidth - 18)
        : width - 18;
      const maxTextWidth = Math.max(80, badgeStartX - labelX - BADGE_GAP);
      const msg = truncateText(ctx, commit.message, maxTextWidth);
      ctx.fillText(msg, labelX, cy);

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
