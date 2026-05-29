import { useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useCommitChangedFiles, useGitLog } from "@/queries/useGitLog";
import { GitCommit, User, Clock, ArrowRight, FilePlus, FileMinus, FileEdit, Shuffle } from "lucide-react";

export default function CommitDetail() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const selectFile = useUIStore((s) => s.selectFile);
  const { data } = useGitLog(repoPath);
  const { data: changedFiles, isLoading: filesLoading, error: filesError } =
    useCommitChangedFiles(repoPath, selectedCommit);

  const commit = useMemo(
    () => data?.pages.flat().find((c) => c.hash === selectedCommit),
    [data, selectedCommit],
  );

  if (!commit) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Select a commit to view details
      </div>
    );
  }

  const formatDate = (date: string) => {
    const normalized = date.replace(
      /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
      "$1T$2$3:$4",
    );
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) {
      return date;
    }
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

      <div className="flex-1 px-3 py-2">
        <div className="text-xs font-medium text-text-primary mb-1">
          Changed Files{changedFiles ? ` (${changedFiles.length})` : ""}
        </div>
        {filesLoading ? (
          <div className="text-2xs text-text-muted">Loading files...</div>
        ) : filesError ? (
          <div className="text-2xs text-[#ff375f]">Unable to load changed files</div>
        ) : changedFiles && changedFiles.length > 0 ? (
          <div className="space-y-[1px]">
            {changedFiles.map((file) => (
              <button
                key={`${file.status}:${file.old_path || ""}:${file.path}`}
                className="list-item w-full flex items-center gap-2 px-2 py-[3px] text-left"
                onClick={() => selectFile(file.path)}
                title={file.old_path ? `${file.old_path} -> ${file.path}` : file.path}
              >
                {statusIcon(file.status)}
                <span className={`w-4 text-center text-2xs font-mono ${statusColor(file.status)}`}>
                  {statusLabel(file.status)}
                </span>
                <span className="text-xs truncate flex-1">
                  {file.old_path ? `${file.old_path} -> ${file.path}` : file.path}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-2xs text-text-muted">No changed files</div>
        )}
      </div>
    </div>
  );
}

function statusIcon(status: string) {
  switch (status) {
    case "added": return <FilePlus size={12} className="text-[#30d158]" />;
    case "deleted": return <FileMinus size={12} className="text-[#ff375f]" />;
    case "renamed":
    case "copied": return <Shuffle size={12} className="text-[#64d2ff]" />;
    default: return <FileEdit size={12} className="text-[#ff9f0a]" />;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "added": return "A";
    case "deleted": return "D";
    case "renamed": return "R";
    case "copied": return "C";
    case "typechange": return "T";
    case "unmerged": return "U";
    default: return "M";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "added": return "text-[#30d158]";
    case "deleted": return "text-[#ff375f]";
    case "renamed":
    case "copied": return "text-[#64d2ff]";
    default: return "text-[#ff9f0a]";
  }
}
