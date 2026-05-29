import { useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useCommitChangedFiles, useGitLog } from "@/queries/useGitLog";
import {
  ArrowRight,
  Clock,
  FileDiff,
  FileMinus,
  FilePlus,
  GitCommit,
  Shuffle,
  User,
} from "lucide-react";

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
            {changedFiles.map((file) => {
              const displayPath = file.old_path ? `${file.old_path} -> ${file.path}` : file.path;
              const fileName = getFileName(file.path);
              const folder = file.old_path
                ? `${getFolder(file.old_path)} -> ${getFolder(file.path)}`
                : getFolder(file.path);
              return (
                <button
                  key={`${file.status}:${file.old_path || ""}:${file.path}`}
                  className="list-item w-full grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2 px-2 py-1.5 text-left"
                  onClick={() => selectFile(file.path)}
                  title={`${statusText(file.status)}: ${displayPath}`}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    {statusIcon(file.status)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-text-primary truncate leading-4">
                      {fileName}
                    </span>
                    {folder && (
                      <span className="block text-[10px] text-text-muted truncate leading-3">
                        {folder}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-2xs text-text-muted">No changed files</div>
        )}
      </div>
    </div>
  );
}

function statusIcon(status: string) {
  const className = statusColor(status);
  switch (status) {
    case "added": return <FilePlus size={13} className={className} />;
    case "deleted": return <FileMinus size={13} className={className} />;
    case "renamed":
    case "copied": return <Shuffle size={13} className={className} />;
    default: return <FileDiff size={13} className={className} />;
  }
}

function statusText(status: string) {
  switch (status) {
    case "added": return "Added";
    case "deleted": return "Deleted";
    case "renamed": return "Renamed";
    case "copied": return "Copied";
    case "typechange": return "Type changed";
    case "unmerged": return "Unmerged";
    default: return "Modified";
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

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

function getFolder(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}
