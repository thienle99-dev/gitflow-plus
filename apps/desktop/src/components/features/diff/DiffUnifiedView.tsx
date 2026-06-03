import { useEffect, useMemo, useRef } from "react";
import type { EditorView } from "codemirror";
import type { DiffHunk } from "@/lib/parse-diff";
import type { InlineReviewComment } from "@/lib/ai";
import type { Theme } from "@/stores/repo";
import { getLang, buildUnifiedContent, createEditor } from "./diff-utils";
import { getCodeMirrorTheme } from "@/lib/codemirror-themes";

export interface DiffUnifiedViewProps {
  hunks: DiffHunk[];
  filePath: string;
  appTheme: Theme;
  source: "working" | "staged" | "commit";
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void;
  onLineAction: (hunk: DiffHunk, lineIndex: number, action: "stage" | "unstage" | "discard") => void;
  inlineComments?: InlineReviewComment[];
  showInlineComments?: boolean;
}

export default function DiffUnifiedView({
  hunks,
  filePath,
  appTheme,
  source,
  onAction,
  onLineAction,
  inlineComments,
  showInlineComments,
}: DiffUnifiedViewProps) {
  const unifiedRef = useRef<HTMLDivElement>(null);
  const unifiedView = useRef<EditorView | null>(null);

  const ext = useMemo(() => filePath.split(".").pop() || "", [filePath]);
  const lang = useMemo(() => getLang(ext), [ext]);
  const theme = useMemo(() => getCodeMirrorTheme(appTheme), [appTheme]);

  const unifiedContent = useMemo(() => buildUnifiedContent(hunks), [hunks]);

  // Mount unified view editor
  useEffect(() => {
    unifiedView.current?.destroy();
    unifiedView.current = null;

    if (!unifiedRef.current) return;

    const activeInlineComments = showInlineComments ? inlineComments : undefined;

    unifiedView.current = createEditor(
      unifiedRef.current, unifiedContent, lang, theme, hunks, source,
      onAction, onLineAction, undefined, undefined, undefined, activeInlineComments,
    );

    return () => {
      unifiedView.current?.destroy();
      unifiedView.current = null;
    };
  }, [unifiedContent, lang, theme, hunks, source, showInlineComments, inlineComments, onAction, onLineAction]);

  // Destroy editor on unmount
  useEffect(() => {
    return () => {
      unifiedView.current?.destroy();
    };
  }, []);

  return (
    <div ref={unifiedRef} className="flex-1 overflow-auto" />
  );
}
