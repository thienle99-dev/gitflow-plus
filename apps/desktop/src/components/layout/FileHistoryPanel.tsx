import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useFileHistory } from "@/queries/useFileHistory";
import { GitCommit, User, Clock, History } from "lucide-react";

export default function FileHistoryPanel() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const { data: commits, isLoading } = useFileHistory(repoPath, selectedFile);

  if (!selectedFile) return null;

  const formatDate = (date: string) => {
    const normalized = date.replace(
      /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
      "$1T$2$3:$4",
    );
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <History size={14} className="text-accent" />
        <span className="text-xs font-semibold text-text-primary flex-1">File History</span>
        <span className="text-2xs text-text-muted font-mono truncate max-w-[200px]">{selectedFile}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="text-xs text-text-muted text-center py-6">Loading history...</div>
        )}
        {!isLoading && (!commits || commits.length === 0) && (
          <div className="text-xs text-text-muted text-center py-6">No commits for this file</div>
        )}
        {commits?.map((commit) => (
          <div
            key={commit.hash}
            onClick={() => selectCommit(commit.hash)}
            className="px-3 py-2 border-b border-border-20 hover:bg-surface-1-30 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <GitCommit size={10} className="text-accent shrink-0" />
              <code className="text-xs font-mono text-accent">{commit.hash.slice(0, 7)}</code>
              <span className="text-xs text-text-muted flex items-center gap-1 ml-auto">
                <Clock size={9} />
                {formatDate(commit.date)}
              </span>
            </div>
            <p className="text-xs text-text-primary mt-1 line-clamp-2">{commit.message}</p>
            <div className="flex items-center gap-1 mt-1 text-2xs text-text-muted">
              <User size={9} />
              <span>{commit.author}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}