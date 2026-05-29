import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitLog } from "@/queries/useGitLog";
import { computeGraphLayout } from "@/lib/graph-layout";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import ContextMenu, { type ContextMenuItem } from "@/components/common/ContextMenu";

const ROW_HEIGHT = 32;
const NODE_RADIUS = 5;
const LANE_WIDTH = 24;
const LABEL_OFFSET = 12;
const BUFFER = 50;

export default function CommitGraph() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const { data: commits } = useGitLog(repoPath);
  const queryClient = useQueryClient();
  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; hash: string } | null>(null);

  const layout = useMemo(() => {
    if (!commits) return null;
    return computeGraphLayout(commits);
  }, [commits]);

  const totalHeight = layout ? layout.commits.length * ROW_HEIGHT : 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, hash: string) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, hash });
  }, []);

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      // fallback
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

  if (!layout || !commits) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Loading commits...
      </div>
    );
  }

  const visibleRange = {
    start: Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER),
    end: Math.min(
      layout.commits.length,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER,
    ),
  };

  const visibleCommits = layout.commits.slice(visibleRange.start, visibleRange.end);
  const totalLanes = Math.max(...layout.commits.map((c) => c.lane + 1), 0);
  const svgWidth = totalLanes * LANE_WIDTH + LABEL_OFFSET + 200;

  const ctxItems: ContextMenuItem[] = ctxMenu
    ? [
        {
          label: "Copy hash",
          icon: <CopyIcon />,
          shortcut: "⌘C",
          action: () => copyHash(ctxMenu.hash),
        },
        {
          label: "Checkout",
          icon: <CheckoutIcon />,
          action: () => checkoutCommit(ctxMenu.hash),
        },
        {
          label: "Create branch here",
          icon: <BranchIcon />,
          action: () => createBranchFromCommit(ctxMenu.hash),
        },
      ]
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="h-[28px] flex items-center px-3 border-b border-border text-xs text-text-muted font-medium">
        <div className="flex items-center gap-1">
          {repoPath?.split("/").pop()}
          <span className="text-text-muted">—</span>
          <span className="text-text-secondary">{commits.length} commits</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <svg
            width={svgWidth}
            height={totalHeight}
            style={{ position: "absolute", top: 0, left: 0 }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Edges */}
            {visibleCommits.map((commit) =>
              commit.parentLanes.map((parentLane, i) => {
                const y1 = commit.y;
                const y2 = commit.y + ROW_HEIGHT;
                return (
                  <path
                    key={`${commit.hash}-${i}`}
                    d={
                      parentLane === commit.lane
                        ? `M ${commit.x} ${y1} L ${commit.x} ${y2}`
                        : `M ${commit.x} ${y1} Q ${(commit.x + parentLane * LANE_WIDTH + LANE_WIDTH / 2 + commit.x) / 2} ${(y1 + y2) / 2}, ${parentLane * LANE_WIDTH + LANE_WIDTH / 2 + LABEL_OFFSET} ${y2}`
                    }
                    stroke={commit.color}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.5}
                  />
                );
              }),
            )}

            {/* Commit nodes */}
            {visibleCommits.map((commit) => (
              <g
                key={commit.hash}
                onClick={() => selectCommit(commit.hash)}
                onContextMenu={(e) => handleContextMenu(e, commit.hash)}
                style={{ cursor: "pointer" }}
              >
                {/* Edge to next row */}
                <line
                  x1={commit.x}
                  y1={commit.y + NODE_RADIUS + 1}
                  x2={commit.x}
                  y2={commit.y + ROW_HEIGHT}
                  stroke={commit.color}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
                {/* Node circle */}
                <circle
                  cx={commit.x}
                  cy={commit.y}
                  r={NODE_RADIUS}
                  fill={selectedCommit === commit.hash ? "#fff" : commit.color}
                  stroke={commit.color}
                  strokeWidth={selectedCommit === commit.hash ? 2 : 1}
                />
                {/* Message label */}
                <text
                  x={commit.x + LABEL_OFFSET}
                  y={commit.y + 4}
                  className="text-xs"
                  fill="var(--text-primary)"
                  dominantBaseline="middle"
                >
                  {commit.message.length > 60
                    ? commit.message.slice(0, 60) + "..."
                    : commit.message}
                </text>

                {/* Ref badges */}
                {commit.refs.map((ref, i) => {
                  const badgeOffset = commit.x + LABEL_OFFSET + 12 + Math.min(commit.message.length, 60) * 6.5;
                  const badgeX = badgeOffset + i * 70;
                  const badgeColor =
                    ref.ref_type === "head"
                      ? "#ff9f0a"
                      : ref.ref_type === "tag"
                        ? "#bf5af2"
                        : ref.ref_type === "remote"
                          ? "#636366"
                          : "var(--accent)";
                  const label = ref.ref_type === "remote"
                    ? ref.name.split("/").slice(1).join("/")
                    : ref.name;
                  return (
                    <g key={`badge-${commit.hash}-${i}`}>
                      <rect
                        x={badgeX}
                        y={commit.y - 6}
                        width={label.length * 7 + 6}
                        height={13}
                        rx={2}
                        fill={badgeColor}
                      />
                      <text
                        x={badgeX + 3}
                        y={commit.y + 1}
                        fill="#fff"
                        fontSize={9}
                        fontWeight={500}
                      >
                        {label.length > 12 ? label.slice(0, 11) + "…" : label}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>

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
