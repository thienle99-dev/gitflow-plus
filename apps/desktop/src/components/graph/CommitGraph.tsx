import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitLog } from "@/queries/useGitLog";
import { computeGraphLayout } from "@/lib/graph-layout";

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
  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
          >
            {/* Edges */}
            {visibleCommits.map((commit) =>
              commit.parentLanes.map((parentLane, i) => {
                const parentIdx = visibleRange.start + i;
                // This is simplified — a real implementation would store parent Y positions
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
                {/* Message label + ref badges */}
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

                {/* Ref badges — SVG rect + text */}
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
    </div>
  );
}
