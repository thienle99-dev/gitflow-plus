import { useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitLog } from "@/queries/useGitLog";
import { FilePlus, FileMinus, FileEdit, GitCommit, User, Clock, ArrowRight } from "lucide-react";

export default function CommitDetail() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const selectFile = useUIStore((s) => s.selectFile);
  const { data: commits } = useGitLog(repoPath);

  const commit = useMemo(
    () => commits?.find((c) => c.hash === selectedCommit),
    [commits, selectedCommit],
  );

  if (!commit) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Select a commit to view details
      </div>
    );
  }

  const formatDate = (date: string) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0 overflow-y-auto">
      {/* Commit metadata */}
      <div className="px-3 py-2 border-b border-border space-y-1.5">
        <div className="text-xs font-medium text-text-primary leading-tight">
          {commit.message}
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-muted">
          <GitCommit size={10} />
          <span className="font-mono">{commit.hash.slice(0, 7)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-secondary">
          <User size={10} />
          <span>{commit.author}</span>
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-muted">
          <Clock size={10} />
          <span>{formatDate(commit.date)}</span>
        </div>
        {commit.parents.length > 0 && (
          <div className="flex items-center gap-1.5 text-2xs text-text-muted">
            <ArrowRight size={10} />
            <span className="font-mono">
              {commit.parents.map((p) => p.slice(0, 7)).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Changed files placeholder — would come from diff-tree */}
      <div className="flex-1 px-3 py-2">
        <div className="text-xs font-medium text-text-primary mb-1">
          Changed Files
        </div>
        <div className="text-2xs text-text-muted">
          Select a file to view its diff
        </div>
      </div>
    </div>
  );
}
