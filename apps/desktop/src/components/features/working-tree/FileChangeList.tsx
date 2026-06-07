import { useState, useMemo, memo } from "react";
import { type FileChange } from "@/api/tauri";
import { StatusBadge, fileIcon } from "@/components/ui/shared";
import { EmptyStateInline } from "@/components/ui/feedback/EmptyState";
import {
  Check,
  ChevronDown,
  Folder,
  List,
  FolderTree,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Undo2,
  MessageSquare,
} from "lucide-react";

// ─── Tree node interfaces ──────────────────────────────────────────────────────

export interface FileTreeNode {
  type: "file";
  name: string;
  path: string;
  file: FileChange;
}

export interface FolderTreeNode {
  type: "folder";
  name: string;
  path: string;
  children: { [key: string]: FileTreeNode | FolderTreeNode };
}

// ─── Helper functions ──────────────────────────────────────────────────────────

export function buildFileTree(files: FileChange[]): FolderTreeNode {
  const root: FolderTreeNode = {
    type: "folder",
    name: "",
    path: "",
    children: {},
  };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        current.children[part] = {
          type: "file",
          name: part,
          path: file.path,
          file,
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = {
            type: "folder",
            name: part,
            path: currentPath,
            children: {},
          };
        }
        current = current.children[part] as FolderTreeNode;
      }
    }
  }

  return root;
}

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

function getFolder(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

// ─── FileTreeRenderer ──────────────────────────────────────────────────────────

interface FileTreeRendererProps {
  node: FolderTreeNode;
  depth: number;
  checked: boolean;
  selectedFile: string | null;
  selectedStage: "staged" | "unstaged" | null;
  stage: "staged" | "unstaged";
  multiSelectedFiles: Set<string>;
  onToggleFile: (path: string) => void;
  onSelect: (path: string) => void;
  onAIInlineReview: (path: string) => void;
  onMenu: (x: number, y: number, file: FileChange) => void;
  onFileMultiClick: (path: string, e: React.MouseEvent) => void;
  collapsedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function FileTreeRenderer({
  node,
  depth,
  checked,
  selectedFile,
  selectedStage,
  stage,
  multiSelectedFiles,
  onToggleFile,
  onSelect,
  onAIInlineReview,
  onMenu,
  onFileMultiClick,
  collapsedFolders,
  onToggleFolder,
}: FileTreeRendererProps) {
  const sortedKeys = Object.keys(node.children).sort((a, b) => {
    const childA = node.children[a];
    const childB = node.children[b];
    if (childA.type !== childB.type) {
      return childA.type === "folder" ? -1 : 1;
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-[1px]">
      {sortedKeys.map((key) => {
        const child = node.children[key];
        if (child.type === "folder") {
          const isCollapsed = collapsedFolders.has(child.path);
          return (
            <div key={child.path}>
              <div
                className="tree-item group w-full flex items-center gap-1.5 px-3 py-1 hover:bg-surface-2 cursor-pointer text-left select-none text-xs text-text-secondary"
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={() => onToggleFolder(child.path)}
              >
                <span
                  className="h-3.5 w-3.5 flex items-center justify-center shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFolder(child.path);
                  }}
                >
                  <ChevronDown
                    size={12}
                    className={`text-text-muted transition-transform duration-150 shrink-0 ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </span>

                <Folder size={12} className="text-accent shrink-0" />
                <span className="truncate font-semibold text-text-primary flex-1">{child.name}</span>

                <span
                  className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-all cursor-pointer mr-1 opacity-0 group-hover:opacity-100 ${checked
                    ? "bg-accent border-accent text-accent-fg"
                    : "border-border text-transparent hover:border-text-secondary hover:bg-surface-2"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFile(child.path);
                  }}
                  title={checked ? "Unstage folder" : "Stage folder"}
                >
                  {checked && <Check size={9} strokeWidth={3.5} />}
                </span>
              </div>
              {!isCollapsed && (
                <FileTreeRenderer
                  node={child}
                  depth={depth + 1}
                  checked={checked}
                  selectedFile={selectedFile}
                  selectedStage={selectedStage}
                  stage={stage}
                  multiSelectedFiles={multiSelectedFiles}
                  onToggleFile={onToggleFile}
                  onSelect={onSelect}
                  onAIInlineReview={onAIInlineReview}
                  onMenu={onMenu}
                  onFileMultiClick={onFileMultiClick}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={onToggleFolder}
                />
              )}
            </div>
          );
        } else {
          return (
            <div
              key={`${stage}:${child.path}`}
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              <ChangeRow
                file={child.file}
                checked={checked}
                selected={selectedFile === child.path && selectedStage === stage}
                multiSelected={multiSelectedFiles.has(child.path)}
                onSelect={() => onSelect(child.path)}
                onToggle={() => onToggleFile(child.path)}
                onAIInlineReview={() => onAIInlineReview(child.path)}
                onMenu={(x, y) => onMenu(x, y, child.file)}
                onMultiClick={(e) => onFileMultiClick(child.path, e)}
                hideFolder
              />
            </div>
          );
        }
      })}
    </div>
  );
}

// ─── ChangeRow ─────────────────────────────────────────────────────────────────

interface ChangeRowProps {
  file: FileChange;
  checked: boolean;
  selected: boolean;
  multiSelected?: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onAIInlineReview: () => void;
  onMenu: (x: number, y: number) => void;
  onMultiClick?: (e: React.MouseEvent) => void;
  hideFolder?: boolean;
}

const ChangeRow = memo(
  function ChangeRow({ file, checked, selected, multiSelected, onSelect, onToggle, onAIInlineReview, onMenu, onMultiClick, hideFolder }: ChangeRowProps) {
    const fileName = getFileName(file.path);
    const folder = getFolder(file.path);

    return (
      <div
        className={`tree-item group w-full grid grid-cols-[14px_16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1 text-left ${multiSelected ? "ring-1 ring-accent bg-accent-5" : selected ? "selected" : ""
          }`}
        onClick={(e) => {
          if (onMultiClick && (e.shiftKey || e.metaKey || e.ctrlKey)) {
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
          className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-all cursor-pointer ${checked
            ? selected
              ? "bg-accent-fg border-accent-fg text-accent"
              : "bg-accent border-accent text-accent-fg"
            : selected
              ? "border-accent-fg-40 hover:border-accent-fg hover:bg-accent-fg-10 text-transparent"
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
          {!hideFolder && folder && (
            <span className={`block text-[10px] truncate leading-3 ${selected ? "text-accent-fg opacity-75" : "text-text-muted"}`}>
              {folder}
            </span>
          )}
        </span>
        <span className="flex items-center justify-end gap-1.5 min-w-[48px]">
          <StatusBadge status={file.status} selected={selected} />
          <span
            className={`h-5 w-5 flex items-center justify-center rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${selected ? "hover:bg-accent-fg-20 text-accent-fg" : "text-text-muted hover:bg-surface-2"
              }`}
            onClick={(e) => {
              e.stopPropagation();
              onAIInlineReview();
            }}
            title="AI Inline Review"
          >
            <MessageSquare size={12} className="text-current" />
          </span>
          <span
            className={`h-5 w-5 flex items-center justify-center rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${selected ? "hover:bg-accent-fg-20 text-accent-fg" : "text-text-muted hover:bg-surface-2"
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
  },
  (prev, next) => {
    return (
      prev.file.path === next.file.path &&
      prev.file.status === next.file.status &&
      prev.checked === next.checked &&
      prev.selected === next.selected &&
      prev.multiSelected === next.multiSelected &&
      prev.hideFolder === next.hideFolder
    );
  }
);

// ─── ChangeSection ─────────────────────────────────────────────────────────────

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
  onAIInlineReview: (path: string) => void;
  onToggleOpen: () => void;
  onMenu: (x: number, y: number, file: FileChange) => void;
  onFileMultiClick: (path: string, e: React.MouseEvent) => void;
  grow?: boolean;
  isTreeView?: boolean;
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
  onAIInlineReview,
  onToggleOpen,
  onMenu,
  onFileMultiClick,
  grow,
  isTreeView,
}: ChangeSectionProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const handleToggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const treeRoot = useMemo(() => {
    if (isTreeView) {
      return buildFileTree(files);
    }
    return null;
  }, [files, isTreeView]);

  return (
    <div className={`border-b border-border-60 min-h-0 flex flex-col ${grow && open ? "flex-1" : "shrink-0"} ${!grow && open ? "max-h-[42%]" : ""}`}>
      <div 
        className="h-9 px-3 flex items-center gap-2 bg-surface-1-55 shrink-0 cursor-pointer select-none hover:bg-surface-2-30 transition-colors"
        onClick={onToggleOpen}
      >
        <span
          className="p-0.5 text-text-muted hover:text-text-primary transition-colors shrink-0"
          title={open ? "Collapse" : "Expand"}
        >
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "" : "-rotate-90"}`} />
        </span>
        <button
          className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${checked
            ? "bg-accent border-accent text-accent-fg"
            : "border-border text-transparent hover:border-text-secondary hover:bg-surface-2"
            }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleAll();
          }}
          title={checked ? "Unstage all (⌘U)" : "Stage all (⌘⇧A)"}
          disabled={files.length === 0}
        >
          {checked && <Check size={9} strokeWidth={3.5} />}
        </button>
        <div className="flex-1 text-xs font-semibold text-text-primary">
          {title} <span className="text-text-muted font-medium">({files.length})</span>
        </div>
        {files.length > 0 && (
          <button 
            className="text-2xs font-semibold text-text-muted hover:text-accent transition-colors shrink-0" 
            onClick={(e) => {
              e.stopPropagation();
              onToggleAll();
            }}
            title={checked ? "Unstage all (⌘U)" : "Stage all (⌘⇧A)"}
          >
            {checked ? "Unstage all" : "Stage all"}
          </button>
        )}
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto py-1.5">
          {files.length === 0 ? (
            <EmptyStateInline variant={stage === "staged" ? "changes" : "changes"} title={empty} />
          ) : isTreeView && treeRoot ? (
            <FileTreeRenderer
              node={treeRoot}
              depth={0}
              checked={checked}
              selectedFile={selectedFile}
              selectedStage={selectedStage}
              stage={stage}
              multiSelectedFiles={multiSelectedFiles}
              onToggleFile={onToggleFile}
              onSelect={onSelect}
              onAIInlineReview={onAIInlineReview}
              onMenu={onMenu}
              onFileMultiClick={onFileMultiClick}
              collapsedFolders={collapsedFolders}
              onToggleFolder={handleToggleFolder}
            />
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
                onAIInlineReview={() => onAIInlineReview(file.path)}
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

// ─── FileChangeList (main export) ──────────────────────────────────────────────

export interface FileChangeListProps {
  staged: FileChange[];
  unstaged: FileChange[];
  selectedFile: string | null;
  selectedFileStage: "staged" | "unstaged" | null;
  selectedFiles: Set<string>;
  isTreeView: boolean;
  stagedOpen: boolean;
  unstagedOpen: boolean;
  reviewTargetPath?: string | null;
  reviewTargetStage?: "staged" | "unstaged" | null;
  // Callbacks
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onSelectFile: (path: string, stage: "staged" | "unstaged") => void;
  onAIInlineReview: (path: string, stage: "staged" | "unstaged") => void;
  onContextMenu: (x: number, y: number, file: FileChange, stage: "staged" | "unstaged") => void;
  onFileMultiClick: (path: string, e: React.MouseEvent) => void;
  onRefresh: () => void;
  onToggleTreeView: () => void;
  onToggleAllSections: () => void;
  onToggleStagedOpen: () => void;
  onToggleUnstagedOpen: () => void;
  onSetConfirmDiscardAll: (v: boolean) => void;
  onBatchStage: () => void;
  onBatchUnstage: () => void;
  onClearSelected: () => void;
}

export default function FileChangeList({
  staged,
  unstaged,
  selectedFile,
  selectedFileStage,
  selectedFiles,
  isTreeView,
  stagedOpen,
  unstagedOpen,
  reviewTargetPath,
  reviewTargetStage,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
  onSelectFile,
  onAIInlineReview,
  onContextMenu,
  onFileMultiClick,
  onRefresh,
  onToggleTreeView,
  onToggleAllSections,
  onToggleStagedOpen,
  onToggleUnstagedOpen,
  onSetConfirmDiscardAll,
  onBatchStage,
  onBatchUnstage,
  onClearSelected,
}: FileChangeListProps) {
  const totalChanges = staged.length + unstaged.length;
  const isAllOpen = stagedOpen || unstagedOpen;

  return (
    <>
      {/* Master Changes Header */}
      <div className="h-10 px-3 border-b border-border-60 flex items-center justify-between shrink-0 bg-surface-1-70 backdrop-blur">
        <div
          className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-text-primary uppercase tracking-wider select-none"
          onClick={onToggleAllSections}
          title={isAllOpen ? "Collapse all" : "Expand all"}
        >
          <ChevronDown
            size={13}
            className={`text-text-secondary transition-transform duration-150 ${isAllOpen ? "" : "-rotate-90"}`}
          />
          Changes
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={`h-6 w-6 inline-flex items-center justify-center rounded-md transition-colors ${
              isTreeView
                ? "text-accent bg-accent-10 hover:bg-accent-20"
                : "text-text-muted hover:text-text-primary hover:bg-surface-2"
            }`}
            onClick={onToggleTreeView}
            title={isTreeView ? "Switch to List View" : "Switch to Tree View"}
          >
            {isTreeView ? <FolderTree size={13} /> : <List size={13} />}
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            onClick={onRefresh}
            title="Refresh changes"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-accent hover:bg-accent-10 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
            onClick={onStageAll}
            disabled={unstaged.length === 0}
            title="Stage all changes"
          >
            <Plus size={13} />
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-[#ff375f] hover:bg-[#ff375f]/10 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
            onClick={() => onSetConfirmDiscardAll(true)}
            disabled={totalChanges === 0}
            title="Discard all changes"
          >
            <Undo2 size={13} />
          </button>
          {totalChanges > 0 && (
            <span className="ml-1 flex items-center justify-center min-w-[20px] h-5 rounded-full bg-[#bf5af2]/15 text-[#bf5af2] dark:text-[#da8fff] text-[10px] font-bold px-1.5 select-none">
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
          selectedFile={reviewTargetPath || selectedFile}
          selectedStage={reviewTargetStage || selectedFileStage}
          stage="staged"
          multiSelectedFiles={selectedFiles}
          onToggleAll={onUnstageAll}
          onToggleFile={onUnstage}
          onSelect={(path) => onSelectFile(path, "staged")}
          onAIInlineReview={(path) => onAIInlineReview(path, "staged")}
          onToggleOpen={onToggleStagedOpen}
          onMenu={(x, y, file) => onContextMenu(x, y, file, "staged")}
          onFileMultiClick={onFileMultiClick}
          isTreeView={isTreeView}
        />
        <ChangeSection
          title="Unstaged files"
          checked={false}
          open={unstagedOpen}
          files={unstaged}
          empty="No unstaged changes"
          selectedFile={reviewTargetPath || selectedFile}
          selectedStage={reviewTargetStage || selectedFileStage}
          stage="unstaged"
          multiSelectedFiles={selectedFiles}
          onToggleAll={onStageAll}
          onToggleFile={onStage}
          onSelect={(path) => onSelectFile(path, "unstaged")}
          onAIInlineReview={(path) => onAIInlineReview(path, "unstaged")}
          onToggleOpen={onToggleUnstagedOpen}
          onMenu={(x, y, file) => onContextMenu(x, y, file, "unstaged")}
          onFileMultiClick={onFileMultiClick}
          isTreeView={isTreeView}
        />
        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-5 border-b border-accent-20 shrink-0">
            <span className="text-2xs text-text-muted">{selectedFiles.size} selected</span>
            <button onClick={onBatchStage} className="text-2xs font-medium text-accent hover:underline">
              Stage selected
            </button>
            <button onClick={onBatchUnstage} className="text-2xs font-medium text-text-muted hover:text-text-primary hover:underline">
              Unstage selected
            </button>
            <button onClick={onClearSelected} className="text-2xs text-text-muted hover:text-text-primary ml-auto">
              Clear
            </button>
          </div>
        )}
      </div>
    </>
  );
}
