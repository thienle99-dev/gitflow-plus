import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { useGitStatus, useGitDiff } from "@/queries/useGitLog";
import WorkingTree from "./WorkingTree";
import CommitDetail from "./CommitDetail";
import DiffViewer from "@/components/diff/DiffViewer";

export default function RightPanel() {
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const selectedFile = useUIStore((s) => s.selectedFile);

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
  const { data: diff, isLoading } = useGitDiff(repoPath, selectedFile, selectedCommit);
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const selectFile = useUIStore((s) => s.selectFile);

  return (
    <div className="h-full flex flex-col bg-surface-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <button className="ghost text-xs" onClick={() => selectFile(null)}>
          ← Back
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
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Loading diff...
        </div>
      ) : diff ? (
        <DiffViewer diff={diff} filePath={selectedFile || ""} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          No changes
        </div>
      )}
    </div>
  );
}
