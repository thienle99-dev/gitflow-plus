import { useState, useRef, useEffect } from "react";
import { api, type Branch } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";

interface CreateBranchDialogProps {
  repoPath: string;
  branches: Branch[];
  open: boolean;
  onClose: () => void;
  initialRef?: string;
}

export default function CreateBranchDialog({
  repoPath,
  branches,
  open,
  onClose,
  initialRef,
}: CreateBranchDialogProps) {
  const [name, setName] = useState("");
  const [baseRef, setBaseRef] = useState(initialRef || "HEAD");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName("");
      setBaseRef(initialRef || "HEAD");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialRef]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Branch name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.branches.create(repoPath, name.trim(), baseRef === "HEAD" ? undefined : baseRef);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
      onClose();
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "Failed to create branch");
    } finally {
      setLoading(false);
    }
  };

  const localBranches = branches.filter((b) => !b.remote && b.name !== name.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-surface-1 border border-border rounded-mac shadow-xl min-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">Create Branch</h3>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Branch name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="feature/..."
              className="w-full text-xs bg-surface-0 border border-border rounded-mac px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Based on</label>
            <select
              value={baseRef}
              onChange={(e) => setBaseRef(e.target.value)}
              className="w-full text-xs bg-surface-0 border border-border rounded-mac px-2.5 py-1.5 text-text-primary outline-none focus:border-accent"
            >
              <option value="HEAD">HEAD (current branch)</option>
              {localBranches.map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          {error && <div className="text-xs text-[#ff375f]">{error}</div>}
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button className="ghost text-xs px-3" onClick={onClose}>Cancel</button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="px-4 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {loading ? "Creating..." : "Create Branch"}
          </button>
        </div>
      </div>
    </div>
  );
}
