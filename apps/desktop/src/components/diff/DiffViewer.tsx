import { useEffect, useRef } from "react";
import { useUIStore } from "@/stores/ui";
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
}

export default function DiffViewer({ diff, filePath }: DiffViewerProps) {
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const unifiedRef = useRef<HTMLDivElement>(null);
  const leftView = useRef<EditorView | null>(null);
  const rightView = useRef<EditorView | null>(null);
  const unifiedView = useRef<EditorView | null>(null);

  const ext = filePath.split(".").pop() || "";
  const lang = getLang(ext);
  const theme = document.documentElement.classList.contains("dark") ? [oneDark] : [];

  // Determine old/new content from diff
  const hunks = parseDiff(diff);
  const oldContent = buildSideContent(hunks, "old");
  const newContent = buildSideContent(hunks, "new");
  const unifiedContent = buildUnifiedContent(hunks);

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

    // Scroll sync
    const onScroll = () => {
      const left = leftView.current;
      const right = rightView.current;
      if (left && right) {
        left.dispatch({ effects: EditorView.scrollIntoView(0) });
      }
    };
    const el = leftRef.current;
    el?.addEventListener("scroll", onScroll);

    return () => {
      leftView.current?.destroy();
      rightView.current?.destroy();
    };
  }, [diffViewMode, diff, filePath]);

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
    };
  }, [diffViewMode, diff, filePath]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-0">
      <div className="border-b border-border px-3 py-1 text-2xs text-text-muted flex items-center gap-3">
        <span>{filePath}</span>
        <span className="text-[#ff375f]">-{hunks.reduce((s, h) => s + h.lines.filter(l => l.type === "delete").length, 0)}</span>
        <span className="text-[#30d158]">+{hunks.reduce((s, h) => s + h.lines.filter(l => l.type === "add").length, 0)}</span>
      </div>
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
