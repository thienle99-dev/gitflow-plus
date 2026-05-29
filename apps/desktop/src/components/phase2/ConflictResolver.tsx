import { useState, useEffect, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { Check, X, Combine, ArrowLeft } from "lucide-react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { useQueryClient } from "@tanstack/react-query";

interface ConflictResolverProps {
  filePath: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface ConflictHunk {
  ours: string;
  theirs: string;
  resolved: string | null;
}

export default function ConflictResolver({ filePath, onComplete, onCancel }: ConflictResolverProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();
  const [oursContent, setOursContent] = useState("");
  const [theirsContent, setTheirsContent] = useState("");
  const [resultContent, setResultContent] = useState("");
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const oursRef = useRef<HTMLDivElement>(null);
  const theirsRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch conflicted file content (ours / theirs from stage 2/3)
  useEffect(() => {
    if (!repoPath) return;
    (async () => {
      try {
        // Get the merge conflict diff for context — ours/theirs from commit diff
        const rawDiff = await api.diff.file(repoPath, filePath);
        // Parse conflict markers to separate ours and theirs
        const lines = rawDiff.split("\n");
        const ours: string[] = [];
        const theirs: string[] = [];
        let inOurs = false;
        let inTheirs = false;

        for (const line of lines) {
          if (line.startsWith("<<<<<<<")) {
            inOurs = true;
            continue;
          }
          if (line.startsWith("=======")) {
            inOurs = false;
            inTheirs = true;
            continue;
          }
          if (line.startsWith(">>>>>>>")) {
            inTheirs = false;
            continue;
          }
          if (inOurs) ours.push(line);
          if (inTheirs) theirs.push(line);
        }

        setOursContent(ours.join("\n"));
        setTheirsContent(theirs.join("\n"));
        setResultContent(ours.join("\n"));
      } catch (e: any) {
        showToast(`Error loading conflict: ${e}`);
      }
    })();
  }, [repoPath, filePath]);

  // Initialize CodeMirror editors
  useEffect(() => {
    if (!oursRef.current || !theirsRef.current || !resultRef.current) return;

    const readOnlyExtensions = [basicSetup, oneDark, javascript(), EditorView.editable.of(false)];

    const oursView = new EditorView({
      state: EditorState.create({ doc: oursContent, extensions: readOnlyExtensions }),
      parent: oursRef.current,
    });

    const theirsView = new EditorView({
      state: EditorState.create({ doc: theirsContent, extensions: readOnlyExtensions }),
      parent: theirsRef.current,
    });

    const resultView = new EditorView({
      state: EditorState.create({
        doc: resultContent,
        extensions: [basicSetup, oneDark, javascript()],
      }),
      parent: resultRef.current,
    });

    return () => {
      oursView.destroy();
      theirsView.destroy();
      resultView.destroy();
    };
  }, [oursContent, theirsContent, resultContent]);

  const acceptOurs = () => setResultContent(oursContent);
  const acceptTheirs = () => setResultContent(theirsContent);
  const acceptBoth = () => setResultContent(`${oursContent}\n\n${theirsContent}`);

  const handleComplete = async () => {
    if (!repoPath) return;
    setResolving(true);
    try {
      // Write resolved content back using the merge continue
      // Stage the resolved file
      const tmpPath = `${filePath}.resolved`;
      await api.commit.stage(repoPath, filePath);
      await api.merge.continue(repoPath);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      showToast("Merge conflict resolved");
      onComplete();
    } catch (e: any) {
      showToast(`Error completing merge: ${e}`);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-1">
        <button onClick={onCancel} className="ghost p-1" title="Back">
          <ArrowLeft size={14} />
        </button>
        <span className="text-xs font-medium text-text-primary truncate flex-1">
          Resolve Conflict: {filePath}
        </span>
      </div>

      {/* 3-panel content */}
      <div className="flex-1 grid grid-rows-[1fr_1fr_1fr] gap-0 overflow-hidden">
        {/* OURS panel */}
        <div className="flex flex-col border-b border-border overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1 bg-surface-2">
            <span className="text-2xs font-medium text-[#30d158]">OURS (current)</span>
            <div className="flex-1" />
            <button
              className="ghost text-2xs px-2 py-0.5 rounded hover:bg-accent/10 flex items-center gap-1"
              onClick={acceptOurs}
            >
              <Check size={10} /> Accept
            </button>
          </div>
          <div ref={oursRef} className="flex-1 overflow-auto" />
        </div>

        {/* THEIRS panel */}
        <div className="flex flex-col border-b border-border overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1 bg-surface-2">
            <span className="text-2xs font-medium text-[#ff9f0a]">THEIRS (incoming)</span>
            <div className="flex-1" />
            <button
              className="ghost text-2xs px-2 py-0.5 rounded hover:bg-accent/10 flex items-center gap-1"
              onClick={acceptTheirs}
            >
              <Check size={10} /> Accept
            </button>
          </div>
          <div ref={theirsRef} className="flex-1 overflow-auto" />
        </div>

        {/* RESULT panel */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1 bg-surface-2">
            <span className="text-2xs font-medium text-text-primary">RESULT (editable)</span>
            <div className="flex-1" />
            <button
              className="ghost text-2xs px-2 py-0.5 rounded hover:bg-accent/10 flex items-center gap-1"
              onClick={acceptBoth}
            >
              <Combine size={10} /> Accept Both
            </button>
          </div>
          <div ref={resultRef} className="flex-1 overflow-auto" />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-surface-1">
        <button
          onClick={handleComplete}
          disabled={resolving}
          className="px-3 py-1 bg-accent text-accent-fg text-xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {resolving ? "Completing..." : "Complete Merge"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs text-text-muted hover:text-text-primary border border-border rounded-mac transition-colors"
        >
          Cancel
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
