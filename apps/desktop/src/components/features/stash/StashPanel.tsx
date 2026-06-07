import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useStashList, useStashPush, useStashPop, useStashApply, useStashDrop } from "@/queries/useGitStash";
import { useStashDiff } from "@/queries/useStashDiff";
import { showToast } from "@/lib/toast";
import { parseDiffFiles, countDiffChanges } from "@/lib/parse-diff";
import { GitBranch, Download, Upload, Trash2, Play, FileText, Plus, Minus } from "lucide-react";
import StashDiffViewer from "./StashDiffViewer";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import { EmptyState, EmptyStateInline, StashChangesAction } from "@/components/ui/feedback/EmptyState";
import { Skeleton } from "@/components/ui/feedback/Skeleton";

/** Inline preview of stash contents (file count + insertions/deletions) */
function StashPreview({ repoPath, stashIndex }: { repoPath: string; stashIndex: number }) {
  const { data: diffOutput } = useStashDiff(repoPath, stashIndex);
  if (!diffOutput) return null;
  const files = parseDiffFiles(diffOutput);
  const changes = countDiffChanges(files);
  return (
    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-text-muted">
      <span>{changes.files} file{changes.files !== 1 ? "s" : ""}</span>
      {changes.added > 0 && (
        <span className="inline-flex items-center gap-0.5 text-success">
          <Plus size={8} />{changes.added}
        </span>
      )}
      {changes.removed > 0 && (
        <span className="inline-flex items-center gap-0.5 text-danger">
          <Minus size={8} />{changes.removed}
        </span>
      )}
    </div>
  );
}

export default function StashPanel({ onClose }: { onClose?: () => void }) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: stashes, isLoading } = useStashList(repoPath);
  const stashPush = useStashPush(repoPath);
  const stashPop = useStashPop(repoPath);
  const stashApply = useStashApply(repoPath);
  const stashDrop = useStashDrop(repoPath);
  const selectedStashIndex = useUIStore((s) => s.selectedStashIndex);
  const setSelectedStashIndex = useUIStore((s) => s.setSelectedStashIndex);

  const [showPushForm, setShowPushForm] = useState(false);
  const [message, setMessage] = useState("");
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const handlePush = async () => {
    try {
      await stashPush.mutateAsync({ message: message || undefined, includeUntracked });
      setMessage("");
      setIncludeUntracked(false);
      setShowPushForm(false);
      showToast("Changes stashed");
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handlePop = async (index?: number) => {
    try {
      await stashPop.mutateAsync({ index });
      showToast(`Stash@${index} popped`);
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleApply = async (index?: number) => {
    try {
      await stashApply.mutateAsync({ index });
      showToast(`Stash@${index} applied`);
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleDrop = async (index?: number) => {
    try {
      await stashDrop.mutateAsync({ index });
      showToast(`Stash@${index} dropped`);
      if (selectedStashIndex === index) {
        setSelectedStashIndex(null);
      }
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const formatDate = (msg: string) => {
    const branchMatch = msg.match(/^On (.+?):/);
    const label = msg.replace(/^On .+?: /, "").slice(0, 60);
    return { branch: branchMatch?.[1] || "current", label };
  };

  const selectedStash = stashes?.find((s) => s.index === selectedStashIndex);

  return (
    <div className="h-full flex gap-2 p-2 bg-surface-0">
      {/* Left: Stash List */}
      <div className="w-56 flex flex-col border border-border-40 rounded-mac overflow-hidden bg-surface-0">
        {/* Push Form */}
        {showPushForm ? (
          <div className="p-2 border-b border-border-40 space-y-2 bg-surface-1-30">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Stash message (optional)"
              className="w-full text-xs bg-surface-2 border border-border rounded-mac px-2 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={includeUntracked}
                onChange={(e) => setIncludeUntracked(e.target.checked)}
                className="rounded"
              />
              Include untracked
            </label>
            <div className="flex gap-1">
              <button
                onClick={handlePush}
                disabled={stashPush.isPending}
                className="flex-1 px-2 py-1.5 text-xs bg-accent text-white rounded-mac disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {stashPush.isPending ? "Stashing..." : "Stash"}
              </button>
              <button
                onClick={() => setShowPushForm(false)}
                className="px-2 py-1.5 text-xs border border-border rounded-mac hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 border-b border-border-40 bg-surface-1-40">
            <button
              onClick={() => setShowPushForm(true)}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-accent text-white rounded-mac hover:opacity-90 transition-opacity"
            >
              <Upload size={12} />
              Stash Changes
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Stashes ({stashes?.length ?? 0})
          </div>
          {isLoading && (
            <div className="space-y-1 px-3 py-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          )}
          {!isLoading && (!stashes || stashes.length === 0) && (
            <div className="py-6">
              <EmptyState
                variant="stash"
                title="No stashes"
                description="Stash your working directory changes to cleanly switch branches"
                action={
                  <StashChangesAction onClick={() => setShowPushForm(true)} />
                }
              />
            </div>
          )}
          {stashes?.map((stash) => {
            const { branch, label } = formatDate(stash.message);
            return (
              <div
                key={stash.index}
                onClick={() => setSelectedStashIndex(stash.index)}
                className={`px-3 py-2 text-xs cursor-pointer border-b border-border-20 transition-colors ${
                  selectedStashIndex === stash.index
                    ? "bg-accent-20 text-accent"
                    : "hover:bg-surface-2-40 text-text-primary"
                }`}
              >
                <div className="font-semibold truncate flex items-center gap-1">
                  <FileText size={10} className="shrink-0" />
                  {"stash@{" + stash.index + "}"}
                </div>
                <div className="text-text-muted truncate mt-0.5">{label}</div>
                <div className="flex items-center gap-1 mt-1 text-text-muted">
                  <GitBranch size={9} className="opacity-75" />
                  <span className="truncate">{branch}</span>
                </div>
                {repoPath && <StashPreview repoPath={repoPath} stashIndex={stash.index} />}
                <div className="flex gap-1 mt-1.5">
                  <button
                    className="px-1.5 py-0.5 text-[10px] rounded-mac text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                    title="Pop"
                    onClick={(e) => { e.stopPropagation(); handlePop(stash.index); }}
                  >
                    <Download size={10} />
                  </button>
                  <button
                    className="px-1.5 py-0.5 text-[10px] rounded-mac text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                    title="Apply"
                    onClick={(e) => { e.stopPropagation(); handleApply(stash.index); }}
                  >
                    <Play size={10} />
                  </button>
                  <button
                    className="px-1.5 py-0.5 text-[10px] rounded-mac text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Drop"
                    onClick={(e) => { e.stopPropagation(); setDropTarget(stash.index); }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Diff Viewer */}
      <div className="flex-1 border border-border-40 rounded-mac overflow-hidden bg-surface-1">
        {selectedStash ? (
          <StashDiffViewer stash={selectedStash} />
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Select a stash to view diff
          </div>
        )}
      </div>

      <ConfirmDialog
        open={dropTarget !== null}
        title="Drop Stash"
        message={`Permanently delete stash@{${dropTarget}}? The stashed changes will be lost forever.`}
        impactItems={[
          {
            label: "Stashed changes will be permanently deleted",
            severity: "irreversible",
          },
          {
            label: "This cannot be undone — consider applying the stash first if you need the changes",
            severity: "warning",
          },
        ]}
        confirmLabel="Drop Stash"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => { handleDrop(dropTarget ?? undefined); setDropTarget(null); }}
        onCancel={() => setDropTarget(null)}
      />
    </div>
  );
}
