import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useStashList, useStashPush, useStashPop, useStashApply, useStashDrop } from "@/queries/useGitStash";
import { GitBranch, Download, Upload, Trash2, Play, Plus, X } from "lucide-react";

export default function StashPanel() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: stashes, isLoading } = useStashList(repoPath);
  const stashPush = useStashPush(repoPath);
  const stashPop = useStashPop(repoPath);
  const stashApply = useStashApply(repoPath);
  const stashDrop = useStashDrop(repoPath);

  const [showPushForm, setShowPushForm] = useState(false);
  const [message, setMessage] = useState("");
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePush = async () => {
    try {
      await stashPush.mutateAsync({ message: message || undefined, includeUntracked });
      setMessage("");
      setIncludeUntracked(false);
      setShowPushForm(false);
      showToast("Changes stashed");
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handlePop = async (index?: number) => {
    try {
      await stashPop.mutateAsync({ index });
      showToast(`Stash@${index} popped`);
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleApply = async (index?: number) => {
    try {
      await stashApply.mutateAsync({ index });
      showToast(`Stash@${index} applied`);
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleDrop = async (index?: number) => {
    try {
      await stashDrop.mutateAsync({ index });
      showToast(`Stash@${index} dropped`);
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const formatDate = (msg: string) => {
    // Stash messages from git include "On branch: ..." — show branch info
    const branchMatch = msg.match(/^On (.+?):/);
    const label = msg.replace(/^On .+?: /, "").slice(0, 60);
    return { branch: branchMatch?.[1] || "current", label };
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-1">
        <Upload size={14} className="text-text-muted" />
        <span className="text-xs font-medium text-text-primary flex-1">
          Stashes ({stashes?.length ?? 0})
        </span>
        <button
          onClick={() => setShowPushForm(!showPushForm)}
          className="ghost p-1"
          title="New Stash"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Push form (collapsible) */}
      {showPushForm && (
        <div className="px-3 py-2 border-b border-border space-y-1.5 bg-surface-1">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Stash message (optional)"
            className="w-full text-xs bg-surface-2 border border-border rounded-mac px-2 py-1 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
          />
          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={includeUntracked}
              onChange={(e) => setIncludeUntracked(e.target.checked)}
              className="rounded"
            />
            Include untracked files
          </label>
          <div className="flex gap-1.5">
            <button
              onClick={handlePush}
              disabled={stashPush.isPending}
              className="flex-1 px-2 py-1 bg-accent text-accent-fg text-2xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {stashPush.isPending ? "Stashing..." : "Stash"}
            </button>
            <button
              onClick={() => setShowPushForm(false)}
              className="px-2 py-1 text-2xs text-text-muted hover:text-text-primary border border-border rounded-mac"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stash list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="text-xs text-text-muted text-center py-4">Loading stashes...</div>
        )}
        {!isLoading && (!stashes || stashes.length === 0) && (
          <div className="text-xs text-text-muted text-center py-4">No stashes</div>
        )}
        {stashes?.map((stash) => {
          const { branch, label } = formatDate(stash.message);
          return (
            <div
              key={stash.index}
              className="px-3 py-1.5 border-b border-border hover:bg-surface-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-[40px] shrink-0 text-2xs font-mono text-text-muted">
                  stash@{stash.index}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate text-text-primary">{label}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <GitBranch size={9} className="text-text-muted" />
                    <span className="text-2xs text-text-muted truncate">{branch}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    className="ghost p-1 opacity-50 hover:opacity-100"
                    title="Pop (apply & drop)"
                    onClick={() => handlePop(stash.index)}
                  >
                    <Download size={12} />
                  </button>
                  <button
                    className="ghost p-1 opacity-50 hover:opacity-100"
                    title="Apply (keep stash)"
                    onClick={() => handleApply(stash.index)}
                  >
                    <Play size={12} />
                  </button>
                  <button
                    className="ghost p-1 opacity-50 hover:opacity-100 hover:text-[#ff375f]"
                    title="Drop"
                    onClick={() => handleDrop(stash.index)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
