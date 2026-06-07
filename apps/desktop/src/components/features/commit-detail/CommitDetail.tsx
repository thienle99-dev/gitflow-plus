import { useMemo, useState, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useCommitChangedFiles, useGitLog } from "@/queries/useGitLog";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  GitCommit,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  User,
  ChevronDown,
  Folder,
  List,
  FolderTree,
} from "lucide-react";
import { GravatarImg } from "@/components/ui/shared";
import { useAICommitExplain, useAICommitReview } from "@/queries/useAI";
import { AI_REVIEW_MODE_OPTIONS, readLastAIReviewMode, saveLastAIReviewMode, type AIReviewMode } from "@/lib/ai";
import { showToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import AIMarkdown from "@/components/ui/feedback/AIMarkdown";
import { StatusBadge, fileIcon, statusLabel, statusColor } from "@/components/ui/shared";
import { useCommitDateFormatter } from "@/lib/date";

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
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [reviewResult, setReviewResult] = useState("");
  const [reviewMode, setReviewMode] = useState<AIReviewMode>(() => readLastAIReviewMode());
  const aiExplain = useAICommitExplain();
  const aiReview = useAICommitReview();

  const [isTreeView, setIsTreeView] = useState(() => {
    return localStorage.getItem("gitflowTreeViewMode") !== "false";
  });

  const toggleTreeView = () => {
    setIsTreeView((prev) => {
      const next = !prev;
      localStorage.setItem("gitflowTreeViewMode", next ? "true" : "false");
      window.dispatchEvent(new Event("gitflow-viewmode-updated"));
      return next;
    });
  };

  useEffect(() => {
    const handleViewModeUpdate = () => {
      setIsTreeView(localStorage.getItem("gitflowTreeViewMode") !== "false");
    };
    window.addEventListener("gitflow-viewmode-updated", handleViewModeUpdate);
    return () => {
      window.removeEventListener("gitflow-viewmode-updated", handleViewModeUpdate);
    };
  }, []);

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
    if (isTreeView && changedFiles) {
      return buildCommitFileTree(changedFiles);
    }
    return null;
  }, [changedFiles, isTreeView]);

  // Reset explanation & review when commit changes
  useEffect(() => {
    setShowExplanation(false);
    setExplanation("");
    aiExplain.reset();
    setShowReview(false);
    setReviewResult("");
    aiReview.reset();
  }, [selectedCommit]);

  const handleRevert = () => {
    if (!repoPath || !selectedCommit) return;
    setConfirmRevert(true);
  };

  const doRevert = async () => {
    setConfirmRevert(false);
    setReverting(true);
    try {
      const result = await api.commit.revert(repoPath!, selectedCommit!);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      showToast(result);
    } catch (e: any) {
      showToast(`Revert failed: ${e}`, "error");
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
        mode: reviewMode,
      });
      setReviewResult(result);
    } catch {
      // Error is rendered from mutation state
    }
  };

  const handleReviewModeChange = (mode: AIReviewMode) => {
    setReviewMode(mode);
    saveLastAIReviewMode(mode);
    setReviewResult("");
    aiReview.reset();
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

  const formatCommitDate = useCommitDateFormatter();
  const formatDate = (date: string) => {
    return formatCommitDate(date);
  };

  return (
    <>
    <div className="h-full flex flex-col bg-surface-0 overflow-y-auto">
      {/* Commit metadata */}
      <div className="px-3 py-2 border-b border-border space-y-1.5">
        <div className="text-xs font-medium text-text-primary leading-tight">
          {commit.message}
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-muted">
          <GitCommit size={10} />
          <span className="font-mono">{commit.hash.slice(0, 7)}</span>
          <SignatureBadge signature={commit.signature} />
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-secondary">
          <GravatarImg email={commit.email} size={14} />
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
            <select
              value={reviewMode}
              onChange={(event) => handleReviewModeChange(event.target.value as AIReviewMode)}
              className="h-6 max-w-[132px] rounded-mac border border-accent-30 bg-accent-10 px-1.5 text-2xs font-medium text-accent outline-none hover:bg-accent-20"
              title="Choose AI review focus"
            >
              {AI_REVIEW_MODE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
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
              <AIMarkdown content={explanation} />
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
              <AIMarkdown content={reviewResult} />
            </div>
          ) : null}
        </div>
      )}

      <div className="flex-1 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-text-primary">
            Changed Files{changedFiles ? ` (${changedFiles.length})` : ""}
          </div>
          {changedFiles && changedFiles.length > 0 && (
            <button
              className={`h-6 w-6 inline-flex items-center justify-center rounded-md transition-colors ${
                isTreeView
                  ? "text-accent bg-accent-10 hover:bg-accent-20"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-2"
              }`}
              onClick={toggleTreeView}
              title={isTreeView ? "Switch to List View" : "Switch to Tree View"}
            >
              {isTreeView ? <FolderTree size={13} /> : <List size={13} />}
            </button>
          )}
        </div>
        {filesLoading ? (
          <div className="text-2xs text-text-muted">Loading files...</div>
        ) : filesError ? (
          <div className="text-2xs text-[#ff375f]">Unable to load changed files</div>
        ) : changedFiles && changedFiles.length > 0 ? (
          isTreeView && treeRoot ? (
            <CommitFileTreeRenderer
              node={treeRoot}
              depth={0}
              selectedFile={selectedFile}
              selectFile={selectFile}
              collapsedFolders={collapsedFolders}
              onToggleFolder={handleToggleFolder}
            />
          ) : (
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
          )
        ) : (
          <div className="text-2xs text-text-muted">No changed files</div>
        )}
      </div>
    </div>

    <ConfirmDialog
      open={confirmRevert}
      title="Revert Commit"
      message={`Create a new commit that undoes the changes from ${selectedCommit?.slice(0, 7)}?`}
      impactItems={[
        {
          label: "A new 'revert' commit will be added to the current branch",
          severity: "info",
        },
        {
          label: "The original commit is not removed — this is a forward-fix, not a rewrite",
          severity: "info",
        },
        {
          label: "May cause conflicts if later changes depend on this commit",
          severity: "warning",
        },
      ]}
      confirmLabel="Revert"
      cancelLabel="Cancel"
      variant="destructive"
      onConfirm={doRevert}
      onCancel={() => setConfirmRevert(false)}
    />
    </>
  );
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

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

function getFolder(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}


function SignatureBadge({ signature }: { signature: string }) {
  if (!signature || signature === "N") return null;

  if (signature === "G" || signature === "Y") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-[#30d158]/10 text-[#30d158] text-[10px] font-semibold leading-none">
        <span>&#10003;</span>
        <span>Signed</span>
      </span>
    );
  }

  if (signature === "B") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-[#ff453a]/10 text-[#ff453a] text-[10px] font-semibold leading-none">
        <span>&#10007;</span>
        <span>Bad</span>
      </span>
    );
  }

  // U, X, R — unknown/expired/revoked
  const labels: Record<string, string> = { U: "Unknown", X: "Expired", R: "Revoked" };
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-[#ff9f0a]/10 text-[#ff9f0a] text-[10px] font-semibold leading-none">
      <span>&#9888;</span>
      <span>{labels[signature] || signature}</span>
    </span>
  );
}

interface CommitFileTreeNode {
  type: "file";
  name: string;
  path: string;
  file: CommitFileChange;
}

interface CommitFolderTreeNode {
  type: "folder";
  name: string;
  path: string;
  children: { [key: string]: CommitFileTreeNode | CommitFolderTreeNode };
}

interface CommitFileChange {
  path: string;
  old_path?: string | null;
  status: string;
}

function buildCommitFileTree(files: CommitFileChange[]): CommitFolderTreeNode {
  const root: CommitFolderTreeNode = {
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
        current = current.children[part] as CommitFolderTreeNode;
      }
    }
  }

  return root;
}

interface CommitFileTreeRendererProps {
  node: CommitFolderTreeNode;
  depth: number;
  selectedFile: string | null;
  selectFile: (path: string) => void;
  collapsedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function CommitFileTreeRenderer({
  node,
  depth,
  selectedFile,
  selectFile,
  collapsedFolders,
  onToggleFolder,
}: CommitFileTreeRendererProps) {
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
              </div>
              {!isCollapsed && (
                <CommitFileTreeRenderer
                  node={child}
                  depth={depth + 1}
                  selectedFile={selectedFile}
                  selectFile={selectFile}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={onToggleFolder}
                />
              )}
            </div>
          );
        } else {
          const displayPath = child.file.old_path ? `${child.file.old_path} -> ${child.file.path}` : child.file.path;
          const isSelected = selectedFile === child.file.path;
          return (
            <div
              key={`${child.file.status}:${child.file.old_path || ""}:${child.file.path}`}
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              <div
                className={`tree-item w-full grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 text-left transition-all ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => selectFile(child.file.path)}
                title={`${statusText(child.file.status)}: ${displayPath}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectFile(child.file.path);
                  }
                }}
              >
                <span className="h-4 w-4 flex items-center justify-center shrink-0">
                  {fileIcon(child.file.path, child.file.status)}
                </span>
                <span className="min-w-0 flex flex-col justify-center">
                  <span className={`block text-xs font-medium text-current truncate leading-4 ${child.file.status === "deleted" ? "line-through opacity-60" : ""}`}>
                    {child.name}
                  </span>
                </span>
                <span className="flex items-center justify-end min-w-[20px]">
                  <StatusBadge status={child.file.status} selected={isSelected} />
                </span>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}
