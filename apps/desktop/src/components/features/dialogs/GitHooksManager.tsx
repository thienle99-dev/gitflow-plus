import { useState, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { api, type GitHook } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { X, RefreshCw, Check, XCircle, FileCode, Trash2, Save } from "lucide-react";
import Dialog from "@/components/ui/overlay/Dialog";

interface GitHooksManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function GitHooksManager({ open, onClose }: GitHooksManagerProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [hooks, setHooks] = useState<GitHook[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHook, setSelectedHook] = useState<GitHook | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadHooks = async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const result = await api.hooks.list(repoPath);
      setHooks(result);
    } catch (e: any) {
      showToast(`Failed to load hooks: ${e}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadHooks();
      setSelectedHook(null);
      setEditContent("");
    }
  }, [open, repoPath]);

  const handleSelectHook = (hook: GitHook) => {
    setSelectedHook(hook);
    setEditContent(hook.content || "");
  };

  const handleToggleHook = async (hook: GitHook) => {
    if (!repoPath) return;
    try {
      if (hook.executable) {
        await api.hooks.disable(repoPath, hook.name);
        showToast(`Disabled ${hook.name}`, "success");
      } else {
        await api.hooks.enable(repoPath, hook.name);
        showToast(`Enabled ${hook.name}`, "success");
      }
      await loadHooks();
    } catch (e: any) {
      showToast(`Failed to toggle hook: ${e}`, "error");
    }
  };

  const handleSaveHook = async () => {
    if (!repoPath || !selectedHook) return;
    setSaving(true);
    try {
      await api.hooks.save(repoPath, selectedHook.name, editContent);
      showToast(`Saved ${selectedHook.name}`, "success");
      await loadHooks();
    } catch (e: any) {
      showToast(`Failed to save hook: ${e}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHook = async (hook: GitHook) => {
    if (!repoPath) return;
    try {
      await api.hooks.delete(repoPath, hook.name);
      showToast(`Deleted ${hook.name}`, "success");
      if (selectedHook?.name === hook.name) {
        setSelectedHook(null);
        setEditContent("");
      }
      await loadHooks();
    } catch (e: any) {
      showToast(`Failed to delete hook: ${e}`, "error");
    }
  };

  const existingHooks = hooks.filter((h) => h.exists);
  const availableHooks = hooks.filter((h) => !h.exists);

  return (
    <Dialog open={open} onClose={onClose} title="Git Hooks Manager" maxWidth="lg">
      <div className="flex h-[500px]">
        <div className="w-64 border-r border-border-30 bg-surface-1-40 overflow-y-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-primary">Active Hooks</h3>
              <button
                onClick={loadHooks}
                disabled={loading}
                className="p-1 hover:bg-surface-2 rounded transition-colors"
                title="Refresh hooks"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {existingHooks.length === 0 ? (
              <p className="text-[10px] text-text-muted">No hooks installed</p>
            ) : (
              <div className="space-y-1">
                {existingHooks.map((hook) => (
                  <div
                    key={hook.name}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      selectedHook?.name === hook.name
                        ? "bg-accent-10 text-accent"
                        : "hover:bg-surface-2 text-text-secondary"
                    }`}
                    onClick={() => handleSelectHook(hook)}
                  >
                    <FileCode size={12} className="shrink-0" />
                    <span className="flex-1 truncate text-[11px]">{hook.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleHook(hook);
                        }}
                        className={`p-0.5 rounded ${hook.executable ? "text-[#30d158]" : "text-text-muted"}`}
                        title={hook.executable ? "Disable hook" : "Enable hook"}
                      >
                        {hook.executable ? <Check size={10} /> : <XCircle size={10} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHook(hook);
                        }}
                        className="p-0.5 rounded text-[#ff375f] hover:bg-[#ff375f]/10"
                        title="Delete hook"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {availableHooks.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-text-primary mt-4 mb-3">Available Hooks</h3>
                <div className="space-y-1">
                  {availableHooks.map((hook) => (
                    <div
                      key={hook.name}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-2 cursor-pointer text-text-muted transition-colors"
                      onClick={() => handleSelectHook(hook)}
                    >
                      <FileCode size={12} className="shrink-0" />
                      <span className="flex-1 truncate text-[11px]">{hook.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedHook ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-30 bg-surface-1-40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">{selectedHook.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    selectedHook.executable
                      ? "bg-[#30d158]/10 text-[#30d158]"
                      : "bg-surface-2 text-text-muted"
                  }`}>
                    {selectedHook.executable ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleHook(selectedHook)}
                    className="text-[10px] px-2 py-1 rounded hover:bg-surface-2 transition-colors"
                  >
                    {selectedHook.executable ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={handleSaveHook}
                    disabled={saving || editContent === (selectedHook.content || "")}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-accent text-white hover:bg-accent-90 disabled:opacity-50 transition-colors"
                  >
                    <Save size={10} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 p-4 font-mono text-[11px] text-text-secondary bg-surface-0 resize-none focus:outline-none"
                placeholder={`#!/bin/sh\n# ${selectedHook.name} hook\n\n# Add your hook script here`}
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
              Select a hook to view or edit
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}