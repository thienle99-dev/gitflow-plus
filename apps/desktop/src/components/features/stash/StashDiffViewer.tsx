import { StashEntry } from "@/api/tauri";
import { useRepoStore } from "@/stores/repo";
import { useStashDiff } from "@/queries/useStashDiff";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { showToast } from "@/lib/toast";
import { parseDiffFiles, countDiffChanges } from "@/lib/parse-diff";

interface StashDiffViewerProps {
  stash: StashEntry;
}

type DiffMode = "unified" | "sideBySide" | "inline";

export default function StashDiffViewer({ stash }: StashDiffViewerProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();
  const { data: diffOutput, isLoading } = useStashDiff(repoPath, stash.index);
  const [mode, setMode] = useState<DiffMode>("unified");
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: "apply" | "pop" | "drop") => {
    if (!repoPath) return;
    setLoading(action);
    try {
      if (action === "apply") {
        await api.stash.apply(repoPath, stash.index);
        showToast("Stash applied");
      } else if (action === "pop") {
        await api.stash.pop(repoPath, stash.index);
        showToast("Stash popped");
      } else if (action === "drop") {
        await api.stash.drop(repoPath, stash.index);
        showToast("Stash dropped");
      }
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "stash"] });
    } catch (e) {
      showToast(`Error: ${e}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const files = diffOutput ? parseDiffFiles(diffOutput) : [];
  const changes = countDiffChanges(files);

  return (
    <div className="h-full flex flex-col">
      {/* Metadata */}
      <div className="p-3 border-b border-border/40 space-y-2">
        <h3 className="text-sm font-semibold text-text-primary">
          {stash.message}
        </h3>
        <div className="text-xs text-text-muted space-y-1">
          <div>Branch: {stash.branch}</div>
          <div>Files: {changes.files} changed (+{changes.added} -{changes.removed})</div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1 p-2 border-b border-border/40">
        {(["unified", "sideBySide", "inline"] as DiffMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2 py-1 text-xs rounded ${
              mode === m
                ? "bg-accent text-white"
                : "bg-surface-2 text-text-primary hover:bg-surface-2/80"
            }`}
          >
            {m === "sideBySide" ? "Side-by-Side" : m === "inline" ? "Inline" : "Unified"}
          </button>
        ))}
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto p-3 bg-surface-1">
        {isLoading ? (
          <div className="text-xs text-text-muted">Loading diff...</div>
        ) : files.length === 0 ? (
          <div className="text-xs text-text-muted">No changes</div>
        ) : mode === "unified" ? (
          <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-words">
            {files.map((file) => `\n=== ${file.path} ===\n` + file.hunks.flatMap(h => h.lines).map((l) => {
              if (l.type === "add") return `+ ${l.content}`;
              if (l.type === "delete") return `- ${l.content}`;
              if (l.type === "header") return l.content;
              return `  ${l.content}`;
            }).join("\n")).join("\n")}
          </pre>
        ) : mode === "sideBySide" ? (
          <div className="grid grid-cols-2 gap-2">
            {files.map((file) => (
              <div key={file.path} className="col-span-2">
                <div className="text-xs font-semibold text-text-muted mb-1">=== {file.path} ===</div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="border border-border/40 rounded text-xs font-mono">
                    <div className="bg-red-500/10 px-2 py-0.5 text-red-400 text-[10px] font-semibold">Before</div>
                    {file.hunks.flatMap(h => h.lines).filter(l => l.type === "delete" || l.type === "context").map((l, i) => (
                      <div key={i} className={`px-2 py-0.5 ${l.type === "delete" ? "bg-red-500/10 text-red-300" : "text-text-primary"}`}>
                        {l.content}
                      </div>
                    ))}
                  </div>
                  <div className="border border-border/40 rounded text-xs font-mono">
                    <div className="bg-green-500/10 px-2 py-0.5 text-green-400 text-[10px] font-semibold">After</div>
                    {file.hunks.flatMap(h => h.lines).filter(l => l.type === "add" || l.type === "context").map((l, i) => (
                      <div key={i} className={`px-2 py-0.5 ${l.type === "add" ? "bg-green-500/10 text-green-300" : "text-text-primary"}`}>
                        {l.content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <details key={file.path} className="border border-border/40 rounded">
                <summary className="px-2 py-1 text-xs cursor-pointer hover:bg-surface-2">
                  <span className="font-medium">{file.path}</span>
                  <span className="ml-2 text-text-muted">
                    (+{file.hunks.flatMap(h => h.lines).filter(l => l.type === "add").length}
                    -{file.hunks.flatMap(h => h.lines).filter(l => l.type === "delete").length})
                  </span>
                </summary>
                <div className="px-2 py-1 font-mono text-xs">
                  {file.hunks.flatMap(h => h.lines).filter(l => l.type !== "header").map((l, i) => (
                    <div key={i} className={`${
                      l.type === "add" ? "bg-green-500/10 text-green-300" :
                      l.type === "delete" ? "bg-red-500/10 text-red-300" :
                      "text-text-primary"
                    }`}>
                      {l.type === "add" ? "+" : l.type === "delete" ? "-" : " "} {l.content}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-t border-border/40">
        <button
          onClick={() => handleAction("apply")}
          disabled={loading === "apply"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "apply" ? "Applying..." : "Apply"}
        </button>
        <button
          onClick={() => handleAction("pop")}
          disabled={loading === "pop"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "pop" ? "Popping..." : "Pop"}
        </button>
        <button
          onClick={() => handleAction("drop")}
          disabled={loading === "drop"}
          className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50"
        >
          {loading === "drop" ? "Dropping..." : "Drop"}
        </button>
      </div>

    </div>
  );
}