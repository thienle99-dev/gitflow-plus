import { SubmoduleInfo } from "@/api/tauri";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { showToast } from "@/lib/toast";

interface SubmoduleDetailProps {
  submodule: SubmoduleInfo;
}

export default function SubmoduleDetail({ submodule }: SubmoduleDetailProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: "init" | "update" | "remove") => {
    if (!repoPath) return;
    setLoading(action);
    try {
      if (action === "init") {
        await api.submodules.init(repoPath, submodule.path);
        showToast("Submodule initialized");
      } else if (action === "update") {
        await api.submodules.update(repoPath, submodule.path);
        showToast("Submodule updated");
      } else if (action === "remove") {
        await api.submodules.remove(repoPath, submodule.path);
        showToast("Submodule removed");
      }
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "submodules"] });
    } catch (e) {
      showToast(`Error: ${e}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const statusLabel = {
    ok: "Initialized",
    not_initialized: "Not Initialized",
    modified: "Modified",
    conflict: "Conflict",
  }[submodule.status] || "Unknown";

  return (
    <div className="p-4 space-y-4 relative">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          {submodule.name}
        </h3>
        <p className="text-xs text-text-muted mt-1">{submodule.path}</p>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="text-text-muted">Commit:</span>
          <code className="ml-2 text-text-primary font-mono">
            {submodule.commit_hash.slice(0, 7)}
          </code>
        </div>
        <div>
          <span className="text-text-muted">Status:</span>
          <span className="ml-2 text-text-primary">{statusLabel}</span>
        </div>
        {submodule.desc && (
          <div>
            <span className="text-text-muted">Description:</span>
            <span className="ml-2 text-text-primary">{submodule.desc}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleAction("init")}
          disabled={loading === "init" || submodule.status !== "not_initialized"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "init" ? "Initializing..." : "Init"}
        </button>
        <button
          onClick={() => handleAction("update")}
          disabled={loading === "update" || submodule.status === "not_initialized"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "update" ? "Updating..." : "Update"}
        </button>
        <button
          onClick={() => handleAction("remove")}
          disabled={loading === "remove"}
          className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50"
        >
          {loading === "remove" ? "Removing..." : "Remove"}
        </button>
      </div>

    </div>
  );
}
