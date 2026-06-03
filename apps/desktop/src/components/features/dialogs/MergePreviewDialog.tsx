import { useState, useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitBranches } from "@/queries/useGitLog";
import { useMergePreview, useMergeBranch } from "@/queries/useGitMerge";
import { showToast } from "@/lib/toast";
import { ArrowLeftRight, GitMerge, GitBranch, FileText, Loader2, AlertCircle, ChevronDown } from "lucide-react";

interface MergePreviewDialogProps {
  initialBranch?: string;
  onClose: () => void;
}

export default function MergePreviewDialog({ initialBranch, onClose }: MergePreviewDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const currentBranch = useRepoStore((s) => s.selectedRef);
  const { data: branches } = useGitBranches(repoPath);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(initialBranch ?? null);
  const [squash, setSquash] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(!initialBranch);

  const localBranches = useMemo(
    () => (branches ?? []).filter((b) => !b.remote && !b.current).map((b) => b.name),
    [branches],
  );

  const { data: preview, isLoading, error } = useMergePreview(repoPath, selectedBranch);
  const mergeBranch = useMergeBranch(repoPath);

  const handleMerge = async () => {
    if (!repoPath || !selectedBranch) return;
    try {
      await mergeBranch.mutateAsync({ branch: selectedBranch, squash });
      showToast(squash ? `Squash merged "${selectedBranch}"` : `Merged "${selectedBranch}"`);
      onClose();
    } catch (e: any) {
      showToast(`Merge failed: ${e?.message ?? e}`, "error");
    }
  };

  const formatHash = (hash: string) => hash.substring(0, 7);

  return (
    <div className="w-[560px] max-h-[80vh] flex flex-col bg-surface-0 rounded-mac overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-40">
        <div className="h-8 w-8 rounded-full bg-accent-10 flex items-center justify-center">
          <ArrowLeftRight size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-text-primary">Merge Branch</h2>
          <p className="text-2xs text-text-muted mt-0.5">
            {currentBranch ? `Into ${currentBranch}` : "Preview changes before merging"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Branch selector */}
      <div className="px-5 pt-3 pb-2">
        <label className="text-2xs font-semibold text-text-secondary mb-1.5 block">Source Branch</label>
        {showBranchPicker || !selectedBranch ? (
          <div className="space-y-2">
            <div className="relative">
              <select
                value={selectedBranch ?? ""}
                onChange={(e) => {
                  setSelectedBranch(e.target.value || null);
                  if (e.target.value) setShowBranchPicker(false);
                }}
                className="w-full appearance-none bg-surface-2-30 border border-border-40 rounded-mac px-3 py-1.5 text-xs text-text-primary pr-7 focus:outline-none focus:border-accent-60"
              >
                <option value="">Select a branch...</option>
                {localBranches.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            {selectedBranch && (
              <div className="flex gap-2">
                {localBranches.filter((b) => b !== selectedBranch).slice(0, 5).map((name) => (
                  <button
                    key={name}
                    onClick={() => { setSelectedBranch(name); setShowBranchPicker(false); }}
                    className="text-2xs px-2 py-0.5 rounded-full bg-surface-2-30 hover:bg-surface-2 border border-border-40 text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-mac bg-accent-10 border border-accent-20">
              <GitBranch size={12} className="text-accent" />
              <span className="text-xs font-semibold text-accent">{selectedBranch}</span>
            </div>
            <button
              onClick={() => setShowBranchPicker(true)}
              className="text-2xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Preview content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2">
        {!selectedBranch ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-muted">
            <GitBranch size={32} className="mb-3 opacity-30" />
            <p className="text-xs">Select a branch to preview the merge</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-6 px-3 rounded-mac bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300">{String(error)}</p>
          </div>
        ) : preview ? (
          <div className="space-y-3">
            {/* Ahead/behind stats */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-mac bg-surface-2-30 border border-border-40 p-3 text-center">
                <div className="text-lg font-bold text-[#30d158]">{preview.behind}</div>
                <div className="text-2xs text-text-muted mt-0.5">Incoming commits</div>
                <div className="text-2xs text-text-muted">({selectedBranch} → {currentBranch})</div>
              </div>
              <div className="flex-1 rounded-mac bg-surface-2-30 border border-border-40 p-3 text-center">
                <div className="text-lg font-bold text-[#ff9f0a]">{preview.ahead}</div>
                <div className="text-2xs text-text-muted mt-0.5">Ahead commits</div>
                <div className="text-2xs text-text-muted">({currentBranch} → {selectedBranch})</div>
              </div>
            </div>

            {/* Incoming commits */}
            {preview.incoming_commits.length > 0 && (
              <div>
                <h3 className="text-2xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <GitMerge size={12} />
                  Incoming Commits ({preview.incoming_commits.length})
                </h3>
                <div className="rounded-mac border border-border-40 overflow-hidden">
                  {preview.incoming_commits.map((commit, i) => (
                    <div
                      key={commit.hash}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs ${i > 0 ? "border-t border-border-40" : ""}`}
                    >
                      <code className="text-2xs text-accent shrink-0 font-mono">{formatHash(commit.hash)}</code>
                      <span className="flex-1 truncate text-text-primary">{commit.message}</span>
                      <span className="text-2xs text-text-muted shrink-0">{commit.author}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Changed files */}
            {preview.changed_files.length > 0 && (
              <div>
                <h3 className="text-2xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <FileText size={12} />
                  Changed Files ({preview.changed_files.length})
                </h3>
                <div className="rounded-mac border border-border-40 overflow-hidden">
                  {preview.changed_files.map((file, i) => (
                    <div
                      key={file.path}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs ${i > 0 ? "border-t border-border-40" : ""}`}
                    >
                      <span className="flex-1 truncate text-text-primary font-mono text-2xs">{file.path}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {file.additions > 0 && (
                          <span className="text-2xs font-mono text-[#30d158]">+{file.additions}</span>
                        )}
                        {file.deletions > 0 && (
                          <span className="text-2xs font-mono text-[#ff453a]">−{file.deletions}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.incoming_commits.length === 0 && preview.changed_files.length === 0 && (
              <div className="text-center py-6 text-xs text-text-muted">
                Branch is up to date — nothing to merge
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border-40 bg-surface-1-30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={squash}
              onChange={(e) => setSquash(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-[18px] bg-surface-3 rounded-full transition-colors duration-200 peer-checked:bg-accent"></div>
            <div className="absolute left-[2px] top-[2px] bg-white w-[14px] h-[14px] rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-3.5"></div>
          </div>
          <span className="text-2xs text-text-secondary">Squash merge</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-mac transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={!selectedBranch || mergeBranch.isPending || (preview?.behind === 0 && preview?.ahead === 0)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-80 rounded-mac transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {mergeBranch.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <GitMerge size={12} />
            )}
            {squash ? "Squash Merge" : "Merge"}
          </button>
        </div>
      </div>

    </div>
  );
}
