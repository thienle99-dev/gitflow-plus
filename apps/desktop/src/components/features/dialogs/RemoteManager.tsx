import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Trash2, Pencil, X, Check, RefreshCw } from "lucide-react";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import Dialog from "@/components/ui/overlay/Dialog";

interface RemoteManagerProps {
  open: boolean;
  onClose: () => void;
}

interface EditState {
  name: string;
  url: string;
}

interface RemoteForm {
  name: string;
  url: string;
}

type FormMode = "add" | "edit" | null;

export default function RemoteManager({ open, onClose }: RemoteManagerProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [form, setForm] = useState<RemoteForm>({ name: "", url: "" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: remotes = [], isLoading, refetch } = useQuery({
    queryKey: ["git", repoPath, "remotes"],
    queryFn: () => api.remote.listRemotes(repoPath!),
    enabled: !!repoPath && open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["git", repoPath, "remotes"] });
    queryClient.invalidateQueries({ queryKey: ["git", repoPath, "sync-status"] });
    queryClient.invalidateQueries({ queryKey: ["git", repoPath, "info"] });
  };

  const addMutation = useMutation({
    mutationFn: ({ name, url }: RemoteForm) => api.remote.addRemote(repoPath!, name, url),
    onSuccess: (msg) => {
      showToast(msg || "Remote added");
      invalidate();
      closeForm();
    },
    onError: (err: any) => {
      setError(String(err));
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ name, newName }: { name: string; newName: string }) =>
      api.remote.renameRemote(repoPath!, name, newName),
    onSuccess: (msg) => {
      showToast(msg || "Remote renamed");
      invalidate();
      closeForm();
    },
    onError: (err: any) => {
      setError(String(err));
    },
  });

  const setUrlMutation = useMutation({
    mutationFn: ({ name, url }: RemoteForm) => api.remote.setRemoteUrl(repoPath!, name, url),
    onSuccess: (msg) => {
      showToast(msg || "Remote URL updated");
      invalidate();
      closeForm();
    },
    onError: (err: any) => {
      setError(String(err));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (name: string) => api.remote.removeRemote(repoPath!, name),
    onSuccess: (msg) => {
      showToast(msg || "Remote removed");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      showToast(String(err), "error");
      setDeleteTarget(null);
    },
  });

  const closeForm = () => {
    setFormMode(null);
    setEditTarget(null);
    setForm({ name: "", url: "" });
    setError(null);
  };

  const openAdd = () => {
    setFormMode("add");
    setEditTarget(null);
    setForm({ name: "", url: "" });
    setError(null);
  };

  const openEdit = (remote: { name: string; url: string }) => {
    setFormMode("edit");
    setEditTarget(remote.name);
    setForm({ name: remote.name, url: remote.url });
    setError(null);
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    const url = form.url.trim();

    if (!name) {
      setError("Remote name cannot be empty");
      return;
    }
    if (!url) {
      setError("Remote URL cannot be empty");
      return;
    }

    setError(null);

    if (formMode === "add") {
      addMutation.mutate({ name, url });
    } else if (formMode === "edit" && editTarget) {
      if (name !== editTarget) {
        // Rename first, then update URL
        renameMutation.mutate(
          { name: editTarget, newName: name },
          {
            onSuccess: () => {
              if (url !== form.url) {
                setUrlMutation.mutate({ name, url });
              }
            },
          },
        );
      } else if (url !== form.url) {
        setUrlMutation.mutate({ name, url });
      } else {
        closeForm();
      }
    }
  };

  const isPending =
    addMutation.isPending || renameMutation.isPending || setUrlMutation.isPending || removeMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} title="Remote Manager" maxWidth="540px">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{remotes.length} remote{remotes.length !== 1 ? "s" : ""}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="ghost p-1.5 text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
            aria-label="Refresh remotes"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
          {!formMode && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1 h-7 px-2.5 bg-accent text-accent-fg text-2xs font-semibold rounded-mac hover:opacity-90 transition-opacity"
            >
              <Plus size={12} />
              Add Remote
            </button>
          )}
        </div>
      </div>

      {/* Inline form */}
      {formMode && (
        <div className="mb-3 p-3 bg-surface-1-30 border border-border-40 rounded-mac space-y-2.5">
          <div className="space-y-1.5">
            <label className="block text-2xs font-semibold text-text-secondary">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((p) => ({ ...p, name: e.target.value }));
                setError(null);
              }}
              placeholder="origin"
              className="w-full h-7 px-2 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
              autoFocus
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-2xs font-semibold text-text-secondary">URL</label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => {
                setForm((p) => ({ ...p, url: e.target.value }));
                setError(null);
              }}
              placeholder="https://github.com/user/repo.git"
              className="w-full h-7 px-2 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
              disabled={isPending}
            />
          </div>
          {error && (
            <div className="text-2xs text-[#ff453a] bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5 leading-relaxed break-words select-text">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              onClick={closeForm}
              disabled={isPending}
              className="h-7 px-3 text-2xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim() || !form.url.trim()}
              className="flex items-center gap-1 h-7 px-3 bg-accent text-accent-fg text-2xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {isPending ? (
                <span className="animate-pulse">Saving...</span>
              ) : formMode === "add" ? (
                "Add Remote"
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Remote list */}
      <div className="space-y-1 max-h-[320px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-text-muted text-xs animate-pulse">Loading remotes...</div>
        ) : remotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <GitBranch size={24} className="mb-2 opacity-30" />
            <span className="text-xs">No remotes configured</span>
            <span className="text-2xs mt-1 opacity-60">Add a remote to push/pull changes</span>
          </div>
        ) : (
          remotes.map((remote) => (
            <div
              key={remote.name}
              className="group flex items-center gap-2 px-2.5 py-2 rounded-mac hover:bg-surface-1-40 border border-transparent hover:border-border-40 transition-all"
            >
              <GitBranch size={14} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">{remote.name}</div>
                <div className="text-2xs text-text-muted truncate font-mono">{remote.url}</div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(remote)}
                  disabled={isPending || formMode !== null}
                  className="ghost p-1.5 text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
                  aria-label={`Edit ${remote.name}`}
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => setDeleteTarget(remote.name)}
                  disabled={isPending}
                  className="ghost p-1.5 text-text-muted hover:text-[#ff453a] transition-colors disabled:opacity-30"
                  aria-label={`Remove ${remote.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove Remote"
        message={`Are you sure you want to remove the remote "${deleteTarget}"?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) removeMutation.mutate(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Dialog>
  );
}
