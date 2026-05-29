import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useTagList, useTagCreate, useTagDelete, useTagPush } from "@/queries/useGitTag";
import { Tag, Plus, Trash2, Upload, GitCommit, User, Calendar } from "lucide-react";

export default function TagPanel({ onClose }: { onClose?: () => void }) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: tags, isLoading } = useTagList(repoPath);
  const tagCreate = useTagCreate(repoPath);
  const tagDelete = useTagDelete(repoPath);
  const tagPush = useTagPush(repoPath);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
      showToast(`Error: ${e}`);
    }
  };

  const handleDelete = async (tagName: string) => {
    try {
      await tagDelete.mutateAsync({ name: tagName });
      setConfirmDelete(null);
      showToast(`Tag "${tagName}" deleted`);
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handlePush = async (tagName: string) => {
    try {
      await tagPush.mutateAsync({ name: tagName });
      showToast(`Tag "${tagName}" pushed`);
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-1">
        <Tag size={14} className="text-text-muted" />
        <span className="text-xs font-medium text-text-primary flex-1">
          Tags ({tags?.length ?? 0})
        </span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="ghost p-1"
          title="New Tag"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Create tag form (collapsible) */}
      {showCreate && (
        <div className="px-3 py-2 border-b border-border space-y-1.5 bg-surface-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name *"
            className="w-full text-xs bg-surface-2 border border-border rounded-mac px-2 py-1 text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target commit hash (optional — defaults to HEAD)"
            className="w-full text-xs bg-surface-2 border border-border rounded-mac px-2 py-1 text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message (optional — creates annotated tag)"
            className="w-full text-xs bg-surface-2 border border-border rounded-mac px-2 py-1 text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || tagCreate.isPending}
              className="flex-1 px-2 py-1 bg-accent text-accent-fg text-2xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {tagCreate.isPending ? "Creating..." : "Create Tag"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-2 py-1 text-2xs text-text-muted hover:text-text-primary border border-border rounded-mac"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="text-xs text-text-muted text-center py-4">Loading tags...</div>
        )}
        {!isLoading && (!tags || tags.length === 0) && (
          <div className="text-xs text-text-muted text-center py-4">No tags</div>
        )}
        {tags?.map((tag) => (
          <div
            key={tag.name}
            className="px-3 py-1.5 border-b border-border hover:bg-surface-1 transition-colors"
          >
            <div className="flex items-start gap-2">
              <Tag size={14} className="mt-0.5 shrink-0 text-[#ff9f0a]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-text-primary truncate">
                    {tag.name}
                  </span>
                  {tag.annotated && (
                    <span className="text-2xs bg-accent/10 text-accent px-1 rounded">annotated</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <GitCommit size={9} className="text-text-muted shrink-0" />
                  <span className="text-2xs font-mono text-text-muted">
                    {tag.hash.slice(0, 7)}
                  </span>
                  {tag.author && (
                    <>
                      <User size={9} className="text-text-muted shrink-0" />
                      <span className="text-2xs text-text-muted">{tag.author}</span>
                    </>
                  )}
                  {tag.date && (
                    <>
                      <Calendar size={9} className="text-text-muted shrink-0" />
                      <span className="text-2xs text-text-muted">{formatDate(tag.date)}</span>
                    </>
                  )}
                </div>
                {tag.message && (
                  <div className="text-2xs text-text-muted mt-0.5 truncate">{tag.message}</div>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  className="ghost p-1 opacity-50 hover:opacity-100"
                  title="Push tag"
                  onClick={() => handlePush(tag.name)}
                >
                  <Upload size={12} />
                </button>
                {confirmDelete === tag.name ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      className="px-1.5 py-0.5 bg-[#ff375f] text-white text-2xs rounded-mac"
                      onClick={() => handleDelete(tag.name)}
                    >
                      Confirm
                    </button>
                    <button
                      className="px-1.5 py-0.5 text-2xs text-text-muted hover:text-text-primary"
                      onClick={() => setConfirmDelete(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="ghost p-1 opacity-50 hover:opacity-100 hover:text-[#ff375f]"
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
