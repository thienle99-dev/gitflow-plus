import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { useGitStatus, useGitDiff } from "@/queries/useGitLog";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, History, GitCommit, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import WorkingTree from "@/components/features/working-tree/WorkingTree";
import CommitDetail from "@/components/features/commit-detail/CommitDetail";
import LazyDiffViewer from "@/components/features/diff/LazyDiffViewer";
import StashPanel from "@/components/features/stash/StashPanel";
import TagPanel from "@/components/features/tags/TagPanel";
import ReflogBrowser from "@/components/features/reflog/ReflogBrowser";
import SubmoduleDetail from "@/components/features/submodules/SubmoduleDetail";
import { useSubmoduleList } from "@/queries/useSubmoduleList";
import FileHistoryPanel from "./FileHistoryPanel";
import BlameView from "@/components/features/blame/BlameView";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Skeleton } from "@/components/ui/feedback/Skeleton";
import { isImageFile } from "@/lib/file-utils";

export default function RightPanel() {
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const activeDialog = useUIStore((s) => s.activeDialog);
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: submodules } = useSubmoduleList(repoPath);

  if (activeDialog === "stash") {
    return <StashPanel />;
  }

  if (activeDialog === "tag") {
    return <TagPanel />;
  }

  if (activeDialog === "reflog") {
    return <ReflogBrowser />;
  }

  // Check if selected file is a submodule
  if (selectedFile && !selectedCommit && submodules?.find((sub) => sub.path === selectedFile)) {
    return <SubmoduleDetail submodule={submodules!.find((sub) => sub.path === selectedFile)!} />;
  }

  if (selectedFile && !selectedCommit) {
    return <DiffViewerPanel />;
  }

  if (selectedCommit) {
    return selectedFile ? <DiffViewerPanel /> : <CommitDetail />;
  }

  return <WorkingTree />;
}

function DiffViewerPanel() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const selectedFileStage = useUIStore((s) => s.selectedFileStage);
  const [showFullContext, setShowFullContext] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showFileHistory, setShowFileHistory] = useState(false);
  const [showBlame, setShowBlame] = useState(false);
  
  const { data: diff, isLoading } = useGitDiff(
    repoPath,
    selectedFile,
    selectedCommit,
    !selectedCommit && selectedFileStage === "staged",
    showFullContext ? 9999 : undefined,
  );
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const selectFile = useUIStore((s) => s.selectFile);
  const queryClient = useQueryClient();
  const diffSource = selectedCommit
    ? "commit"
    : selectedFileStage === "staged"
      ? "staged"
      : "working";
  const refreshDiff = () => {
    queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
  };

  // Close full screen on Escape key
  useEffect(() => {
    if (!isFullScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const content = (
    <div className={`flex flex-col bg-surface-0 ${
      isFullScreen
        ? "w-[94%] h-[90%] rounded-mac border border-border shadow-2xl overflow-hidden anim-dialog-enter"
        : "h-full"
    }`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 bg-surface-1-40">
        <button
          className="ghost text-xs"
          onClick={() => {
            if (isFullScreen) {
              setIsFullScreen(false);
            } else {
              selectFile(null);
            }
          }}
        >
          ← {isFullScreen ? "Close Full Screen" : "Back"}
        </button>
        <div className="flex items-center gap-2">
          <button
            className={`ghost text-2xs px-2.5 py-1 flex items-center gap-1 border border-transparent rounded transition-colors ${
              showFullContext 
                ? "text-[#0a84ff] bg-[#0a84ff]/10 border-[#0a84ff]/20 font-medium" 
                : "hover:bg-surface-2"
            }`}
            onClick={() => setShowFullContext(!showFullContext)}
            title={showFullContext ? "Show only changed hunks" : "Show entire file context"}
          >
            <Eye size={12} />
            {showFullContext ? "Compact Diff" : "Show Full File"}
          </button>
          
          <div className="segmented-control">
            <button
              className={diffViewMode === "split" ? "active" : ""}
              onClick={() => setDiffViewMode("split")}
            >
              Split
            </button>
            <button
              className={diffViewMode === "unified" ? "active" : ""}
              onClick={() => setDiffViewMode("unified")}
            >
              Unified
            </button>
          </div>

          <button
            className="ghost text-2xs px-2.5 py-1 hover:bg-surface-2 border border-border-40 rounded flex items-center gap-1 transition-colors"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? "Exit Full Screen" : "Open Full Screen"}
          >
            {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isFullScreen ? "Exit Full Screen" : "Full Screen"}</span>
          </button>

          {!selectedCommit && (
            <button
              className={`ghost text-2xs px-2.5 py-1 hover:bg-surface-2 border border-border-40 rounded flex items-center gap-1 transition-colors ${showFileHistory ? "text-[#0a84ff]" : ""}`}
              onClick={() => { setShowFileHistory(!showFileHistory); setShowBlame(false); }}
              title="Show file history"
            >
              <History size={12} />
              <span>History</span>
            </button>
          )}
          <button
            className={`ghost text-2xs px-2.5 py-1 hover:bg-surface-2 border border-border-40 rounded flex items-center gap-1 transition-colors ${showBlame ? "text-accent" : ""}`}
            onClick={() => { setShowBlame(!showBlame); setShowFileHistory(false); }}
            title="Show blame annotation"
          >
            <GitCommit size={12} />
            <span>Blame</span>
          </button>
        </div>
      </div>
      {showBlame ? (
        <BlameView filePath={selectedFile} onClose={() => setShowBlame(false)} />
      ) : showFileHistory && !selectedCommit ? (
        <FileHistoryPanel />
      ) : selectedFile && isImageFile(selectedFile) ? (
        <LazyDiffViewer
          diff={diff || ""}
          filePath={selectedFile}
          source={diffSource as "working" | "staged" | "commit"}
          onPatchApplied={refreshDiff}
          commitHash={selectedCommit}
        />
      ) : isLoading ? (
        <div className="flex-1 flex flex-col p-4 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : diff ? (
        <LazyDiffViewer
          diff={diff}
          filePath={selectedFile || ""}
          source={diffSource as "working" | "staged" | "commit"}
          onPatchApplied={refreshDiff}
        />
      ) : (
        <EmptyState variant="changes" title="No changes" description="Select a file to view its diff" />
      )}
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 bg-[#000000]/65 backdrop-blur-md z-[9998] flex items-center justify-center p-6 anim-overlay-enter">
        {content}
      </div>
    );
  }

  return content;
}
