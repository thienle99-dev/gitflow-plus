import { useState, useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useBranchCompare, useBranchFileDiff } from "@/queries/useBranchCompare";
import { ArrowLeftRight, GitBranch, FileText, Loader2, AlertCircle, Plus, Minus, Pencil, ArrowRight } from "lucide-react";
import LazyDiffViewer from "@/components/features/diff/LazyDiffViewer";

interface BranchCompareDialogProps {
  baseBranch: string;
  targetBranch: string;
  onClose: () => void;
}

export default function BranchCompareDialog({ baseBranch, targetBranch, onClose }: BranchCompareDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [contextLines, setContextLines] = useState(3);

  const { data: comparison, isLoading, error } = useBranchCompare(repoPath, baseBranch, targetBranch);
  const { data: fileDiff, isLoading: diffLoading } = useBranchFileDiff(
    repoPath,
    baseBranch,
    targetBranch,
    selectedFile,
  );

  const statusIcon = (status: string) => {
    const s = status.charAt(0).toUpperCase();
    if (s === "A") return <Plus size={10} className="text-[#30d158]" />;
    if (s === "D") return <Minus size={10} className="text-[#ff453a]" />;
    if (s === "R" || s === "C") return <ArrowRight size={10} className="text-[#ff9f0a]" />;
    return <Pencil size={10} className="text-accent" />;
  };

  const statusLabel = (status: string) => {
    const s = status.charAt(0).toUpperCase();
    if (s === "A") return "Added";
    if (s === "D") return "Deleted";
    if (s === "R") return "Renamed";
    if (s === "C") return "Copied";
    return "Modified";
  };

  const statusColor = (status: string) => {
    const s = status.charAt(0).toUpperCase();
    if (s === "A") return "text-[#30d158] bg-[#30d158]/10";
    if (s === "D") return "text-[#ff453a] bg-[#ff453a]/10";
    if (s === "R" || s === "C") return "text-[#ff9f0a] bg-[#ff9f0a]/10";
    return "text-accent bg-accent/10";
  };

  return (
    <div className="w-[900px] max-h-[85vh] flex flex-col bg-surface-0 rounded-mac overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-40">
        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
          <ArrowLeftRight size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-text-primary">Branch Comparison</h2>
          <p className="text-2xs text-text-muted mt-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono text-2xs">
              <GitBranch size={10} />
              {baseBranch}
            </span>
            <span className="text-text-muted">vs</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#30d158]/10 text-[#30d158] font-mono text-2xs">
              <GitBranch size={10} />
              {targetBranch}
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {!comparison && isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-6 mx-5 mt-4 px-3 rounded-mac bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300">{String(error)}</p>
          </div>
        ) : comparison ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Ahead/behind stats */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border-40 bg-surface-1/20">
              <div className="flex-1 rounded-mac bg-surface-2-30 border border-border-40 p-2.5 text-center">
                <div className="text-lg font-bold text-[#30d158]">{comparison.ahead}</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  <span className="text-[#30d158]">{targetBranch}</span> ahead
                </div>
              </div>
              <div className="flex-1 rounded-mac bg-surface-2-30 border border-border-40 p-2.5 text-center">
                <div className="text-lg font-bold text-[#ff9f0a]">{comparison.behind}</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  <span className="text-accent">{baseBranch}</span> ahead
                </div>
              </div>
              <div className="flex-1 rounded-mac bg-surface-2-30 border border-border-40 p-2.5 text-center">
                <div className="text-lg font-bold text-text-primary">{comparison.files.length}</div>
                <div className="text-2xs text-text-muted mt-0.5">Changed files</div>
              </div>
            </div>

            {/* File list + diff viewer */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* File list */}
              <div className="w-64 shrink-0 border-r border-border-40 overflow-y-auto">
                {comparison.files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                    <GitBranch size={24} className="mb-2 opacity-30" />
                    <p className="text-2xs">Branches are identical</p>
                  </div>
                ) : (
                  comparison.files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file.path)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer transition-colors border-b border-border-40/50 ${
                        selectedFile === file.path
                          ? "bg-accent/10 border-l-2 border-l-accent"
                          : "hover:bg-surface-2-30 border-l-2 border-l-transparent"
                      }`}
                    >
                      <span className="shrink-0">{statusIcon(file.status)}</span>
                      <span className="flex-1 truncate text-2xs font-mono text-text-primary" title={file.old_path ? `${file.old_path} → ${file.path}` : file.path}>
                        {file.path}
                      </span>
                      <span className={`text-2xs px-1.5 py-0.5 rounded shrink-0 ${statusColor(file.status)}`}>
                        {statusLabel(file.status)}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Diff viewer */}
              <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                {!selectedFile ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted">
                    <FileText size={32} className="mb-3 opacity-30" />
                    <p className="text-xs">Select a file to view the diff</p>
                  </div>
                ) : diffLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={20} className="animate-spin text-accent" />
                  </div>
                ) : fileDiff ? (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <LazyDiffViewer
                      diff={fileDiff}
                      filePath={selectedFile}
                      source="commit"
                      onPatchApplied={() => {}}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted">
                    <AlertCircle size={20} className="mb-2 opacity-30" />
                    <p className="text-xs">No diff available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-5 py-3 border-t border-border-40 bg-surface-1/30">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-mac transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
