import { useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useCommitChangedFiles, useGitLog } from "@/queries/useGitLog";
import {
  ArrowRight,
  Braces,
  Clock,
  Database,
  File,
  FileArchive,
  FileCode,
  FileCog,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  GitCommit,
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
                    {fileIcon(file.path, file.status)}
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

function fileIcon(path: string, status: string) {
  const className = statusColor(status);
  const ext = getExtension(path);
  const fileName = getFileName(path).toLowerCase();
  const size = 14;

  if (["package.json", "tsconfig.json", "vite.config.ts", "tailwind.config.ts"].includes(fileName)) {
    return <FileCog size={size} className={className} />;
  }

  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "java":
    case "kt":
    case "rs":
    case "go":
    case "py":
    case "rb":
    case "php":
    case "c":
    case "cpp":
    case "h":
    case "hpp":
      return <FileCode size={size} className={className} />;
    case "json":
    case "jsonc":
    case "lock":
      return <FileJson size={size} className={className} />;
    case "yml":
    case "yaml":
    case "toml":
    case "ini":
    case "env":
      return <FileCog size={size} className={className} />;
    case "css":
    case "scss":
    case "sass":
    case "less":
    case "html":
    case "xml":
    case "svg":
      return <Braces size={size} className={className} />;
    case "sql":
    case "db":
    case "sqlite":
      return <Database size={size} className={className} />;
    case "md":
    case "mdx":
    case "txt":
    case "rst":
      return <FileText size={size} className={className} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
      return <FileImage size={size} className={className} />;
    case "zip":
    case "gz":
    case "tar":
    case "rar":
    case "7z":
      return <FileArchive size={size} className={className} />;
    case "csv":
    case "tsv":
    case "xls":
    case "xlsx":
      return <FileSpreadsheet size={size} className={className} />;
    case "sh":
    case "bash":
    case "zsh":
    case "ps1":
      return <FileTerminal size={size} className={className} />;
    default:
      return <File size={size} className={className} />;
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

function getExtension(path: string) {
  const fileName = getFileName(path).toLowerCase();
  const index = fileName.lastIndexOf(".");
  return index > -1 ? fileName.slice(index + 1) : fileName;
}

function getFolder(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}
