import { useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { keymap, Decoration, type DecorationSet } from "@codemirror/view";
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

  // Synchronized scrolling for Split View
  useEffect(() => {
    if (diffViewMode !== "split" || !leftRef.current || !rightRef.current) return;

    const leftEl = leftRef.current;
    const rightEl = rightRef.current;

    let activeScroll: "left" | "right" | null = null;
    let timeoutId: any = null;

    const handleLeftScroll = () => {
      if (activeScroll === "right") return;
      activeScroll = "left";
      
      rightEl.scrollTop = leftEl.scrollTop;
      rightEl.scrollLeft = leftEl.scrollLeft;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { activeScroll = null; }, 50);
    };

    const handleRightScroll = () => {
      if (activeScroll === "left") return;
      activeScroll = "right";
      
      leftEl.scrollTop = rightEl.scrollTop;
      leftEl.scrollLeft = rightEl.scrollLeft;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { activeScroll = null; }, 50);
    };

    leftEl.addEventListener("scroll", handleLeftScroll, { passive: true });
    rightEl.addEventListener("scroll", handleRightScroll, { passive: true });

    return () => {
      leftEl.removeEventListener("scroll", handleLeftScroll);
      rightEl.removeEventListener("scroll", handleRightScroll);
      clearTimeout(timeoutId);
    };
  }, [diffViewMode, oldContent, newContent]);

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

function computeMismatch(oldStr: string, newStr: string) {
  // Skip first char (+ or -)
  const oldText = oldStr.slice(1);
  const newText = newStr.slice(1);
  
  let prefixLen = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
    prefixLen++;
  }
  
  let suffixLen = 0;
  const maxSuffix = minLen - prefixLen;
  while (
    suffixLen < maxSuffix && 
    oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }
  
  // Return character offset (adding 1 back to account for the leading + or - character)
  return {
    prefixLen: prefixLen + 1,
    suffixLen: suffixLen,
  };
}

const diffHighlightExtension = StateField.define<DecorationSet>({
  create(state) {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = state.doc;
    
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      const text = line.text;
      
      if (text.startsWith("+")) {
        // Line decoration
        builder.add(
          line.from,
          line.from,
          Decoration.line({ attributes: { class: "diff-line-added" } }),
        );
      } else if (text.startsWith("-")) {
        // Line decoration
        builder.add(
          line.from,
          line.from,
          Decoration.line({ attributes: { class: "diff-line-deleted" } }),
        );
        
        // Check if next line is an added line to pair for inline highlights
        if (i < doc.lines) {
          const nextLine = doc.line(i + 1);
          if (nextLine.text.startsWith("+")) {
            const { prefixLen, suffixLen } = computeMismatch(text, nextLine.text);
            
            const fromOld = line.from + prefixLen;
            const toOld = line.to - suffixLen;
            if (toOld > fromOld) {
              builder.add(
                fromOld,
                toOld,
                Decoration.mark({ class: "diff-inline-deleted" }),
              );
            }
          }
        }
      } else if (text.startsWith("@@")) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({ attributes: { class: "diff-line-header" } }),
        );
      }
      
      // Check if previous line is a deleted line to pair for inline highlights
      if (text.startsWith("+") && i > 1) {
        const prevLine = doc.line(i - 1);
        if (prevLine.text.startsWith("-")) {
          const { prefixLen, suffixLen } = computeMismatch(prevLine.text, text);
          
          const fromNew = line.from + prefixLen;
          const toNew = line.to - suffixLen;
          if (toNew > fromNew) {
            builder.add(
              fromNew,
              toNew,
              Decoration.mark({ class: "diff-inline-added" }),
            );
          }
        }
      }
    }
    
    return builder.finish();
  },
  update(decorations, transaction) {
    return decorations.map(transaction.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

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
      diffHighlightExtension,
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
