import { useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { useGitStatus, useGitDiff } from "@/queries/useGitLog";
import { useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import WorkingTree from "./WorkingTree";
import CommitDetail from "./CommitDetail";
import DiffViewer from "@/components/diff/DiffViewer";
import StashPanel from "@/components/phase2/StashPanel";
import TagPanel from "@/components/phase2/TagPanel";

export default function RightPanel() {
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const activeDialog = useUIStore((s) => s.activeDialog);

  if (activeDialog === "stash") {
    return <StashPanel />;
  }

  if (activeDialog === "tag") {
    return <TagPanel />;
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

  return (
    <div className="h-full flex flex-col bg-surface-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <button className="ghost text-xs" onClick={() => selectFile(null)}>
          ← Back
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
        </div>
      </div>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Loading diff...
        </div>
      ) : diff ? (
        <DiffViewer
          diff={diff}
          filePath={selectedFile || ""}
          source={diffSource as "working" | "staged" | "commit"}
          onPatchApplied={refreshDiff}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          No changes
        </div>
      )}
    </div>
  );
}
