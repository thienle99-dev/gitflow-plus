import { useState, useRef, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitStatus } from "@/queries/useGitLog";
import { api, type FileChange } from "@/api/tauri";
import { useGenerateCommitMessage } from "@/queries/useAI";
import { generateLocalCommitMessage } from "@/lib/ai";
import { useQueryClient } from "@tanstack/react-query";
import ContextMenu, { type ContextMenuItem } from "@/components/ui/overlay/ContextMenu";
import UndoButton from "@/components/features/actions/UndoButton";
import {
  Braces,
  Check,
  ChevronDown,
  Database,
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
  GitCommit,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
  Plus,
  Undo2,
} from "lucide-react";

export default function WorkingTree() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const selectedFileStage = useUIStore((s) => s.selectedFileStage);
  const selectFile = useUIStore((s) => s.selectFile);
  const { data: changes } = useGitStatus(repoPath);
  const queryClient = useQueryClient();
  const generateCommit = useGenerateCommitMessage(repoPath);
  const [commitMessage, setCommitMessage] = useState("");
  const [amend, setAmend] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file: FileChange; stage: "staged" | "unstaged" } | null>(null);
  // Multi-select for batch stage/unstage
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const staged = changes?.filter((c) => c.staged) || [];
  const unstaged = changes?.filter((c) => !c.staged) || [];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
  };

  const handleStage = async (filePath: string) => {
    try {
      await api.commit.stage(repoPath!, filePath);
      if (selectedFile === filePath) {
        selectFile(filePath, "staged");
      }
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleUnstage = async (filePath: string) => {
    try {
      await api.commit.unstage(repoPath!, filePath);
      if (selectedFile === filePath) {
        selectFile(filePath, "unstaged");
      }
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleStageAll = async () => {
    try {
      await api.commit.stageAll(repoPath!);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleUnstageAll = async () => {
    try {
      await api.commit.unstageAll(repoPath!);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleDiscard = async (filePath: string) => {
    if (!confirm(`Discard all changes in ${filePath}?`)) return;
    try {
      await api.commit.discard(repoPath!, filePath);
      if (selectedFile === filePath) {
        selectFile(null);
      }
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleDiscardAll = async () => {
    if (!confirm("Discard all working tree changes, including untracked files?")) return;
    try {
      await api.commit.discardAll(repoPath!);
      selectFile(null);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  // Multi-select for batch stage/unstage
  const handleFileClick = (filePath: string, e: React.MouseEvent) => {
    const currentList = [...staged, ...unstaged];
    if (e.shiftKey && lastClickedRef.current) {
      const currentIdx = currentList.findIndex(f => f.path === filePath);
      const lastIdx = currentList.findIndex(f => f.path === lastClickedRef.current);
      if (currentIdx !== -1 && lastIdx !== -1) {
        const [start, end] = currentIdx > lastIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
        const newSet = new Set(selectedFiles);
        for (let i = start; i <= end; i++) {
          newSet.add(currentList[i].path);
        }
        setSelectedFiles(newSet);
        return; // handled — don't also select file for diff
      }
    }
    // Simple toggle if shift not held
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
    lastClickedRef.current = filePath;
  };

  const handleBatchStage = async () => {
    if (selectedFiles.size === 0) return;
    try {
      for (const path of selectedFiles) {
        await api.commit.stage(repoPath!, path);
      }
      setSelectedFiles(new Set());
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleBatchUnstage = async () => {
    if (selectedFiles.size === 0) return;
    try {
      for (const path of selectedFiles) {
        await api.commit.unstage(repoPath!, path);
      }
      setSelectedFiles(new Set());
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setCommitting(true);
    try {
      const result = await api.commit.commit(repoPath!, commitMessage, amend);
      showToast(result);
      setCommitMessage("");
      setAmend(false);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    } finally {
      setCommitting(false);
    }
  };

  const handleGenerateCommit = async () => {
    if (generateCommit.isPending) return;
    if (staged.length === 0) {
      showToast("Stage changes before generating a commit message");
      return;
    }

    showToast("Generating commit message...");
    try {
      const result = await generateCommit.mutateAsync({ files: staged });
      setCommitMessage(result.message);
      showToast(result.fallback ? `Generated message using local template${result.reason ? ` (${result.reason})` : ""}` : "AI commit message generated");
    } catch (err: any) {
      setCommitMessage(generateLocalCommitMessage(staged));
      showToast(`AI failed: ${err.message || err}. Used local fallback.`);
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && commitMessage.trim()) {
        handleCommit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [commitMessage, repoPath]);

  const ctxItems: ContextMenuItem[] = ctxMenu
    ? [
        {
          label: "View diff",
          action: () => selectFile(ctxMenu.file.path, ctxMenu.stage),
        },
        {
          label: ctxMenu.stage === "staged" ? "Unstage file" : "Stage file",
          icon: <Check size={13} />,
          action: () =>
            ctxMenu.stage === "staged"
              ? handleUnstage(ctxMenu.file.path)
              : handleStage(ctxMenu.file.path),
        },
        {
          label: "Discard changes",
          icon: <Trash2 size={13} />,
          action: () => handleDiscard(ctxMenu.file.path),
        },
      ]
    : [];

  const totalChanges = staged.length + unstaged.length;
  const isAllOpen = stagedOpen || unstagedOpen;
  
  const handleToggleAllSections = () => {
    if (isAllOpen) {
      setStagedOpen(false);
      setUnstagedOpen(false);
    } else {
      setStagedOpen(true);
      setUnstagedOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Master Changes Header */}
      <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0 bg-surface-1/40 hover:bg-surface-1/70 transition-colors">
        <div 
          className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-text-primary uppercase tracking-wider select-none"
          onClick={handleToggleAllSections}
          title={isAllOpen ? "Collapse all" : "Expand all"}
        >
          <ChevronDown 
            size={13} 
            className={`text-text-secondary transition-transform duration-150 ${isAllOpen ? "" : "-rotate-90"}`} 
          />
          Changes
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="ghost p-1 rounded hover:bg-surface-2 transition-colors" 
            onClick={invalidate} 
            title="Refresh changes"
          >
            <RefreshCw size={13} />
          </button>
          <button 
            className={`ghost p-1 rounded hover:bg-surface-2 transition-colors ${generateCommit.isPending ? "opacity-50 cursor-not-allowed text-accent" : ""}`}
            onClick={handleGenerateCommit}
            disabled={generateCommit.isPending}
            title={generateCommit.isPending ? "Generating message..." : "Generate commit message (AI)"}
          >
            {generateCommit.isPending ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
          </button>
          <button 
            className="ghost p-1 rounded hover:bg-surface-2 transition-colors text-text-secondary hover:text-accent disabled:opacity-40"
            onClick={handleStageAll}
            disabled={unstaged.length === 0}
            title="Stage all changes"
          >
            <Plus size={13} />
          </button>
          <button 
            className="ghost p-1 rounded hover:bg-surface-2 transition-colors text-text-secondary hover:text-[#ff375f] disabled:opacity-40"
            onClick={handleDiscardAll}
            disabled={totalChanges === 0}
            title="Discard all changes"
          >
            <Undo2 size={13} />
          </button>
          {totalChanges > 0 && (
            <span className="ml-1.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#bf5af2]/15 text-[#bf5af2] dark:text-[#da8fff] text-[10px] font-bold px-1 select-none">
              {totalChanges}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChangeSection
          title="Staged files"
          checked
          open={stagedOpen}
          files={staged}
          empty="No staged changes"
          selectedFile={selectedFile}
          selectedStage={selectedFileStage}
          stage="staged"
          multiSelectedFiles={selectedFiles}
          onToggleAll={handleUnstageAll}
          onToggleFile={handleUnstage}
          onSelect={(path) => selectFile(path, "staged")}
          onToggleOpen={() => setStagedOpen((open) => !open)}
          onMenu={(x, y, file) => setCtxMenu({ x, y, file, stage: "staged" })}
          onFileMultiClick={handleFileClick}
        />
        <ChangeSection
          title="Unstaged files"
          checked={false}
          open={unstagedOpen}
          files={unstaged}
          empty="No unstaged changes"
          selectedFile={selectedFile}
          selectedStage={selectedFileStage}
          stage="unstaged"
          multiSelectedFiles={selectedFiles}
          onToggleAll={handleStageAll}
          onToggleFile={handleStage}
          onSelect={(path) => selectFile(path, "unstaged")}
          onToggleOpen={() => setUnstagedOpen((open) => !open)}
          onMenu={(x, y, file) => setCtxMenu({ x, y, file, stage: "unstaged" })}
          onFileMultiClick={handleFileClick}
          grow
        />
        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 border-b border-accent/20 shrink-0">
            <span className="text-2xs text-text-muted">{selectedFiles.size} selected</span>
            <button onClick={handleBatchStage} className="text-2xs font-medium text-accent hover:underline">
              Stage selected
            </button>
            <button onClick={handleBatchUnstage} className="text-2xs font-medium text-text-muted hover:text-text-primary hover:underline">
              Unstage selected
            </button>
            <button onClick={() => setSelectedFiles(new Set())} className="text-2xs text-text-muted hover:text-text-primary ml-auto">
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border-60 bg-surface-1/10 space-y-2.5 shrink-0">
        <div className="relative bg-surface-2/30 border border-border-40 rounded-mac p-2 focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/15 transition-all shadow-2xs">
          <textarea
            ref={textareaRef}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message"
            className="w-full h-[58px] text-xs bg-transparent text-text-primary placeholder:text-text-muted/60 resize-none outline-none border-none p-0 leading-relaxed"
          />
          <button
            className={`absolute right-2 bottom-2 p-1.5 rounded-full hover:bg-accent/15 text-text-muted hover:text-accent transition-all active:scale-95 cursor-pointer ${
              generateCommit.isPending ? "opacity-50 cursor-not-allowed text-accent" : ""
            }`}
            onClick={handleGenerateCommit}
            disabled={generateCommit.isPending}
            title={generateCommit.isPending ? "Generating..." : "Generate commit message (AI)"}
          >
            {generateCommit.isPending ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || staged.length === 0 || committing}
            className={`flex-1 h-8 inline-flex items-center justify-center gap-1.5 px-4 text-2xs font-semibold rounded-[5px] transition-all shadow-2xs cursor-pointer select-none ${
              commitMessage.trim() && staged.length > 0
                ? "bg-accent text-accent-fg hover:opacity-90 active:scale-[0.99] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                : "bg-surface-3 text-text-muted opacity-40 cursor-not-allowed"
            } ${committing ? "opacity-60" : ""}`}
            title={
              !commitMessage.trim()
                ? "Enter a commit message"
                : staged.length === 0
                  ? "Stage files to commit first"
                  : "Commit (⌘↵)"
            }
          >
            <Check size={12} className={commitMessage.trim() && staged.length > 0 ? "text-accent-fg" : "text-text-muted"} />
            <span>{committing ? "Committing..." : "Commit"}</span>
          </button>

          <UndoButton onUndoComplete={invalidate} />

          <button
            type="button"
            onClick={() => setAmend(!amend)}
            className={`h-8 px-3 rounded-[5px] border text-2xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              amend
                ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
                : "bg-surface-2/40 border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-3"
            }`}
            title="Amend last commit"
          >
            <GitCommit size={11} className={amend ? "text-[#ff9f0a]" : "text-text-muted"} />
            <span>Amend</span>
          </button>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

interface ChangeSectionProps {
  title: string;
  checked: boolean;
  open: boolean;
  files: FileChange[];
  empty: string;
  selectedFile: string | null;
  selectedStage: "staged" | "unstaged" | null;
  stage: "staged" | "unstaged";
  multiSelectedFiles: Set<string>;
  onToggleAll: () => void;
  onToggleFile: (path: string) => void;
  onSelect: (path: string) => void;
  onToggleOpen: () => void;
  onMenu: (x: number, y: number, file: FileChange) => void;
  onFileMultiClick: (path: string, e: React.MouseEvent) => void;
  grow?: boolean;
}

function ChangeSection({
  title,
  checked,
  open,
  files,
  empty,
  selectedFile,
  selectedStage,
  stage,
  multiSelectedFiles,
  onToggleAll,
  onToggleFile,
  onSelect,
  onToggleOpen,
  onMenu,
  onFileMultiClick,
  grow,
}: ChangeSectionProps) {
  return (
    <div className={`border-b border-border min-h-0 flex flex-col ${grow && open ? "flex-1" : "shrink-0"} ${!grow && open ? "max-h-[42%]" : ""}`}>
      <div className="h-8 px-3 flex items-center gap-2 bg-surface-1 shrink-0">
        <button
          className="ghost p-0.5 text-text-muted hover:text-text-primary transition-colors"
          onClick={onToggleOpen}
          title={open ? "Collapse" : "Expand"}
        >
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "" : "-rotate-90"}`} />
        </button>
        <button
          className={`h-3.5 w-3.5 rounded-[4px] border flex items-center justify-center transition-all ${
            checked
              ? "bg-accent border-accent text-accent-fg"
              : "border-border text-transparent hover:border-text-secondary hover:bg-surface-2"
          }`}
          onClick={onToggleAll}
          title={checked ? "Unstage all (⌘U)" : "Stage all (⌘⇧A)"}
          disabled={files.length === 0}
        >
          {checked && <Check size={9} strokeWidth={3.5} />}
        </button>
        <div className="flex-1 text-xs font-semibold text-text-primary">
          {title} ({files.length})
        </div>
        {files.length > 0 && (
          <button className="ghost text-2xs font-medium" onClick={onToggleAll}
            title={checked ? "Unstage all (⌘U)" : "Stage all (⌘⇧A)"}>
            {checked ? "Unstage all" : "Stage all"}
          </button>
        )}
      </div>

      {open && (
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-3 py-2 text-xs text-text-muted">{empty}</div>
        ) : (
          files.map((file) => (
            <ChangeRow
              key={`${stage}:${file.path}`}
              file={file}
              checked={checked}
              selected={selectedFile === file.path && selectedStage === stage}
              multiSelected={multiSelectedFiles.has(file.path)}
              onSelect={() => onSelect(file.path)}
              onToggle={() => onToggleFile(file.path)}
              onMenu={(x, y) => onMenu(x, y, file)}
              onMultiClick={(e) => onFileMultiClick(file.path, e)}
            />
          ))
        )}
      </div>
      )}
    </div>
  );
}

interface ChangeRowProps {
  file: FileChange;
  checked: boolean;
  selected: boolean;
  multiSelected?: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onMenu: (x: number, y: number) => void;
  onMultiClick?: (e: React.MouseEvent) => void;
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
      case "untracked":
        badgeClass = "text-text-muted";
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

function ChangeRow({ file, checked, selected, multiSelected, onSelect, onToggle, onMenu, onMultiClick }: ChangeRowProps) {
  const fileName = getFileName(file.path);
  const folder = getFolder(file.path);

  return (
    <div
      className={`tree-item group w-full grid grid-cols-[14px_16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1 text-left ${
        multiSelected ? "ring-1 ring-accent bg-accent/5" : selected ? "selected" : ""
      }`}
      onClick={(e) => {
        if (onMultiClick) {
          onMultiClick(e);
        } else {
          onSelect();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
      title={file.path}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span
        className={`h-3.5 w-3.5 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer ${
          checked
            ? selected
              ? "bg-accent-fg border-accent-fg text-accent"
              : "bg-accent border-accent text-accent-fg"
            : selected
              ? "border-accent-fg/40 hover:border-accent-fg hover:bg-accent-fg/10 text-transparent"
              : "border-border hover:border-text-secondary hover:bg-surface-2 text-transparent"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {checked && <Check size={9} strokeWidth={3.5} />}
      </span>
      <span title={checked ? "Unstage (⌘U)" : "Stage (⌘S)"}
        className="h-4 w-4 flex items-center justify-center shrink-0">
        {fileIcon(file.path, file.status)}
      </span>
      <span className="min-w-0 flex flex-col justify-center">
        <span className={`block text-xs font-medium text-current truncate leading-4 ${file.status === "deleted" ? "line-through opacity-60" : ""}`}>
          {fileName}
        </span>
        {folder && (
          <span className={`block text-[10px] truncate leading-3 ${selected ? "text-accent-fg opacity-75" : "text-text-muted"}`}>
            {folder}
          </span>
        )}
      </span>
      <span className="flex items-center justify-end gap-1.5 min-w-[48px]">
        <StatusBadge status={file.status} selected={selected} />
        <span
          className={`h-5 w-5 flex items-center justify-center rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
            selected ? "hover:bg-accent-fg/20 text-accent-fg" : "text-text-muted hover:bg-surface-2"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e.clientX, e.clientY);
          }}
        >
          <MoreHorizontal size={13} className="text-current" />
        </span>
      </span>
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
      if (status === "added" || status === "untracked") return <FilePlus size={size} className={className} />;
      if (status === "deleted") return <FileMinus size={size} className={className} />;
      return <File size={size} className={className} />;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "modified": return "M";
    case "added": return "A";
    case "deleted": return "D";
    case "renamed": return "R";
    case "untracked": return "?";
    default: return status.charAt(0).toUpperCase();
  }
}

function statusColor(status: string) {
  switch (status) {
    case "added": return "text-[#30d158]";
    case "deleted": return "text-[#ff375f]";
    case "renamed":
    case "copied": return "text-[#64d2ff]";
    case "untracked": return "text-text-muted";
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
