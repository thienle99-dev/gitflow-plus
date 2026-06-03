import {
  Braces,
  File,
  FileArchive,
  FileCode,
  FileCog,
  FileImage,
  FileJson,
  FileMinus,
  FilePlus,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  Database,
} from "lucide-react";

/** Status badge label: single-letter indicator for file change status */
export function statusLabel(status: string) {
  switch (status) {
    case "modified":
      return "M";
    case "added":
      return "A";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "untracked":
      return "?";
    default:
      return status.charAt(0).toUpperCase();
  }
}

/** Status color class for icons and badges */
export function statusColor(status: string) {
  switch (status) {
    case "added":
      return "text-[#30d158]";
    case "deleted":
      return "text-[#ff375f]";
    case "renamed":
    case "copied":
      return "text-[#64d2ff]";
    case "untracked":
      return "text-text-muted";
    default:
      return "text-[#ff9f0a]";
  }
}

/** File type icon based on extension and status */
export function fileIcon(path: string, status: string, size = 14) {
  const className = statusColor(status);
  const fileName = path.split("/").pop()?.toLowerCase() || path;
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1) : fileName;

  if (
    ["package.json", "tsconfig.json", "vite.config.ts", "tailwind.config.ts"].includes(fileName)
  ) {
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
      if (status === "added" || status === "untracked")
        return <FilePlus size={size} className={className} />;
      if (status === "deleted") return <FileMinus size={size} className={className} />;
      return <File size={size} className={className} />;
  }
}

/**
 * StatusBadge: inline badge showing single-letter file change status.
 */
export function StatusBadge({ status, selected }: { status: string; selected: boolean }) {
  const label = statusLabel(status);

  let badgeClass = "";
  if (selected) {
    badgeClass = "text-accent-fg opacity-90";
  } else {
    switch (status) {
      case "added":
        badgeClass = "text-[#30d158]";
        break;
      case "deleted":
        badgeClass = "text-[#ff375f]";
        break;
      case "renamed":
      case "copied":
        badgeClass = "text-[#64d2ff]";
        break;
      case "untracked":
        badgeClass = "text-text-muted";
        break;
      default: // modified
        badgeClass = "text-[#ff9f0a]";
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-mono text-[10px] font-bold select-none px-1 leading-none ${badgeClass}`}
    >
      {label}
    </span>
  );
}
