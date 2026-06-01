import { useRepoStore } from "@/stores/repo";
import { useGitBlame } from "@/queries/useGitBlame";
import { GitCommit, Loader2 } from "lucide-react";

interface BlameViewProps {
  filePath: string | null;
  onClose?: () => void;
}

export default function BlameView({ filePath, onClose }: BlameViewProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: blameLines, isLoading, error } = useGitBlame(repoPath, filePath);

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-0">
        <div className="text-xs text-text-muted">Select a file to view blame</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-1">
        <GitCommit size={14} className="text-text-muted" />
        <span className="text-xs font-medium text-text-primary truncate flex-1">
          Blame: {filePath}
        </span>
        {onClose && (
          <button onClick={onClose} className="ghost p-1 text-2xs text-text-muted hover:text-text-primary">
            Close
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="text-text-muted animate-spin" />
            <span className="text-xs text-text-muted ml-2">Loading blame...</span>
          </div>
        )}

        {error && (
          <div className="px-3 py-4 text-xs text-[#ff375f]">
            Error: {error instanceof Error ? error.message : "Failed to load blame"}
          </div>
        )}

        {blameLines && blameLines.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-muted text-center">No blame data available</div>
        )}

        {blameLines && blameLines.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-2xs text-text-muted bg-surface-1 border-b border-border">
                <th className="px-2 py-1 text-left font-medium w-[40px]">Line</th>
                <th className="px-2 py-1 text-left font-medium w-[64px]">Commit</th>
                <th className="px-2 py-1 text-left font-medium w-[120px]">Author</th>
                <th className="px-2 py-1 text-left font-medium w-[90px]">Date</th>
                <th className="px-2 py-1 text-left font-medium">Content</th>
              </tr>
            </thead>
            <tbody>
              {blameLines.map((line) => {
                const commitColor = colorFromHash(line.commit_hash);
                return (
                  <tr
                    key={line.line_number}
                    className="border-b border-border/30 hover:bg-surface-1 transition-colors font-mono text-xs"
                  >
                    <td className="px-2 py-[1px] text-right text-2xs text-text-muted select-none">
                      {line.line_number}
                    </td>
                    <td className="px-2 py-[1px]">
                      <span
                        className="px-1 rounded text-2xs text-white"
                        style={{ backgroundColor: commitColor }}
                      >
                        {line.commit_hash.slice(0, 7)}
                      </span>
                    </td>
                    <td className="px-2 py-[1px] text-2xs text-text-muted truncate" title={line.author}>
                      {line.author}
                    </td>
                    <td className="px-2 py-[1px] text-2xs text-text-muted">
                      {formatShortDate(line.date)}
                    </td>
                    <td className="px-2 py-[1px] text-text-primary whitespace-pre">
                      {line.content}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** Deterministic color from a commit hash */
function colorFromHash(hash: string): string {
  const palette = [
    "#30d158", "#ff9f0a", "#64d2ff", "#bf5af2",
    "#ff375f", "#5e5ce6", "#00c7be", "#ff6482",
  ];
  let sum = 0;
  for (let i = 0; i < Math.min(8, hash.length); i++) {
    sum += hash.charCodeAt(i);
  }
  return palette[sum % palette.length];
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
