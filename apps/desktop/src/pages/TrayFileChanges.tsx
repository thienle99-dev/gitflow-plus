import { useMemo, useState, useEffect } from "react";
import { File, CheckSquare, Square, Check, Loader2, Search, List, FolderTree, Trash2, ExternalLink, Copy, MoreHorizontal, X } from "lucide-react";
import type { FileChange } from "@/api/tauri";
import { api } from "@/api/tauri";
import { showToast } from "@/lib/toast";

export interface TrayFileChangesProps {
  repoPath: string;
  staged: FileChange[];
  unstaged: FileChange[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onDiscard: (path: string) => void;
  onOpenInEditor: (path: string) => void;
  isLoading: boolean;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FileChange;
}

function buildTree(files: FileChange[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const fullPath = parts.slice(0, i + 1).join("/");
      const isDir = i < parts.length - 1;
      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = { name, fullPath, isDir, children: [] };
        current.push(existing);
      }
      if (isDir) current = existing.children;
      else existing.file = file;
    }
  }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}

function FileActions({ file, onDiscard, onOpenInEditor }: {
  file: FileChange; onDiscard: (p: string) => void; onOpenInEditor: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-0.5 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors">
        <MoreHorizontal size={9} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-0.5 z-50 bg-surface-1 border border-border-40 rounded shadow-lg py-0.5 min-w-[120px]">
            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(file.path); showToast("Path copied"); setOpen(false); }} className="w-full flex items-center gap-1.5 px-2 py-1 text-[9px] text-text-primary hover:bg-surface-2 transition-colors">
              <Copy size={8} /> Copy path
            </button>
            <button onClick={(e) => { e.stopPropagation(); onOpenInEditor(file.path); setOpen(false); }} className="w-full flex items-center gap-1.5 px-2 py-1 text-[9px] text-text-primary hover:bg-surface-2 transition-colors">
              <ExternalLink size={8} /> Open in editor
            </button>
            {!file.staged && (
              <button onClick={(e) => { e.stopPropagation(); onDiscard(file.path); setOpen(false); }} className="w-full flex items-center gap-1.5 px-2 py-1 text-[9px] text-[#ff453a] hover:bg-surface-2 transition-colors">
                <Trash2 size={8} /> Discard changes
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function InlineDiff({ filePath, repoPath, onClose }: { filePath: string; repoPath: string; onClose: () => void }) {
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.diff.file(repoPath, filePath);
        if (!cancelled) setDiff(result);
      } catch {
        if (!cancelled) setDiff("Failed to load diff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [repoPath, filePath]);

  return (
    <div className="flex flex-col border border-accent-30 bg-surface-0 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border-40 bg-surface-1 shrink-0">
        <span className="text-[9px] font-semibold text-text-primary truncate">{filePath}</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors">
          <X size={9} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[180px]">
        {loading ? (
          <div className="flex items-center justify-center py-3 text-text-muted gap-1">
            <Loader2 size={9} className="animate-spin text-accent" />
            <span className="text-[8px]">Loading diff...</span>
          </div>
        ) : (
          <pre className="text-[8px] font-mono text-text-primary px-2 py-1.5 whitespace-pre-wrap break-all leading-relaxed">
            {diff || "No changes"}
          </pre>
        )}
      </div>
    </div>
  );
}

function TreeItem({ node, depth, expanded, toggleExpand, onToggle, onDiscard, onOpenInEditor, onSelectFile, selectedFile, repoPath }: {
  node: TreeNode; depth: number; expanded: Set<string>; toggleExpand: (p: string) => void;
  onToggle: (f: FileChange) => void; onDiscard: (p: string) => void; onOpenInEditor: (p: string) => void;
  onSelectFile: (path: string) => void; selectedFile: string | null; repoPath: string;
}) {
  const isExpanded = expanded.has(node.fullPath);
  if (node.isDir) {
    return (
      <>
        <button onClick={() => toggleExpand(node.fullPath)} className="w-full flex items-center gap-1 py-0.5 px-1 hover:bg-surface-2 transition-colors rounded" style={{ paddingLeft: `${depth * 12 + 4}px` }}>
          <span className="text-[8px] text-text-muted w-2.5 text-center">{isExpanded ? "▾" : "▸"}</span>
          <span className="text-[9px] font-semibold text-text-secondary truncate">{node.name}</span>
          <span className="text-[7px] text-text-muted ml-auto">{node.children.length}</span>
        </button>
        {isExpanded && node.children.map((child) => (
          <TreeItem key={child.fullPath} node={child} depth={depth + 1} expanded={expanded} toggleExpand={toggleExpand} onToggle={onToggle} onDiscard={onDiscard} onOpenInEditor={onOpenInEditor} onSelectFile={onSelectFile} selectedFile={selectedFile} repoPath={repoPath} />
        ))}
      </>
    );
  }
  const file = node.file!;
  const isSelected = selectedFile === file.path;
  return (
    <>
      <div className={`flex items-center justify-between py-0.5 px-1 hover:bg-surface-2 transition-colors rounded group ${isSelected ? "bg-accent-5" : ""}`} style={{ paddingLeft: `${depth * 12 + 4}px` }}>
        <button onClick={() => onSelectFile(file.path)} className="flex items-center gap-1 min-w-0 flex-1 text-left">
          {file.staged ? <CheckSquare size={9} className="text-accent shrink-0" /> : <Square size={9} className="text-text-muted shrink-0" />}
          <File size={8} className="text-text-secondary shrink-0" />
          <span className="text-[9px] text-text-primary truncate">{node.name}</span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          <span className={`text-[7px] font-bold uppercase px-0.5 rounded ${
            file.status === "added" || file.status === "untracked" ? "text-[#30d158]"
            : file.status === "deleted" ? "text-[#ff453a]"
            : "text-[#ff9f0a]"
          }`}>{file.status.slice(0, 1).toUpperCase()}</span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <FileActions file={file} onDiscard={onDiscard} onOpenInEditor={onOpenInEditor} />
          </div>
        </div>
      </div>
      {isSelected && <div className="px-1 pb-1"><InlineDiff filePath={file.path} repoPath={repoPath} onClose={() => onSelectFile("")} /></div>}
    </>
  );
}

export function TrayFileChanges({
  repoPath, staged, unstaged, searchQuery, setSearchQuery,
  onStage, onUnstage, onStageAll, onUnstageAll, onDiscard, onOpenInEditor, isLoading,
}: TrayFileChangesProps) {
  const [viewMode, setViewMode] = useState<"flat" | "tree">("flat");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const allChanges = useMemo(() => [...staged, ...unstaged], [staged, unstaged]);
  const filteredChanges = useMemo(() => {
    if (!searchQuery.trim()) return allChanges;
    const q = searchQuery.toLowerCase();
    return allChanges.filter((f) => f.path.toLowerCase().includes(q));
  }, [allChanges, searchQuery]);

  const tree = useMemo(() => buildTree(filteredChanges), [filteredChanges]);

  const toggleExpand = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => {
    const dirs = new Set<string>();
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.isDir) { dirs.add(n.fullPath); walk(n.children); }
      }
    };
    walk(tree);
    setExpandedDirs(dirs);
  };

  return (
    <div className="flex flex-col border border-border-40 bg-surface-1 rounded-md overflow-hidden flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border-40 shrink-0">
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Files ({allChanges.length})</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setViewMode("flat")} className={`h-5 px-1 rounded text-[8px] flex items-center gap-0.5 transition-all ${viewMode === "flat" ? "bg-surface-3 text-text-primary" : "text-text-muted hover:bg-surface-2"}`} title="Flat list">
            <List size={8} />
          </button>
          <button onClick={() => { setViewMode("tree"); expandAll(); }} className={`h-5 px-1 rounded text-[8px] flex items-center gap-0.5 transition-all ${viewMode === "tree" ? "bg-surface-3 text-text-primary" : "text-text-muted hover:bg-surface-2"}`} title="Tree view">
            <FolderTree size={8} />
          </button>
          <span className="w-px h-3 bg-border-40 mx-0.5" />
          {unstaged.length > 0 && (
            <button onClick={onStageAll} className="h-5 px-1 text-[8px] font-semibold rounded text-accent hover:bg-surface-2 transition-all flex items-center gap-0.5">
              <CheckSquare size={8} /> Stage
            </button>
          )}
          {staged.length > 0 && (
            <button onClick={onUnstageAll} className="h-5 px-1 text-[8px] font-semibold rounded text-text-secondary hover:bg-surface-2 transition-all flex items-center gap-0.5">
              <Square size={8} /> Unstage
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-1 px-2 py-0.5 border-b border-border-40">
        <Search size={9} className="text-text-muted shrink-0" />
        <input type="text" placeholder="Filter..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent text-[9px] text-text-primary outline-none placeholder-text-muted" />
      </div>

      {/* File list */}
      <div className="overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-text-muted gap-1">
            <Loader2 size={10} className="animate-spin text-accent" />
            <span className="text-[9px]">Loading...</span>
          </div>
        ) : filteredChanges.length > 0 ? (
          viewMode === "flat" ? (
            filteredChanges.map((file) => (
              <div key={`${file.staged ? "S" : "U"}:${file.path}`}>
                <div className={`flex items-center justify-between py-0.5 px-2 hover:bg-surface-2 transition-colors border-b border-border-20 last:border-b-0 group ${selectedFile === file.path ? "bg-accent-5" : ""}`}>
                  <button onClick={() => setSelectedFile(selectedFile === file.path ? null : file.path)} className="flex items-center gap-1 min-w-0 flex-1 text-left">
                    {file.staged ? <CheckSquare size={9} className="text-accent shrink-0" /> : <Square size={9} className="text-text-muted shrink-0" />}
                    <File size={8} className="text-text-secondary shrink-0" />
                    <span className="text-[9px] text-text-primary truncate">{file.path}</span>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                    <span className={`text-[7px] font-bold uppercase px-0.5 rounded ${
                      file.status === "added" || file.status === "untracked" ? "text-[#30d158]"
                      : file.status === "deleted" ? "text-[#ff453a]"
                      : "text-[#ff9f0a]"
                    }`}>{file.status.slice(0, 1).toUpperCase()}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <FileActions file={file} onDiscard={onDiscard} onOpenInEditor={onOpenInEditor} />
                    </div>
                  </div>
                </div>
                {selectedFile === file.path && (
                  <div className="px-2 pb-1">
                    <InlineDiff filePath={file.path} repoPath={repoPath} onClose={() => setSelectedFile(null)} />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-0.5">
              {tree.map((node) => (
                <TreeItem key={node.fullPath} node={node} depth={0} expanded={expandedDirs} toggleExpand={toggleExpand}
                  onToggle={(f) => f.staged ? onUnstage(f.path) : onStage(f.path)} onDiscard={onDiscard} onOpenInEditor={onOpenInEditor}
                  onSelectFile={(p) => setSelectedFile(selectedFile === p ? null : p)} selectedFile={selectedFile} repoPath={repoPath} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-text-muted gap-1">
            <Check size={12} className="text-[#30d158]" />
            <span className="text-[9px] font-medium">{searchQuery ? "No matches" : "Clean"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
