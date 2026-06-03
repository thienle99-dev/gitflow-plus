import { useEffect, useMemo, useRef } from "react";
import type { EditorView } from "codemirror";
import type { DiffHunk } from "@/lib/parse-diff";
import type { InlineReviewComment } from "@/lib/ai";
import type { Theme } from "@/stores/repo";
import { getLang, buildSideContent, createEditor } from "./diff-utils";
import { getCodeMirrorTheme } from "@/lib/codemirror-themes";

export interface DiffSplitViewProps {
  hunks: DiffHunk[];
  filePath: string;
  appTheme: Theme;
  source: "working" | "staged" | "commit";
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void;
  onLineAction: (hunk: DiffHunk, lineIndex: number, action: "stage" | "unstage" | "discard") => void;
  inlineComments?: InlineReviewComment[];
  showInlineComments?: boolean;
}

export default function DiffSplitView({
  hunks,
  filePath,
  appTheme,
  source,
  onAction,
  onLineAction,
  inlineComments,
  showInlineComments,
}: DiffSplitViewProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftView = useRef<EditorView | null>(null);
  const rightView = useRef<EditorView | null>(null);

  const ext = useMemo(() => filePath.split(".").pop() || "", [filePath]);
  const lang = useMemo(() => getLang(ext), [ext]);
  const theme = useMemo(() => getCodeMirrorTheme(appTheme), [appTheme]);

  const oldContent = useMemo(() => buildSideContent(hunks, "old"), [hunks]);
  const newContent = useMemo(() => buildSideContent(hunks, "new"), [hunks]);

  // Mount split view editors
  useEffect(() => {
    leftView.current?.destroy();
    rightView.current?.destroy();
    leftView.current = null;
    rightView.current = null;

    if (!leftRef.current || !rightRef.current) return;

    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");
    const activeInlineComments = showInlineComments ? inlineComments : undefined;

    leftView.current = createEditor(
      leftRef.current, oldContent, lang, theme, hunks, source,
      onAction, onLineAction, "old", oldLines, newLines, activeInlineComments,
    );
    rightView.current = createEditor(
      rightRef.current, newContent, lang, theme, hunks, source,
      onAction, onLineAction, "new", oldLines, newLines, activeInlineComments,
    );

    return () => {
      leftView.current?.destroy();
      rightView.current?.destroy();
      leftView.current = null;
      rightView.current = null;
    };
  }, [oldContent, newContent, lang, theme, hunks, source, showInlineComments, inlineComments, onAction, onLineAction]);

  // Destroy editors on unmount
  useEffect(() => {
    return () => {
      leftView.current?.destroy();
      rightView.current?.destroy();
    };
  }, []);

  // Synchronized scrolling
  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;

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
  }, [oldContent, newContent]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div ref={leftRef} className="flex-1 overflow-auto border-r border-border" />
      <div ref={rightRef} className="flex-1 overflow-auto" />
    </div>
  );
}
