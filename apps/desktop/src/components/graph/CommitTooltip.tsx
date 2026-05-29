import type { LayoutCommit } from "@/lib/graph-layout";

interface CommitTooltipProps {
  commit: LayoutCommit;
  x: number;
  y: number;
}

export default function CommitTooltip({ commit, x, y }: CommitTooltipProps) {
  const shortHash = commit.hash.slice(0, 7);

  // Keep tooltip inside viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: x + 12,
    top: y - 8,
    zIndex: 100,
    pointerEvents: "none",
    maxWidth: 320,
  };

  return (
    <div
      style={style}
      className="bg-surface-1 border border-border rounded-mac shadow-lg px-3 py-2 text-xs"
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: commit.color + "33", color: commit.color }}
        >
          {shortHash}
        </span>
        {commit.refs.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {commit.refs.map((ref, i) => {
              const label =
                ref.ref_type === "remote"
                  ? ref.name.split("/").slice(1).join("/")
                  : ref.name;
              const truncated = label.length > 20 ? label.slice(0, 19) + "…" : label;
              const badgeColor =
                ref.ref_type === "head"
                  ? "#ff9f0a"
                  : ref.ref_type === "tag"
                    ? "#bf5af2"
                    : ref.ref_type === "remote"
                      ? "#636366"
                      : "#0a84ff";
              return (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                  style={{ backgroundColor: badgeColor }}
                >
                  {truncated}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-text-primary leading-snug break-words">{commit.message}</p>
    </div>
  );
}
