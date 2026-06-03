import { useMemo, useState, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useCommitChangedFiles, useGitLog } from "@/queries/useGitLog";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
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
  MessageSquareText,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { useAICommitExplain, useAICommitReview } from "@/queries/useAI";

export default function CommitDetail() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const selectFile = useUIStore((s) => s.selectFile);
  const { data } = useGitLog(repoPath);
  const { data: changedFiles, isLoading: filesLoading, error: filesError } =
    useCommitChangedFiles(repoPath, selectedCommit);
  const queryClient = useQueryClient();
  const [reverting, setReverting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [reviewResult, setReviewResult] = useState("");
  const aiExplain = useAICommitExplain();
  const aiReview = useAICommitReview();

  // Reset explanation & review when commit changes
  useEffect(() => {
    setShowExplanation(false);
    setExplanation("");
    aiExplain.reset();
    setShowReview(false);
    setReviewResult("");
    aiReview.reset();
  }, [selectedCommit]);

  const handleRevert = async () => {
    if (!repoPath || !selectedCommit) return;
    if (!confirm(`Revert commit ${selectedCommit.slice(0, 7)}? This will create a new commit that undoes the changes.`)) return;
    setReverting(true);
    try {
      const result = await api.commit.revert(repoPath, selectedCommit);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      alert(result);
    } catch (e: any) {
      alert(`Revert failed: ${e}`);
    } finally {
      setReverting(false);
    }
  };

  const handleExplain = async () => {
    if (!repoPath || !selectedCommit || !commit) return;
    if (showExplanation && explanation) {
      setShowExplanation(false);
      return;
    }
    setShowExplanation(true);
    if (explanation) return; // Already have explanation

    try {
      const result = await aiExplain.mutateAsync({
        repoPath,
        commitHash: selectedCommit,
        commitMessage: commit.message,
      });
      setExplanation(result);
    } catch {
      // Error is rendered from mutation state
    }
  };

  const handleReview = async () => {
    if (!repoPath || !selectedCommit || !commit) return;
    if (showReview && reviewResult) {
      setShowReview(false);
      return;
    }
    setShowReview(true);
    if (reviewResult) return; // Already have review

    try {
      const result = await aiReview.mutateAsync({
        repoPath,
        commitHash: selectedCommit,
        commitMessage: commit.message,
      });
      setReviewResult(result);
    } catch {
      // Error is rendered from mutation state
    }
  };

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
        <button
          onClick={handleRevert}
          disabled={reverting}
          className="flex items-center gap-1.5 px-2 py-1 mt-1 text-2xs font-medium text-text-muted hover:text-text-primary bg-surface-2-40 hover:bg-surface-2 border border-border-40 rounded-mac transition-all cursor-pointer disabled:opacity-40"
          title="Revert this commit (creates a new undo commit)"
        >
          <RotateCcw size={11} className={reverting ? "animate-spin" : ""} />
          {reverting ? "Reverting..." : "Revert commit"}
        </button>
        {localStorage.getItem("gitflowAiApiKey") && (
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={handleExplain}
              disabled={aiExplain.isPending}
              className="flex items-center gap-1.5 px-2 py-1 text-2xs font-medium text-accent hover:text-accent-fg bg-accent-10 hover:bg-accent-20 border border-accent-30 rounded-mac transition-all cursor-pointer disabled:opacity-40"
              title="Explain this commit with AI"
            >
              <Sparkles size={11} className={aiExplain.isPending ? "animate-pulse" : ""} />
              {aiExplain.isPending
                ? "Analyzing..."
                : showExplanation
                  ? "Hide explanation"
                  : "Explain with AI"}
            </button>
            <button
              onClick={handleReview}
              disabled={aiReview.isPending}
              className="flex items-center gap-1.5 px-2 py-1 text-2xs font-medium text-accent hover:text-accent-fg bg-accent-10 hover:bg-accent-20 border border-accent-30 rounded-mac transition-all cursor-pointer disabled:opacity-40"
              title="Code review this commit with AI"
            >
              <MessageSquareText size={11} className={aiReview.isPending ? "animate-pulse" : ""} />
              {aiReview.isPending
                ? "Reviewing..."
                : showReview
                  ? "Hide review"
                  : "Review with AI"}
            </button>
          </div>
        )}
      </div>

      {/* AI Explanation */}
      {showExplanation && (
        <div className="px-3 py-2.5 border-b border-border bg-accent-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-accent" />
            <span className="text-xs font-semibold text-accent">AI Explanation</span>
          </div>
          {aiExplain.isPending ? (
            <div className="flex items-center gap-2 text-2xs text-text-muted">
              <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Analyzing commit changes...
            </div>
          ) : aiExplain.isError ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#ff375f]/10 border border-[#ff375f]/20 rounded-mac text-2xs text-[#ff375f]">
              {aiExplain.error?.message || "Failed to explain commit"}
              <button onClick={handleExplain} className="ml-auto text-accent underline text-2xs font-medium hover:text-accent-fg">Retry</button>
            </div>
          ) : explanation ? (
            <div className="text-2xs text-text-secondary leading-relaxed">
              {renderAIResult(explanation)}
            </div>
          ) : null}
        </div>
      )}

      {/* AI Review */}
      {showReview && (
        <div className="px-3 py-2.5 border-b border-border bg-accent-10">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquareText size={12} className="text-accent" />
            <span className="text-xs font-semibold text-accent">AI Code Review</span>
          </div>
          {aiReview.isPending ? (
            <div className="flex items-center gap-2 text-2xs text-text-muted">
              <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Reviewing commit changes...
            </div>
          ) : aiReview.isError ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#ff375f]/10 border border-[#ff375f]/20 rounded-mac text-2xs text-[#ff375f]">
              {aiReview.error?.message || "Failed to review commit"}
              <button onClick={handleReview} className="ml-auto text-accent underline text-2xs font-medium hover:text-accent-fg">Retry</button>
            </div>
          ) : reviewResult ? (
            <div className="text-2xs text-text-secondary leading-relaxed">
              {renderReviewResult(reviewResult)}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex-1 px-3 py-2">
        <div className="text-xs font-semibold text-text-primary mb-2">
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
              const isSelected = selectedFile === file.path;

              return (
                <div
                  key={`${file.status}:${file.old_path || ""}:${file.path}`}
                  className={`tree-item w-full grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 text-left transition-all ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => selectFile(file.path)}
                  title={`${statusText(file.status)}: ${displayPath}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectFile(file.path);
                    }
                  }}
                >
                  <span className="h-4 w-4 flex items-center justify-center shrink-0">
                    {fileIcon(file.path, file.status)}
                  </span>
                  <span className="min-w-0 flex flex-col justify-center">
                    <span className={`block text-xs font-medium text-current truncate leading-4 ${file.status === "deleted" ? "line-through opacity-60" : ""}`}>
                      {fileName}
                    </span>
                    {folder && (
                      <span className={`block text-[10px] truncate leading-3 ${isSelected ? "text-accent-fg opacity-75" : "text-text-muted"}`}>
                        {folder}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-end min-w-[20px]">
                    <StatusBadge status={file.status} selected={isSelected} />
                  </span>
                </div>
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

function StatusBadge({ status, selected }: { status: string; selected: boolean }) {
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
      default: // modified
        badgeClass = "text-[#ff9f0a]";
        break;
    }
  }

  return (
    <span className={`inline-flex items-center justify-center font-mono text-[10px] font-bold select-none px-1 leading-none ${badgeClass}`}>
      {label}
    </span>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "modified": return "M";
    case "added": return "A";
    case "deleted": return "D";
    case "renamed": return "R";
    default: return status.charAt(0).toUpperCase();
  }
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

/** Render **bold** text in a line as React elements */
function parseBoldText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<span key={`b${key++}`} className="font-semibold text-text-primary">{match[1]}</span>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

function reviewCategoryMeta(category: string) {
  switch (category.toUpperCase()) {
    case "BUG":
      return {
        label: "Bug",
        border: "border-[#ff375f]",
        bg: "bg-[#ff375f]/8",
        badge: "bg-[#ff375f]/20 text-[#ff375f]",
      };
    case "SECURITY":
      return {
        label: "Security",
        border: "border-[#ff6b35]",
        bg: "bg-[#ff6b35]/8",
        badge: "bg-[#ff6b35]/20 text-[#ff6b35]",
      };
    case "PERF":
      return {
        label: "Perf",
        border: "border-[#ffcc00]",
        bg: "bg-[#ffcc00]/8",
        badge: "bg-[#ffcc00]/20 text-[#ffcc00]",
      };
    case "STYLE":
      return {
        label: "Style",
        border: "border-[#0a84ff]",
        bg: "bg-[#0a84ff]/8",
        badge: "bg-[#0a84ff]/20 text-[#0a84ff]",
      };
    case "BEST-PRACTICE":
      return {
        label: "Best Practice",
        border: "border-[#bf5af2]",
        bg: "bg-[#bf5af2]/8",
        badge: "bg-[#bf5af2]/20 text-[#bf5af2]",
      };
    default:
      return {
        label: category,
        border: "border-accent",
        bg: "bg-accent/8",
        badge: "bg-accent/20 text-accent",
      };
  }
}

function matchReviewCategory(line: string) {
  return line.match(/^\s*(?:#{1,6}\s*)?(?:[-*]\s*)?(?:\*\*)?\[(BUG|SECURITY|PERF|STYLE|BEST-PRACTICE)\](?:\*\*)?\s*(.*)$/i);
}

/** Render AI Review result with color-coded findings, code block support, and bold text */
function renderReviewResult(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let key = 0;

  const flushCodeBlock = () => {
    if (codeLines.length > 0) {
      elements.push(
        <div key={`cb${key++}`} className="my-2 rounded-mac overflow-hidden border border-border-40">
          {codeLang && (
            <div className="px-2.5 py-1 bg-surface-3/60 text-2xs font-mono font-medium text-text-muted uppercase tracking-wide border-b border-border-30">
              {codeLang}
            </div>
          )}
          <pre className="px-3 py-2 bg-surface-2/80 overflow-x-auto">
            <code className="text-2xs font-mono text-text-secondary leading-relaxed whitespace-pre">
              {codeLines.join("\n")}
            </code>
          </pre>
        </div>
      );
      codeLines = [];
      codeLang = "";
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const categoryMatch = matchReviewCategory(line);
    if (categoryMatch) {
      const meta = reviewCategoryMeta(categoryMatch[1]);
      elements.push(
        <div key={`l${key++}`} className={`ml-1 mt-1.5 flex gap-2 border-l-2 ${meta.border} ${meta.bg} pl-2.5 pr-2 py-1.5 rounded-r-sm`}>
          <span className={`inline-flex items-center h-5 px-1.5 rounded text-[9px] font-bold uppercase tracking-wider ${meta.badge} shrink-0`}>
            {meta.label}
          </span>
          <span className="min-w-0 text-text-secondary">{parseBoldText(categoryMatch[2])}</span>
        </div>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<div key={`l${key++}`} className="font-semibold text-text-primary mt-2.5 mb-1 text-xs border-l-2 border-accent-40 pl-2">{line.slice(4)}</div>);
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<div key={`l${key++}`} className="font-semibold text-text-primary mt-2.5 mb-1 text-xs border-l-2 border-accent-40 pl-2">{line.slice(3)}</div>);
      continue;
    }
    if (line.startsWith("- **[BUG]**")) {
      elements.push(
        <div key={`l${key++}`} className="ml-1 mt-1 flex gap-1.5 border-l-2 border-[#ff375f] pl-2 py-0.5 bg-[#ff375f]/8 rounded-r-sm">
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#ff375f]/20 text-[#ff375f] shrink-0">Bug</span>
          <span className="text-text-secondary">{parseBoldText(line.slice(11))}</span>
        </div>
      );
      continue;
    }
    if (line.startsWith("- **[SECURITY]**")) {
      elements.push(
        <div key={`l${key++}`} className="ml-1 mt-1 flex gap-1.5 border-l-2 border-[#ff6b35] pl-2 py-0.5 bg-[#ff6b35]/8 rounded-r-sm">
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#ff6b35]/20 text-[#ff6b35] shrink-0">Security</span>
          <span className="text-text-secondary">{parseBoldText(line.slice(16))}</span>
        </div>
      );
      continue;
    }
    if (line.startsWith("- **[PERF]**")) {
      elements.push(
        <div key={`l${key++}`} className="ml-1 mt-1 flex gap-1.5 border-l-2 border-yellow-500 pl-2 py-0.5 bg-yellow-500/8 rounded-r-sm">
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-500 shrink-0">Perf</span>
          <span className="text-text-secondary">{parseBoldText(line.slice(12))}</span>
        </div>
      );
      continue;
    }
    if (line.startsWith("- **[STYLE]**")) {
      elements.push(
        <div key={`l${key++}`} className="ml-1 mt-1 flex gap-1.5 border-l-2 border-blue-500 pl-2 py-0.5 bg-blue-500/8 rounded-r-sm">
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-500 shrink-0">Style</span>
          <span className="text-text-secondary">{parseBoldText(line.slice(13))}</span>
        </div>
      );
      continue;
    }
    if (line.startsWith("- **[BEST-PRACTICE]**")) {
      elements.push(
        <div key={`l${key++}`} className="ml-1 mt-1 flex gap-1.5 border-l-2 border-purple-500 pl-2 py-0.5 bg-purple-500/8 rounded-r-sm">
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-500 shrink-0">Practice</span>
          <span className="text-text-secondary">{parseBoldText(line.slice(20))}</span>
        </div>
      );
      continue;
    }
    const riskMatch = line.match(/^\*\*(Low|Medium|High)\*\*(.*)/i);
    if (riskMatch) {
      const level = riskMatch[1].toLowerCase();
      const colors = level === "high" ? "bg-[#ff375f]/20 text-[#ff375f] border-[#ff375f]/30" : level === "medium" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
      elements.push(
        <div key={`l${key++}`} className="flex items-center gap-2 mt-2 mb-1">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${colors}`}>{riskMatch[1]} Risk</span>
          <span className="text-text-muted">{parseBoldText(riskMatch[2])}</span>
        </div>
      );
      continue;
    }
    if (line.match(/^\*\*.*\*\*$/)) {
      elements.push(<div key={`l${key++}`} className="font-semibold text-text-primary mt-2">{line.replace(/\*\*/g, "")}</div>);
      continue;
    }
    if (line.startsWith("- ")) {
      elements.push(<div key={`l${key++}`} className="ml-2 mt-0.5 flex gap-1.5"><span className="text-accent/60 shrink-0">•</span><span>{parseBoldText(line.slice(2))}</span></div>);
      continue;
    }
    elements.push(<div key={`l${key++}`}>{parseBoldText(line) || "\u00A0"}</div>);
  }

  if (inCodeBlock) flushCodeBlock();
  return elements;
}

/** Render AI text with code block support (```lang ... ```) and bold text */
function renderAIResult(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let key = 0;

  const flushCodeBlock = () => {
    if (codeLines.length > 0) {
      elements.push(
        <div key={`cb${key++}`} className="my-2 rounded-mac overflow-hidden border border-border-40">
          {codeLang && (
            <div className="px-2.5 py-1 bg-surface-3/60 text-2xs font-mono font-medium text-text-muted uppercase tracking-wide border-b border-border-30">
              {codeLang}
            </div>
          )}
          <pre className="px-3 py-2 bg-surface-2/80 overflow-x-auto">
            <code className="text-2xs font-mono text-text-secondary leading-relaxed whitespace-pre">
              {codeLines.join("\n")}
            </code>
          </pre>
        </div>
      );
      codeLines = [];
      codeLang = "";
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    // Regular text line
    elements.push(<div key={`l${key++}`}>{parseBoldText(line) || "\u00A0"}</div>);
  }
  // Unclosed code block
  if (inCodeBlock) flushCodeBlock();

  return elements;
}
