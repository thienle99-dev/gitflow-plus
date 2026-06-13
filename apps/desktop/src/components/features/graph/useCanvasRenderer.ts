import { useEffect, useRef } from "react";
import type { LayoutState } from "@/lib/graph-layout";
import { logPerformance } from "@/lib/performance";
import type { Theme } from "@/stores/repo";
import { useCommitDateFormatter } from "@/lib/date";
import type { GitFlowConfig } from "@/api/tauri";
import { classifyBranch, gitflowBranchColor } from "@/lib/gitflow-helpers";

const ROW_HEIGHT = 38;
const NODE_RADIUS = 4;
const MAX_GRAPH_COLUMN_WIDTH = 260;
const MIN_GRAPH_COLUMN_WIDTH = 48;
const MIN_MESSAGE_COLUMN_WIDTH = 180;
const BUFFER_ROWS = 10;
const GRAPH_LEFT_PADDING = 18;
const BADGE_GAP = 8;
const HASH_COLUMN_WIDTH = 72;
const AUTHOR_COLUMN_WIDTH = 130;
const DATE_COLUMN_WIDTH = 116;
const STATS_COLUMN_WIDTH = 80;
const COLUMN_GAP = 16;
const RIGHT_PADDING = 18;
const AVATAR_SIZE = 22;
const AVATAR_GAP = 8;
const GRAPH_TO_AVATAR_GAP = 24;

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
  focusedHash: string | null;
  multiCherryPickHashes: string[];
  hoveredLane: number | null;
  totalLanes: number;
  theme: Theme;
  gitflowConfig?: GitFlowConfig | null;
}

/* ------------------------------------------------------------------ */
/*  MD5 for Gravatar                                                  */
/* ------------------------------------------------------------------ */

// Minimal MD5 implementation for Gravatar hashes (RFC 1321).
// Only used for email→avatar URL mapping, not for security.
function md5(input: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }

  let n = input.length;
  let state = [1732584193, -271733879, -1732584194, 271733878];
  let i: number;

  for (i = 64; i <= n; i += 64) {
    md5cycle(state, md5blk(input.substring(i - 64, i)));
  }

  input = input.substring(i - 64);
  const tail = Array(16).fill(0);
  for (i = 0; i < input.length; i++) {
    tail[i >> 2] |= input.charCodeAt(i) << ((i % 4) << 3);
  }
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);

  if (i > 55) {
    md5cycle(state, tail);
    for (i = 0; i < 16; i++) tail[i] = 0;
  }

  tail[14] = n * 8;
  md5cycle(state, tail);

  function hex(x: number) {
    const h = "0123456789abcdef";
    let s = "";
    for (let j = 0; j < 4; j++) {
      s += h.charAt((x >> (j * 8 + 4)) & 0x0f) + h.charAt((x >> (j * 8)) & 0x0f);
    }
    return s;
  }

  return hex(state[0]) + hex(state[1]) + hex(state[2]) + hex(state[3]);
}

/* ------------------------------------------------------------------ */
/*  Gravatar avatar image cache                                       */
/* ------------------------------------------------------------------ */

const avatarCache = new Map<string, HTMLImageElement>();
const avatarLoading = new Set<string>();

function getAvatarUrl(email: string, size: number): string {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro`;
}

function loadAvatar(email: string): HTMLImageElement | null {
  if (!email) return null;
  const cached = avatarCache.get(email);
  if (cached) return cached;
  if (avatarLoading.has(email)) return null;

  avatarLoading.add(email);
  const img = new Image(AVATAR_SIZE, AVATAR_SIZE);
  img.crossOrigin = "anonymous";
  img.onload = () => {
    avatarCache.set(email, img);
    avatarLoading.delete(email);
  };
  img.onerror = () => {
    avatarLoading.delete(email);
  };
  img.src = getAvatarUrl(email, AVATAR_SIZE);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

/** Cached CSS custom property values — avoids getComputedStyle on every frame */
let _cachedTheme: string | null = null;
let _cachedSurface0 = "#1c1c1e";
let _cachedTextPrimary = "#e5e5e5";
let _cachedTextSecondary = "#a1a1a6";
let _cachedTextMuted = "#86868b";
let _cachedAccent = "#0a84ff";
let _cachedAccentFg = "#ffffff";
let _cachedSuccess = "#30d158";
let _cachedDanger = "#ff375f";
let _cachedWarning = "#ff9f0a";
let _cachedInfo = "#64d2ff";
let _cachedGraphPalette = ["#0a84ff", "#30d158", "#ff9f0a", "#64d2ff", "#ff375f"];

function readThemeColors(themeKey: string) {
  if (_cachedTheme === themeKey) return;
  _cachedTheme = themeKey;
  const styles = getComputedStyle(document.body);
  _cachedSurface0 = styles.getPropertyValue("--surface-0").trim() || "#1c1c1e";
  _cachedTextPrimary = styles.getPropertyValue("--text-primary").trim() || "#e5e5e5";
  _cachedTextSecondary = styles.getPropertyValue("--text-secondary").trim() || "#a1a1a6";
  _cachedTextMuted = styles.getPropertyValue("--text-muted").trim() || "#86868b";
  _cachedAccent = styles.getPropertyValue("--accent").trim() || "#0a84ff";
  _cachedAccentFg = styles.getPropertyValue("--accent-fg").trim() || "#ffffff";
  _cachedSuccess = styles.getPropertyValue("--success").trim() || "#30d158";
  _cachedDanger = styles.getPropertyValue("--danger").trim() || "#ff375f";
  _cachedWarning = styles.getPropertyValue("--warning").trim() || "#ff9f0a";
  _cachedInfo = styles.getPropertyValue("--info").trim() || "#64d2ff";
  _cachedGraphPalette = [
    _cachedAccent,
    _cachedSuccess,
    _cachedWarning,
    _cachedInfo,
    _cachedDanger,
    _cachedTextMuted,
  ];
}

function laneColor(lane: number) {
  return _cachedGraphPalette[Math.abs(lane) % _cachedGraphPalette.length] || _cachedAccent;
}

/** Resolve the GitFlow branch color for a commit based on its refs. */
function resolveGitFlowColor(
  refs: Array<{ name: string; ref_type: string }>,
  gitflowConfig: GitFlowConfig | null | undefined,
): string | null {
  if (!gitflowConfig?.initialized || !refs.length) return null;
  for (const ref of refs) {
    if (ref.ref_type === "tag") continue;
    const branchType = classifyBranch(ref.name, gitflowConfig);
    if (branchType === "feature" || branchType === "release" || branchType === "hotfix") {
      return gitflowBranchColor(branchType);
    }
  }
  return null;
}

/** Small offscreen canvas used to resolve any CSS color to #rrggbb */
let _colorResolver: HTMLCanvasElement | null = null;
/** Cache resolved CSS color → rgb string to avoid repeated canvas lookups */
const _rgbCache = new Map<string, string>();

function resolveToRgb(color: string): string | null {
  try {
    if (!_colorResolver) {
      _colorResolver = document.createElement("canvas");
      _colorResolver.width = 1;
      _colorResolver.height = 1;
    }
    const ctx = _colorResolver.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillStyle = color;
    // Canvas always resolves to #rrggbb; if invalid, fillStyle stays unchanged
    const resolved = ctx.fillStyle;
    if (resolved === "#000000" && color !== "#000000" && color !== "rgb(0, 0, 0)" && color !== "rgba(0,0,0,0)") {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}

function withAlpha(color: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));

  // Fast path: #hex
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split("").map((char) => char + char).join("")
      : hex[1];
    const value = Number.parseInt(raw, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  // Fast path: rgb/rgba
  const rgba = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(",").map((p) => p.trim()).slice(0, 3);
    return `rgba(${parts.join(", ")}, ${clamped})`;
  }

  // Fast path: hsl/hsla
  const hsla = color.match(/^hsla?\(([^)]+)\)$/i);
  if (hsla) {
    const parts = hsla[1].split(",").map((p) => p.trim());
    return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clamped})`;
  }

  // Fallback: use canvas to resolve any CSS color (oklch, color(), etc.)
  let resolved = _rgbCache.get(color);
  if (!resolved) {
    const canvasResolved = resolveToRgb(color);
    if (canvasResolved) {
      resolved = canvasResolved;
      _rgbCache.set(color, resolved);
    }
  }
  if (resolved) {
    const m = resolved.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const value = Number.parseInt(m[1], 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${clamped})`;
    }
  }

  return color;
}

export function useCanvasRenderer({
  canvasRef,
  layout,
  graphIndex,
  scrollTop,
  containerHeight,
  containerWidth,
  selectedCommit,
  focusedHash,
  multiCherryPickHashes,
  hoveredLane,
  totalLanes,
  theme,
  gitflowConfig,
}: RenderParams) {
  const formatCommitDateHook = useCommitDateFormatter();
  // Track which rows are hovered via mouse position
  const hoveredRowRef = useRef<number | null>(null);

  // Listen for mouse moves on the canvas to track hovered row
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleMove = (e: MouseEvent) => {
      const row = Math.floor((e.offsetY + scrollTop) / ROW_HEIGHT);
      hoveredRowRef.current = row;
    };
    const handleLeave = () => {
      hoveredRowRef.current = null;
    };
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [canvasRef, scrollTop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || !graphIndex || layout.commits.length === 0) return;
    const startedAt = performance.now();

    const dpr = window.devicePixelRatio || 1;
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
    const columns = getColumns(width);
    const metadataLeft = columns.hashX;
    const graphColumnWidth = getGraphColumnWidth(metadataLeft);
    const laneWidth = getLaneWidth(totalLanes, graphColumnWidth);
    const graphRight = getVisibleGraphRight(visible, visibleEdges, laneWidth);
    const compactGraphRight = Math.min(graphRight, graphColumnWidth);
    const graphClipRight = graphColumnWidth + NODE_RADIUS + 8;
    const maxAvatarColumnX = Math.max(
      GRAPH_LEFT_PADDING,
      metadataLeft - MIN_MESSAGE_COLUMN_WIDTH - AVATAR_SIZE - AVATAR_GAP - BADGE_GAP,
    );
    const avatarColumnX = Math.min(
      maxAvatarColumnX,
      Math.max(84, compactGraphRight + GRAPH_TO_AVATAR_GAP),
    );
    const messageX = avatarColumnX + AVATAR_SIZE + AVATAR_GAP;

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

    // Read CSS variables only when theme changes (cached in module-level vars)
    readThemeColors(theme ?? "dark");
    const surface0 = _cachedSurface0;
    const textPrimary = _cachedTextPrimary;
    const textSecondary = _cachedTextSecondary;
    const textMuted = _cachedTextMuted;
    const accent = _cachedAccent;
    const accentFg = _cachedAccentFg;
    const warning = _cachedWarning;
    const danger = _cachedDanger;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = surface0;
    ctx.fillRect(0, 0, width, height);

    // Hover row highlight (subtle background change)
    const hoveredRow = hoveredRowRef.current;
    if (hoveredRow !== null) {
      const hoverY = hoveredRow * ROW_HEIGHT + offsetY + ROW_HEIGHT / 2;
      if (hoverY > -ROW_HEIGHT && hoverY < height + ROW_HEIGHT) {
        ctx.fillStyle = withAlpha(textPrimary, 0.035);
        ctx.fillRect(0, hoverY - ROW_HEIGHT / 2, width, ROW_HEIGHT);
      }
    }

    // Hover lane highlight
    if (hoveredLane !== null) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, graphClipRight, height);
      ctx.clip();
      ctx.fillStyle = withAlpha(accent, 0.08);
      const laneX = laneXFor(hoveredLane, laneWidth);
      ctx.fillRect(laneX - 6, 0, laneWidth + 3, height);
      ctx.restore();
    }

    // Selection glow effect
    const selected = selectedCommit
      ? visible.find((commit) => commit.hash === selectedCommit)
      : null;
    if (selected) {
      const cy = selected.y + offsetY;
      // Outer glow
      const gradient = ctx.createLinearGradient(0, cy - ROW_HEIGHT / 2, 0, cy + ROW_HEIGHT / 2);
      gradient.addColorStop(0, withAlpha(accent, 0));
      gradient.addColorStop(0.15, withAlpha(accent, 0.08));
      gradient.addColorStop(0.5, withAlpha(accent, 0.12));
      gradient.addColorStop(0.85, withAlpha(accent, 0.08));
      gradient.addColorStop(1, withAlpha(accent, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, cy - ROW_HEIGHT / 2 - 2, width, ROW_HEIGHT + 4);

      // Inner highlight
      ctx.fillStyle = withAlpha(accent, 0.1);
      ctx.fillRect(0, cy - ROW_HEIGHT / 2, width, ROW_HEIGHT);

      // Left accent bar
      ctx.fillStyle = withAlpha(accent, 0.6);
      ctx.fillRect(0, cy - ROW_HEIGHT / 2 + 2, 3, ROW_HEIGHT - 4);
    }

    // Focus indicator (keyboard nav) — dashed outline, distinct from selection glow
    const focused = focusedHash
      ? visible.find((commit) => commit.hash === focusedHash)
      : null;
    if (focused && focused.hash !== selectedCommit) {
      const cy = focused.y + offsetY;
      ctx.save();
      ctx.strokeStyle = withAlpha(textPrimary, 0.35);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(0, cy - ROW_HEIGHT / 2, width, ROW_HEIGHT);
      ctx.restore();
    }

    // Edges + nodes are clipped to the graph column so deep trees never cover text columns.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, graphClipRight, height);
    ctx.clip();

    // Edges
    for (const edge of visibleEdges) {
      const cy = edge.fromRow * ROW_HEIGHT + ROW_HEIGHT / 2 + offsetY;
      const py = edge.toRow * ROW_HEIGHT + ROW_HEIGHT / 2 + offsetY;
      if (Math.max(cy, py) < -ROW_HEIGHT || Math.min(cy, py) > height + ROW_HEIGHT) {
        continue;
      }
      ctx.beginPath();
      ctx.strokeStyle = laneColor(edge.fromLane);
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
      const gitflowColor = resolveGitFlowColor(commit.refs, gitflowConfig);
      const commitColor = gitflowColor || laneColor(commit.lane);

      ctx.beginPath();
      ctx.arc(x, cy, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? accentFg : commitColor;
      ctx.fill();
      ctx.strokeStyle = commitColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Multi-cherry-pick indicator — small diamond to right of node
      if (multiCherryPickHashes.includes(commit.hash)) {
        const dx = x + NODE_RADIUS + 6;
        const ds = 3;
        ctx.beginPath();
        ctx.moveTo(dx, cy - ds);
        ctx.lineTo(dx + ds, cy);
        ctx.lineTo(dx, cy + ds);
        ctx.lineTo(dx - ds, cy);
        ctx.closePath();
        ctx.fillStyle = withAlpha(accent, 0.85);
        ctx.fill();
      }
    }

    ctx.restore();

    // Avatars + Labels + metadata columns
    ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    for (const commit of visible) {
      const cy = commit.y + offsetY;
      const isSelected = commit.hash === selectedCommit;

      // Gravatar avatar
      const avatarImg = loadAvatar(commit.email);
      if (avatarImg) {
        const avatarY = cy - AVATAR_SIZE / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarColumnX + AVATAR_SIZE / 2, cy, AVATAR_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, avatarColumnX, avatarY, AVATAR_SIZE, AVATAR_SIZE);
        ctx.restore();
      } else {
        // Placeholder circle while loading
        ctx.beginPath();
        ctx.arc(avatarColumnX + AVATAR_SIZE / 2, cy, AVATAR_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(textMuted, 0.16);
        ctx.fill();
      }

      ctx.font = `${isSelected ? "600 " : ""}12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
      ctx.fillStyle = isSelected ? accent : textPrimary;
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
            const refGitFlowColor = resolveGitFlowColor([ref], gitflowConfig);
            const badgeColor =
              ref.ref_type === "head" ? warning
              : ref.ref_type === "tag" ? danger
              : refGitFlowColor || (ref.ref_type === "remote" ? textMuted : accent);

            ctx.fillStyle = badgeColor;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(badgeX, cy - 7, badgeW, 14, 3);
              ctx.fill();
            } else {
              ctx.fillRect(badgeX, cy - 7, badgeW, 14);
            }

            ctx.fillStyle = accentFg;
            ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
            ctx.fillText(truncated, badgeX + 5, cy);
            ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

            badgeX += badgeW + 4;
          }
        }
      }

      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillStyle = isSelected ? accent : textSecondary;
      ctx.fillText(commit.hash.slice(0, 7), columns.hashX, cy);

      ctx.font = "11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.fillStyle = textSecondary;
      ctx.fillText(truncateText(ctx, commit.author || "Unknown", AUTHOR_COLUMN_WIDTH - 8), columns.authorX, cy);
      ctx.fillText(truncateText(ctx, formatCommitDateHook(commit.date), DATE_COLUMN_WIDTH - 8), columns.dateX, cy);

      // Diff stats
      if (commit.additions > 0 || commit.deletions > 0) {
        const addText = `+${commit.additions}`;
        const delText = `-${commit.deletions}`;
        ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
        const addWidth = ctx.measureText(addText).width;
        const totalWidth = addWidth + ctx.measureText(delText).width + 4;
        const statsX = columns.statsX + Math.max(0, (STATS_COLUMN_WIDTH - totalWidth) / 2);

        if (commit.additions > 0) {
          ctx.fillStyle = "#30d158";
          ctx.fillText(addText, statsX, cy);
        }
        if (commit.deletions > 0) {
          ctx.fillStyle = "#ff375f";
          ctx.fillText(delText, statsX + (commit.additions > 0 ? addWidth + 4 : 0), cy);
        }
      }
    }

    logPerformance("graph_canvas_render", performance.now() - startedAt, {
      commits: layout.commits.length,
      visibleRows: visible.length,
      edges: visibleEdges.length,
      width,
      height,
    });
  }, [canvasRef, layout, graphIndex, scrollTop, containerHeight, containerWidth, selectedCommit, focusedHash, multiCherryPickHashes, hoveredLane, totalLanes, theme, formatCommitDateHook, gitflowConfig]);
}

function getColumns(width: number) {
  // Fixed columns right-to-left: HASH | STATS | AUTHOR | DATE
  const totalFixed = HASH_COLUMN_WIDTH + STATS_COLUMN_WIDTH + AUTHOR_COLUMN_WIDTH + DATE_COLUMN_WIDTH + COLUMN_GAP * 3;
  const padding = RIGHT_PADDING;
  const dateX = Math.max(
    HASH_COLUMN_WIDTH + STATS_COLUMN_WIDTH + AUTHOR_COLUMN_WIDTH + COLUMN_GAP * 3 + padding,
    width - DATE_COLUMN_WIDTH - padding,
  );
  const authorX = dateX - AUTHOR_COLUMN_WIDTH - COLUMN_GAP;
  const statsX = authorX - STATS_COLUMN_WIDTH - COLUMN_GAP;
  const hashX = statsX - HASH_COLUMN_WIDTH - COLUMN_GAP;

  return { hashX, statsX, authorX, dateX };
}

function getGraphColumnWidth(metadataLeft: number) {
  const availableBeforeText = metadataLeft
    - MIN_MESSAGE_COLUMN_WIDTH
    - AVATAR_SIZE
    - AVATAR_GAP
    - COLUMN_GAP;
  return Math.max(
    MIN_GRAPH_COLUMN_WIDTH,
    Math.min(MAX_GRAPH_COLUMN_WIDTH, availableBeforeText),
  );
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

function getLaneWidth(totalLanes: number, graphColumnWidth: number) {
  if (totalLanes <= 1) return 12;
  const available = graphColumnWidth - GRAPH_LEFT_PADDING - NODE_RADIUS - 8;
  return Math.max(2.5, Math.min(12, available / Math.max(1, totalLanes - 1)));
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

