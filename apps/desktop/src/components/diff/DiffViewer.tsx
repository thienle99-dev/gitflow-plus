import { useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { useAIDiffReview } from "@/queries/useAI";
import { Sparkles, RefreshCw } from "lucide-react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { keymap, Decoration, type DecorationSet, WidgetType, gutter, GutterMarker } from "@codemirror/view";
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

  const [showReview, setShowReview] = useState(false);
  const [reviewResult, setReviewResult] = useState<string>("");
  const aiReview = useAIDiffReview();

  useEffect(() => {
    setReviewResult("");
    setShowReview(false);
    aiReview.reset();
  }, [filePath, diff]);

  const handleToggleAiReview = async () => {
    if (showReview) {
      setShowReview(false);
      return;
    }
    
    setShowReview(true);
    if (reviewResult) return;

    try {
      setReviewResult(await aiReview.mutateAsync({ filePath, diff }));
    } catch {
      // Error is rendered from the mutation state.
    }
  };
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

    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    leftView.current = createEditor(
      leftRef.current,
      oldContent,
      lang,
      theme,
      hunks,
      source,
      applyHunk,
      "old",
      oldLines,
      newLines,
    );
    rightView.current = createEditor(
      rightRef.current,
      newContent,
      lang,
      theme,
      hunks,
      source,
      applyHunk,
      "new",
      oldLines,
      newLines,
    );

    return () => {
      leftView.current?.destroy();
      rightView.current?.destroy();
      leftView.current = null;
      rightView.current = null;
    };
  }, [diffViewMode, oldContent, newContent, lang, theme, hunks, source]);

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
      hunks,
      source,
      applyHunk,
    );

    return () => {
      unifiedView.current?.destroy();
      unifiedView.current = null;
    };
  }, [diffViewMode, unifiedContent, lang, theme, hunks, source]);

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
    <div className="flex-1 flex overflow-hidden bg-surface-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-3 py-1 text-2xs text-text-muted flex items-center gap-3 bg-surface-1/40 shrink-0">
          <span>{filePath}</span>
          <span className="text-[#ff375f]">-{deletedCount}</span>
          <span className="text-[#30d158]">+{addedCount}</span>
          {source !== "commit" && (
            <span className="capitalize">{source} diff</span>
          )}
          <button
            onClick={handleToggleAiReview}
            disabled={aiReview.isPending}
            className={`ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-2 transition-all text-accent hover:text-accent-hover ${
              aiReview.isPending ? "opacity-60 cursor-not-allowed" : ""
            }`}
            title="Analyze and explain code changes with AI"
          >
            {aiReview.isPending ? (
              <RefreshCw size={11} className="animate-spin text-accent" />
            ) : (
              <Sparkles size={11} />
            )}
            <span>AI Explain & Review</span>
          </button>
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

      {/* Right Drawer AI Review Panel */}
      {showReview && (
        <div className="w-[360px] border-l border-border flex flex-col bg-surface-1 overflow-hidden shrink-0 animate-in slide-in-from-right duration-200">
          <div className="h-9 px-3 border-b border-border flex items-center justify-between bg-surface-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <Sparkles size={13} className="text-accent" />
              <span>AI Code Review</span>
            </div>
            <button
              onClick={() => setShowReview(false)}
              className="text-2xs text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface-3 transition-colors"
            >
              Close
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
            {aiReview.isPending ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 text-text-muted py-10">
                <RefreshCw size={24} className="animate-spin text-accent" />
                <span className="text-xs">Analyzing and reviewing changes...</span>
              </div>
            ) : aiReview.error ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-mac space-y-2">
                <div className="text-xs font-semibold text-[#ff453a]">Review Failed</div>
                <div className="text-2xs text-text-secondary break-words whitespace-pre-wrap">
                  {aiReview.error instanceof Error ? aiReview.error.message : String(aiReview.error)}
                </div>
                <button
                  onClick={() => {
                    setReviewResult("");
                    aiReview.reset();
                    handleToggleAiReview();
                  }}
                  className="text-2xs text-accent underline block"
                >
                  Retry Analysis
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 text-text-primary">
                  {reviewResult.split("\n").map((line, idx) => {
                    const cleanLine = line.trim();
                    if (cleanLine.startsWith("# ")) {
                      return <h3 key={idx} className="text-sm font-bold text-text-primary pt-2 border-b border-border pb-1">{cleanLine.slice(2)}</h3>;
                    }
                    if (cleanLine.startsWith("## ")) {
                      return <h4 key={idx} className="text-xs font-bold text-accent pt-1">{cleanLine.slice(3)}</h4>;
                    }
                    if (cleanLine.startsWith("### ")) {
                      return <h5 key={idx} className="text-xs font-bold text-text-primary">{cleanLine.slice(4)}</h5>;
                    }
                    if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
                      return <li key={idx} className="ml-4 list-disc text-text-secondary">{cleanLine.slice(2)}</li>;
                    }
                    if (cleanLine.startsWith("1. ")) {
                      return <li key={idx} className="ml-4 list-decimal text-text-secondary">{cleanLine.slice(3)}</li>;
                    }
                    if (line.includes("**")) {
                      const parts = line.split("**");
                      return (
                        <p key={idx} className="text-text-secondary">
                          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-text-primary font-semibold">{part}</strong> : part)}
                        </p>
                      );
                    }
                    return line ? <p key={idx} className="text-text-secondary">{line}</p> : <div key={idx} className="h-2" />;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

class PrefixWidget extends WidgetType {
  constructor(readonly char: string) {
    super();
  }

  eq(other: PrefixWidget) {
    return this.char === other.char;
  }

  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.char === "~" ? "" : this.char;
    span.className = `diff-prefix-widget ${
      this.char === "+" ? "added" : this.char === "-" ? "deleted" : this.char === "~" ? "placeholder" : "empty"
    }`;
    return span;
  }

  ignoreEvent() {
    return true;
  }
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

class HunkActionsWidget extends WidgetType {
  constructor(
    readonly index: number,
    readonly hunk: DiffHunk,
    readonly source: "working" | "staged" | "commit",
    readonly onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void,
  ) {
    super();
  }

  eq(other: HunkActionsWidget) {
    return this.index === other.index && this.source === other.source;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "diff-hunk-actions-widget";
    
    if (this.source === "commit") return span;

    if (this.source === "working") {
      const stageBtn = document.createElement("button");
      stageBtn.textContent = "Stage";
      stageBtn.className = "hunk-action-btn stage";
      stageBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.index, "stage");
      };
      span.appendChild(stageBtn);

      const discardBtn = document.createElement("button");
      discardBtn.textContent = "Discard";
      discardBtn.className = "hunk-action-btn discard";
      discardBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.index, "discard");
      };
      span.appendChild(discardBtn);
    } else if (this.source === "staged") {
      const unstageBtn = document.createElement("button");
      unstageBtn.textContent = "Unstage";
      unstageBtn.className = "hunk-action-btn unstage";
      unstageBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.index, "unstage");
      };
      span.appendChild(unstageBtn);
    }

    return span;
  }

  ignoreEvent() {
    return false; // Enable handling clicks on widget buttons
  }
}

function getDiffHighlightExtension(
  hunks: DiffHunk[],
  source: "working" | "staged" | "commit",
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void,
  side?: "old" | "new",
  oldLines?: string[],
  newLines?: string[],
) {
  return StateField.define<DecorationSet>({
    create(state) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = state.doc;
      let hunkIndex = 0;
      
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
          
          // Hide leading '+' character
          builder.add(
            line.from,
            line.from + 1,
            Decoration.replace({ widget: new PrefixWidget("+") }),
          );

          // Inline highlight for side-by-side split view
          if (side === "new" && oldLines && newLines && i <= oldLines.length) {
            const oldText = oldLines[i - 1];
            if (oldText && oldText.startsWith("-")) {
              const { prefixLen, suffixLen } = computeMismatch(oldText, text);
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
        } else if (text.startsWith("-")) {
          // Line decoration
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { class: "diff-line-deleted" } }),
          );
          
          // Hide leading '-' character
          builder.add(
            line.from,
            line.from + 1,
            Decoration.replace({ widget: new PrefixWidget("-") }),
          );
          
          // Inline highlight for side-by-side split view
          if (side === "old" && oldLines && newLines && i <= newLines.length) {
            const newText = newLines[i - 1];
            if (newText && newText.startsWith("+")) {
              const { prefixLen, suffixLen } = computeMismatch(text, newText);
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
          } else if (!side && i < doc.lines) {
            // Check if next line is an added line to pair for inline highlights (Unified mode)
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
        } else if (text.startsWith("~")) {
          // Placeholder line decoration for Split View
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { class: "diff-line-placeholder" } }),
          );
          
          builder.add(
            line.from,
            line.from + 1,
            Decoration.replace({ widget: new PrefixWidget("~") }),
          );
        } else if (text.startsWith(" ")) {
          // Hide leading space for perfect code alignment
          builder.add(
            line.from,
            line.from + 1,
            Decoration.replace({ widget: new PrefixWidget(" ") }),
          );
        } else if (text.startsWith("@@")) {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { class: "diff-line-header" } }),
          );
          
          // Append hunk inline actions widget at the end of Hunk Header line
          const currentHunk = hunks[hunkIndex];
          if (currentHunk && source !== "commit") {
            builder.add(
              line.to,
              line.to,
              Decoration.widget({
                widget: new HunkActionsWidget(hunkIndex, currentHunk, source, onAction),
                side: 1,
              }),
            );
          }
          hunkIndex++;
        }
        
        // Check if previous line is a deleted line to pair for inline highlights (Unified mode)
        if (!side && text.startsWith("+") && i > 1) {
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
}

class DiffGutterMarker extends GutterMarker {
  constructor(
    readonly action: "stage" | "unstage" | "discard",
    readonly hunk: DiffHunk,
    readonly hunkIndex: number,
    readonly onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void
  ) {
    super();
  }

  toDOM() {
    const el = document.createElement("div");
    el.className = `diff-gutter-marker-action`;
    el.style.display = "inline-flex";
    el.style.gap = "2px";
    el.style.alignItems = "center";
    el.style.height = "100%";
    
    if (this.action === "stage") {
      const stageBtn = document.createElement("button");
      stageBtn.className = `gutter-action-btn stage`;
      stageBtn.title = "Stage this hunk";
      stageBtn.innerHTML = "🟢";
      stageBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.hunkIndex, "stage");
      };
      el.appendChild(stageBtn);

      const discardBtn = document.createElement("button");
      discardBtn.className = `gutter-action-btn discard`;
      discardBtn.title = "Discard this hunk";
      discardBtn.innerHTML = "🔴";
      discardBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.hunkIndex, "discard");
      };
      el.appendChild(discardBtn);
    } else {
      const unstageBtn = document.createElement("button");
      unstageBtn.className = `gutter-action-btn unstage`;
      unstageBtn.title = "Unstage this hunk";
      unstageBtn.innerHTML = "🔵";
      unstageBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.hunkIndex, "unstage");
      };
      el.appendChild(unstageBtn);
    }
    
    return el;
  }
}

function getDiffGutterExtension(
  hunks: DiffHunk[],
  source: "working" | "staged" | "commit",
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void,
) {
  if (source === "commit") return [];

  return gutter({
    class: "diff-gutter-actions",
    lineMarker(view, line) {
      const lineObj = view.state.doc.lineAt(line.from);
      const text = lineObj.text;
      if (!text.startsWith("+") && !text.startsWith("-")) return null;

      // Count @@ headers before this line to get the hunkIndex
      let hunkIndex = -1;
      let isFirstChanged = false;
      
      const doc = view.state.doc;
      for (let i = 1; i < lineObj.number; i++) {
        if (doc.line(i).text.startsWith("@@")) {
          hunkIndex++;
        }
      }
      
      // Check if this is the first changed line of the hunk (ignoring empty placeholder lines)
      let prevLineNum = lineObj.number - 1;
      while (prevLineNum >= 1) {
        const prevText = doc.line(prevLineNum).text;
        if (prevText.startsWith("@@")) {
          isFirstChanged = true;
          break;
        }
        if (!prevText.startsWith("~")) {
          break;
        }
        prevLineNum--;
      }
      
      const hunk = hunks[hunkIndex];
      if (isFirstChanged && hunk) {
        return new DiffGutterMarker(
          source === "working" ? "stage" : "unstage",
          hunk,
          hunkIndex,
          onAction
        );
      }
      
      return null;
    }
  });
}

function createEditor(
  parent: HTMLDivElement,
  content: string,
  lang: ReturnType<typeof javascript>,
  theme: any[],
  hunks: DiffHunk[],
  source: "working" | "staged" | "commit",
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void,
  side?: "old" | "new",
  oldLines?: string[],
  newLines?: string[],
): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      lang,
      ...theme,
      getDiffHighlightExtension(hunks, source, onAction, side, oldLines, newLines),
      getDiffGutterExtension(hunks, source, onAction),
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
    
    const hunkLines = hunk.lines.filter((line) => line.type !== "header");
    let i = 0;
    while (i < hunkLines.length) {
      // Collect consecutive deletes
      const deletes: string[] = [];
      while (i < hunkLines.length && hunkLines[i].type === "delete") {
        deletes.push(hunkLines[i].content);
        i++;
      }
      
      // Collect consecutive adds
      const adds: string[] = [];
      while (i < hunkLines.length && hunkLines[i].type === "add") {
        adds.push(hunkLines[i].content);
        i++;
      }
      
      if (deletes.length > 0 || adds.length > 0) {
        const maxLen = Math.max(deletes.length, adds.length);
        for (let j = 0; j < maxLen; j++) {
          if (side === "old") {
            if (j < deletes.length) {
              lines.push("-" + deletes[j].slice(1));
            } else {
              lines.push("~");
            }
          } else {
            if (j < adds.length) {
              lines.push("+" + adds[j].slice(1));
            } else {
              lines.push("~");
            }
          }
        }
      } else {
        // Unchanged line
        const line = hunkLines[i];
        const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";
        lines.push(prefix + line.content.slice(1));
        i++;
      }
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
