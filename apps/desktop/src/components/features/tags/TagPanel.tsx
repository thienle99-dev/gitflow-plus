import { useState } from "react";
import { useCommitDateFormatter } from "@/lib/date";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { useTagList, useTagCreate, useTagDelete, useTagPush } from "@/queries/useGitTag";
import { useGenerateTagDescription } from "@/queries/useAI";
import { showToast } from "@/lib/toast";
import { Tag, Plus, Trash2, Upload, GitCommit, User, Calendar, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/form";
import { EmptyStateInline, EmptyState, CreateTagAction } from "@/components/ui/feedback/EmptyState";
import { SkeletonTagRow } from "@/components/ui/feedback/Skeleton";

export default function TagPanel({ onClose }: { onClose?: () => void }) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: tags, isLoading } = useTagList(repoPath);
  const tagCreate = useTagCreate(repoPath);
  const tagDelete = useTagDelete(repoPath);
  const tagPush = useTagPush(repoPath);
  const generateDescription = useGenerateTagDescription(repoPath);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadCommitsForTagDescription = async () => {
    if (!repoPath) throw new Error("No repository selected");
    const targetRef = target.trim() || "HEAD";
    const previousTag = tags?.find((tag) => tag.name !== name.trim());
    const commits = previousTag
      ? await api.logSince(repoPath, previousTag.name, 200, targetRef)
      : await api.log(repoPath, 0, 80, targetRef);

    return { commits, previousTag: previousTag?.name, targetRef };
  };

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      showToast("Enter a tag name first", "error");
      return;
    }

    try {
      const { commits, previousTag, targetRef } = await loadCommitsForTagDescription();
      const result = await generateDescription.mutateAsync({
        tagName: name.trim(),
        previousTag,
        targetRef,
        commits,
      });
      setMessage(result.description);
      showToast(result.fallback ? result.reason || "Generated local tag description" : "Generated tag description");
    } catch (e: any) {
      showToast(`Error: ${e?.message || e}`, "error");
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await tagCreate.mutateAsync({
        name: name.trim(),
        target: target.trim() || undefined,
        message: message.trim() || undefined,
      });
      setName("");
      setTarget("");
      setMessage("");
      setShowCreate(false);
      showToast(`Tag "${name}" created`);
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleDelete = async (tagName: string) => {
    try {
      await tagDelete.mutateAsync({ name: tagName });
      setConfirmDelete(null);
      showToast(`Tag "${tagName}" deleted`);
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handlePush = async (tagName: string) => {
    try {
      await tagPush.mutateAsync({ name: tagName });
      showToast(`Tag "${tagName}" pushed`);
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const formatCommitDate = useCommitDateFormatter();
  const formatDate = (dateStr: string) => {
    return formatCommitDate(dateStr);
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-60 bg-surface-1-40 backdrop-blur-md">
        <Tag size={14} className="text-text-muted" />
        <span className="text-xs font-semibold text-text-primary flex-1">
          Tags ({tags?.length ?? 0})
        </span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="ghost p-1 text-text-muted hover:text-text-primary"
          title="New Tag"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Create tag form (collapsible) */}
      {showCreate && (
        <div className="px-4 py-3.5 border-b border-border-60 space-y-2.5 bg-surface-1-30">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name *"
            variant="surface-1"
            className="text-xs h-8 px-2.5 rounded-mac"
          />
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target commit hash (optional — defaults to HEAD)"
            variant="surface-1"
            className="text-xs h-8 px-2.5 rounded-mac"
          />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                Tag description
              </label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={!name.trim() || generateDescription.isPending}
                className="inline-flex items-center gap-1 h-6 px-2 text-3xs font-semibold rounded-mac border border-accent-30 bg-accent-10 text-accent hover:bg-accent-15 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                title="Generate tag description from commits since the previous tag"
              >
                {generateDescription.isPending ? (
                  <span className="h-3 w-3 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                Generate
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message (optional — creates annotated tag)"
              rows={4}
              className="w-full px-2.5 py-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted-60 focus:border-accent focus:ring-1 focus:ring-accent-20 outline-none resize-y min-h-20"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || tagCreate.isPending}
              className="flex-1 h-7 bg-accent text-accent-fg text-2xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {tagCreate.isPending ? "Creating..." : "Create Tag"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="h-7 px-3 text-2xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="py-2">
            <SkeletonTagRow />
            <SkeletonTagRow />
            <SkeletonTagRow />
          </div>
        )}
        {!isLoading && (!tags || tags.length === 0) && (
          <div className="py-6">
            <EmptyState
              variant="tags"
              title="No tags found"
              description="Tag important commits for release points or milestones"
              action={
                <CreateTagAction onClick={() => setShowCreate(true)} />
              }
            />
          </div>
        )}
        {tags?.map((tag) => (
          <div
            key={tag.name}
            className="px-4 py-3 border-b border-border-40 hover:bg-surface-1-30 transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <Tag size={13} className="mt-0.5 shrink-0 text-[#ff9f0a]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-text-primary truncate">
                    {tag.name}
                  </span>
                  {tag.annotated && (
                    <span className="text-3xs bg-accent-10 text-accent font-semibold px-1 rounded-sm">annotated</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-3xs text-text-muted">
                  <span className="flex items-center gap-0.5">
                    <GitCommit size={9} className="opacity-75" />
                    <span className="font-mono font-semibold text-accent bg-accent-10 px-0.5 rounded-sm">
                      {tag.hash.slice(0, 7)}
                    </span>
                  </span>
                  {tag.author && (
                    <span className="flex items-center gap-0.5">
                      <User size={9} className="opacity-75" />
                      <span className="truncate max-w-[80px]">{tag.author}</span>
                    </span>
                  )}
                  {tag.date && (
                    <span className="flex items-center gap-0.5">
                      <Calendar size={9} className="opacity-75" />
                      <span>{formatDate(tag.date)}</span>
                    </span>
                  )}
                </div>
                {tag.message && (
                  <div className="text-3xs text-text-secondary mt-1 italic truncate">{tag.message}</div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="ghost p-1 text-text-muted hover:text-text-primary"
                  title="Push tag"
                  onClick={() => handlePush(tag.name)}
                >
                  <Upload size={12} />
                </button>
                {confirmDelete === tag.name ? (
                  <div className="flex items-center gap-1">
                    <button
                      className="h-5 px-1.5 bg-[#ff453a] hover:bg-[#ff3b30] text-white text-3xs font-semibold rounded-mac transition-all disabled:opacity-40"
                      onClick={() => handleDelete(tag.name)}
                    >
                      Confirm
                    </button>
                    <button
                      className="h-5 px-1.5 text-3xs text-text-secondary hover:text-text-primary"
                      onClick={() => setConfirmDelete(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="ghost p-1 text-text-muted hover:text-[#ff453a]"
                    title="Delete tag"
                    onClick={() => setConfirmDelete(tag.name)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
