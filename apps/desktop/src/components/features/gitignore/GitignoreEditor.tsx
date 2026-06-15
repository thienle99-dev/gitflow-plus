import { useState, useEffect, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { api } from "@/api/tauri";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/lib/toast";
import { FileCode, Loader2, Save, ArrowLeft, Plus, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

const QUICK_TEMPLATES: Record<string, string> = {
  Node: `# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-store/
*.tsbuildinfo
dist/
build/
.env
.env.local
.env.*.local
`,
  Python: `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.venv/
*.egg-info/
.eggs/
dist/
build/
*.egg
.eggs/
.idea/
.vscode/
*.swp
*.swo
*~
.DS_Store
`,
  Rust: `# Rust
target/
**/*.rs.bk
Cargo.lock
.DS_Store
`,
  macOS: `# macOS
.DS_Store
.AppleDouble
.LSOverride
Icon
._*
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent
`,
  "VS Code": `# VS Code
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.code-workspace
`,
  Windows: `# Windows
Thumbs.db
ehthumbs.db
Desktop.ini
$RECYCLE.BIN/
*.cab
*.msi
*.msm
*.msp
`,
};

export default function GitignoreEditor() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<string | null>({
    queryKey: ["git", repoPath, "gitignore"],
    queryFn: () => api.diff.readTextFile(repoPath!, ".gitignore"),
    enabled: !!repoPath,
    staleTime: 0,
    gcTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => api.diff.writeContent(repoPath!, ".gitignore", content),
    onSuccess: () => {
      showToast(".gitignore saved", "success");
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "gitignore"] });
      setInitialContent(content);
    },
    onError: (err) => {
      showToast(`Save failed: ${err}`, "error");
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.diff.writeContent(repoPath!, ".gitignore", "# .gitignore\n"),
    onSuccess: () => {
      showToast(".gitignore created", "success");
      setContent("# .gitignore\n");
      setInitialContent("# .gitignore\n");
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "gitignore"] });
    },
    onError: (err) => {
      showToast(`Create failed: ${err}`, "error");
    },
  });

  useEffect(() => {
    if (data !== undefined) {
      setContent(data ?? "");
      setInitialContent(data);
    }
  }, [data]);

  const dirty = content !== (initialContent ?? "");

  const appendTemplate = useCallback((template: string) => {
    setContent((prev) => {
      const separator = prev.endsWith("\n") ? "" : "\n";
      return prev + separator + "\n" + template;
    });
  }, []);

  const fileExists = data !== null && data !== undefined || initialContent !== null;
  const showing = fileExists || content.length > 0;

  const countLines = content ? content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length : 0;
  const totalLines = content ? content.split("\n").length : 0;

  return (
    <div className="h-full flex flex-col bg-surface-0 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 bg-surface-1-40">
        <div className="flex items-center gap-2">
          <button
            onClick={closeDialog}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded"
            title="Back"
          >
            <ArrowLeft size={14} />
          </button>
          <FileCode size={14} className="text-accent" />
          <span className="text-sm font-semibold text-text-primary">.gitignore</span>
          {data !== null && data !== undefined && (
            <span className="text-2xs text-text-muted">
              {totalLines} lines · {countLines} rules
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-2xs text-[#ff9f0a] font-medium">Unsaved changes</span>}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            className="ghost text-2xs px-2.5 py-1 flex items-center gap-1 border border-border-40 rounded transition-colors disabled:opacity-40 bg-accent text-accent-fg hover:opacity-90 disabled:bg-surface-2 disabled:text-text-muted font-medium"
          >
            {saveMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-text-muted gap-2">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading .gitignore...</span>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
          <AlertCircle size={20} className="text-red-400" />
          <div className="text-xs text-red-400">Failed to load: {String(error)}</div>
          <button
            onClick={() => refetch()}
            className="ghost text-xs px-3 py-1.5 border border-border-40 rounded hover:bg-surface-2 text-text-primary"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty / not found state */}
      {!isLoading && !isError && !showing && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
          <FileCode size={24} className="text-text-muted-60" />
          <div>
            <div className="text-sm font-semibold text-text-primary mb-1">No .gitignore file</div>
            <div className="text-xs text-text-muted">Create one to exclude files from version control.</div>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="ghost text-xs px-4 py-1.5 flex items-center gap-1.5 bg-accent text-accent-fg rounded font-medium hover:opacity-90 disabled:opacity-40"
          >
            {createMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Create .gitignore
          </button>
        </div>
      )}

      {/* Editor */}
      {!isLoading && !isError && showing && (
        <>
          <div className="flex-1 min-h-0 p-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full bg-surface-0 text-text-primary font-mono text-xs p-3 resize-none outline-none border-none leading-relaxed placeholder:text-text-muted-60"
              placeholder="# Add your gitignore patterns here..."
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Templates footer */}
          <div className="border-t border-border shrink-0">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 px-3 py-1.5 text-2xs text-text-muted hover:text-text-primary w-full transition-colors"
            >
              {showTemplates ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Quick-add templates
            </button>
            {showTemplates && (
              <div className="flex flex-wrap gap-1 px-3 pb-2">
                {Object.entries(QUICK_TEMPLATES).map(([name, template]) => (
                  <button
                    key={name}
                    onClick={() => appendTemplate(template)}
                    className="ghost text-2xs px-2 py-0.5 border border-border-40 rounded hover:bg-surface-2 hover:text-text-primary text-text-secondary transition-colors"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
