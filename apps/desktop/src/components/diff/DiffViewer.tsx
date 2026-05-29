import { useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { xml } from "@codemirror/lang-xml";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { parseDiff, type DiffHunk } from "@/lib/parse-diff";

const LANG_MAP: Record<string, ReturnType<typeof javascript>> = {
  js: javascript(),
  jsx: javascript({ jsx: true }),
  ts: javascript({ typescript: true }),
  tsx: javascript({ typescript: true, jsx: true }),
  py: python(),
  rs: rust(),
  json: json(),
  jsonc: json(),
  md: markdown(),
  css: css(),
  html: html(),
  htm: html(),
  xml: xml(),
  java: java(),
  kt: java(),
  c: cpp(),
  cpp: cpp(),
  h: cpp(),
  hpp: cpp(),
};

function getLang(ext: string) {
  return LANG_MAP[ext] || javascript();
}

interface DiffViewerProps {
  diff: string;
  filePath: string;
  source?: "working" | "staged" | "commit";
  onPatchApplied?: () => void;
}

export default function DiffViewer({
  diff,
  filePath,
  source = "commit",
  onPatchApplied,
}: DiffViewerProps) {
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const repoPath = useRepoStore((s) => s.repoPath);
  const appTheme = useRepoStore((s) => s.theme);
  const [applying, setApplying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const unifiedRef = useRef<HTMLDivElement>(null);
  const leftView = useRef<EditorView | null>(null);
  const rightView = useRef<EditorView | null>(null);
  const unifiedView = useRef<EditorView | null>(null);

  const ext = useMemo(() => filePath.split(".").pop() || "", [filePath]);
  const lang = useMemo(() => getLang(ext), [ext]);
  const theme = useMemo(
    () => appTheme === "dark" ? [oneDark] : [],
    [appTheme],
  );

  // Determine old/new content from diff
  const hunks = useMemo(() => parseDiff(diff), [diff]);
  const oldContent = useMemo(() => buildSideContent(hunks, "old"), [hunks]);
  const newContent = useMemo(() => buildSideContent(hunks, "new"), [hunks]);
  const unifiedContent = useMemo(() => buildUnifiedContent(hunks), [hunks]);
  const deletedCount = useMemo(
    () => hunks.reduce((s, h) => s + h.lines.filter(l => l.type === "delete").length, 0),
    [hunks],
  );
  const addedCount = useMemo(
    () => hunks.reduce((s, h) => s + h.lines.filter(l => l.type === "add").length, 0),
    [hunks],
  );
  const patchPrefix = useMemo(() => getPatchPrefix(diff), [diff]);
  const canPatch = source === "working" || source === "staged";

  const applyHunk = async (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => {
    if (!repoPath) return;
    if (action === "discard" && !confirm("Discard this hunk from the working tree?")) return;

    setApplying(index);
    setError(null);
    try {
      await api.diff.applyHunk(repoPath, buildHunkPatch(patchPrefix, hunk), action);
      onPatchApplied?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setApplying(null);
    }
  };

  // Destroy editors on unmount
  useEffect(() => {
    return () => {
      leftView.current?.destroy();
      rightView.current?.destroy();
      unifiedView.current?.destroy();
    };
  }, []);

  // Mount split view editors
  useEffect(() => {
    if (diffViewMode !== "split") return;

    leftView.current?.destroy();
    rightView.current?.destroy();
    leftView.current = null;
    rightView.current = null;

    if (!leftRef.current || !rightRef.current) return;

    leftView.current = createEditor(
      leftRef.current,
      oldContent,
      lang,
      theme,
    );
    rightView.current = createEditor(
      rightRef.current,
      newContent,
      lang,
      theme,
    );

    return () => {
      leftView.current?.destroy();
      rightView.current?.destroy();
      leftView.current = null;
      rightView.current = null;
    };
  }, [diffViewMode, oldContent, newContent, lang, theme]);

  // Mount unified view editor
  useEffect(() => {
    if (diffViewMode !== "unified") return;

    unifiedView.current?.destroy();
    unifiedView.current = null;

    if (!unifiedRef.current) return;

    unifiedView.current = createEditor(
      unifiedRef.current,
      unifiedContent,
      lang,
      theme,
    );

    return () => {
      unifiedView.current?.destroy();
      unifiedView.current = null;
    };
  }, [diffViewMode, unifiedContent, lang, theme]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-0">
      <div className="border-b border-border px-3 py-1 text-2xs text-text-muted flex items-center gap-3">
        <span>{filePath}</span>
        <span className="text-[#ff375f]">-{deletedCount}</span>
        <span className="text-[#30d158]">+{addedCount}</span>
        {source !== "commit" && (
          <span className="ml-auto capitalize">{source} diff</span>
        )}
      </div>
      {canPatch && hunks.length > 0 && (
        <div className="border-b border-border bg-surface-1 max-h-[120px] overflow-y-auto">
          {hunks.map((hunk, index) => {
            const add = hunk.lines.filter((line) => line.type === "add").length;
            const del = hunk.lines.filter((line) => line.type === "delete").length;
            return (
              <div
                key={`${hunk.header}:${index}`}
                className="min-h-7 px-3 py-1 flex items-center gap-2 border-b border-border/60 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-2xs text-text-muted">
                  {hunk.header}
                </span>
                <span className="text-2xs text-[#ff375f]">-{del}</span>
                <span className="text-2xs text-[#30d158]">+{add}</span>
                {source === "working" ? (
                  <>
                    <button
                      className="ghost text-2xs px-2"
                      onClick={() => applyHunk(hunk, index, "stage")}
                      disabled={applying !== null}
                    >
                      {applying === index ? "Applying..." : "Stage hunk"}
                    </button>
                    <button
                      className="ghost text-2xs px-2 hover:text-[#ff375f]"
                      onClick={() => applyHunk(hunk, index, "discard")}
                      disabled={applying !== null}
                    >
                      Discard
                    </button>
                  </>
                ) : (
                  <button
                    className="ghost text-2xs px-2"
                    onClick={() => applyHunk(hunk, index, "unstage")}
                    disabled={applying !== null}
                  >
                    {applying === index ? "Applying..." : "Unstage hunk"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <div className="border-b border-border px-3 py-1 text-2xs text-[#ff375f] bg-surface-1">
          {error}
        </div>
      )}
      {diffViewMode === "split" ? (
        <div className="flex-1 flex overflow-hidden">
          <div ref={leftRef} className="flex-1 overflow-auto border-r border-border" />
          <div ref={rightRef} className="flex-1 overflow-auto" />
        </div>
      ) : (
        <div ref={unifiedRef} className="flex-1 overflow-auto" />
      )}
    </div>
  );
}

function createEditor(
  parent: HTMLDivElement,
  content: string,
  lang: ReturnType<typeof javascript>,
  theme: any[],
): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      lang,
      ...theme,
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      keymap.of([]),
    ],
  });
  return new EditorView({ state, parent });
}

function buildSideContent(hunks: DiffHunk[], side: "old" | "new"): string {
  const lines: string[] = [];
  for (const hunk of hunks) {
    lines.push(hunk.header);
    for (const line of hunk.lines) {
      if (line.type === "header") continue;
      if (side === "old" && line.type === "add") continue;
      if (side === "new" && line.type === "delete") continue;
      const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";
      lines.push(prefix + line.content.slice(1));
    }
  }
  return lines.join("\n");
}

function buildUnifiedContent(hunks: DiffHunk[]): string {
  return hunks.map((h) => h.lines.map((l) => l.content).join("\n")).join("\n");
}

function getPatchPrefix(diff: string) {
  const lines = diff.split("\n");
  const firstHunkIndex = lines.findIndex((line) => line.startsWith("@@"));
  if (firstHunkIndex <= 0) return "";
  return lines.slice(0, firstHunkIndex).join("\n");
}

function buildHunkPatch(prefix: string, hunk: DiffHunk) {
  const hunkLines = hunk.lines.map((line) => line.content).join("\n");
  return `${prefix}\n${hunkLines}\n`;
}
