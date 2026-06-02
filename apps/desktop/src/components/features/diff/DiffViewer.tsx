import { useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { useAIDiffReview } from "@/queries/useAI";
import { Sparkles, RefreshCw } from "lucide-react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { keymap, Decoration, type DecorationSet, WidgetType } from "@codemirror/view";
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
import { parseDiff, type DiffHunk, type DiffLine } from "@/lib/parse-diff";

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
  const oldContent = useMemo(
    () => diffViewMode === "split" ? buildSideContent(hunks, "old") : "",
    [diffViewMode, hunks],
  );
  const newContent = useMemo(
    () => diffViewMode === "split" ? buildSideContent(hunks, "new") : "",
    [diffViewMode, hunks],
  );
  const unifiedContent = useMemo(
    () => diffViewMode === "unified" ? buildUnifiedContent(hunks) : "",
    [diffViewMode, hunks],
  );
  const { deletedCount, addedCount } = useMemo(
    () => hunks.reduce(
      (counts, hunk) => {
        for (const line of hunk.lines) {
          if (line.type === "delete") counts.deletedCount++;
          if (line.type === "add") counts.addedCount++;
        }
        return counts;
      },
      { deletedCount: 0, addedCount: 0 },
    ),
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

  // Apply a single line change (accept or reject a single added/deleted line)
  const applyLine = async (
    hunk: DiffHunk,
    lineIndex: number,
    action: "stage" | "unstage" | "discard",
  ) => {
    if (!repoPath) return;
    if (action === "discard" && !confirm("Discard this line from the working tree?")) return;

    setApplying(lineIndex);
    setError(null);
    try {
      const line = hunk.lines[lineIndex];
      const patch = buildSingleLinePatch(patchPrefix, hunk, line);
      await api.diff.applyHunk(repoPath, patch, action);
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
      applyLine,
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
      applyLine,
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
      applyLine,
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
                  className="min-h-7 px-3 py-1 flex items-center gap-2 border-b border-border-60 last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-2xs text-text-muted">
                    {hunk.header}
                  </span>
                  <span className="text-2xs text-[#ff375f]">-{del}</span>
                  <span className="text-2xs text-[#30d158]">+{add}</span>
                  {source === "working" ? (
                    <>
                      <button
                        className="ghost text-2xs px-2 text-[#30d158] hover:bg-[#30d158]/10"
                        onClick={() => applyHunk(hunk, index, "stage")}
                        disabled={applying !== null}
                        title="Accept all changes in this hunk (stage)"
                      >
                        {applying === index ? "Applying..." : "✓ Accept Hunk"}
                      </button>
                      <button
                        className="ghost text-2xs px-2 text-[#ff375f] hover:bg-[#ff375f]/10"
                        onClick={() => applyHunk(hunk, index, "discard")}
                        disabled={applying !== null}
                        title="Reject and discard all changes in this hunk"
                      >
                        {applying === index ? "Applying..." : "✗ Reject Hunk"}
                      </button>
                    </>
                  ) : (
                    <button
                      className="ghost text-2xs px-2 hover:text-[#ff9f0a]"
                      onClick={() => applyHunk(hunk, index, "unstage")}
                      disabled={applying !== null}
                      title="Unstage this hunk"
                    >
                      {applying === index ? "Applying..." : "↩ Unstage Hunk"}
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

/**
 * Compute word-level diff between two diff lines (with +/- prefix).
 * Returns multiple character ranges for changed words in each line.
 * Ranges are offsets from the start of the line string (including prefix).
 */
function computeWordDiffRanges(
  oldLine: string,
  newLine: string,
): { oldRanges: Array<{ from: number; to: number }>; newRanges: Array<{ from: number; to: number }> } {
  const oldText = oldLine.slice(1); // strip +/- prefix
  const newText = newLine.slice(1);

  // For very long lines, fall back to simple character-level mismatch
  if (oldText.length > 800 || newText.length > 800) {
    const m = computeMismatchFallback(oldText, newText);
    return {
      oldRanges: m.suffixLen < oldText.length ? [{ from: m.prefixLen, to: oldText.length + 1 - m.suffixLen }] : [],
      newRanges: m.suffixLen < newText.length ? [{ from: m.prefixLen, to: newText.length + 1 - m.suffixLen }] : [],
    };
  }

  // Tokenize into word and whitespace tokens
  const tokenize = (text: string): Array<{ word: string; start: number; len: number }> => {
    const tokens: Array<{ word: string; start: number; len: number }> = [];
    const re = /\S+|\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      tokens.push({ word: m[0], start: m.index, len: m[0].length });
    }
    return tokens;
  };

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  const oldLen = oldTokens.length;
  const newLen = newTokens.length;

  // LCS on word tokens
  const dp: number[][] = Array.from({ length: oldLen + 1 }, () => new Array(newLen + 1).fill(0));
  for (let i = 1; i <= oldLen; i++) {
    for (let j = 1; j <= newLen; j++) {
      dp[i][j] =
        oldTokens[i - 1].word === newTokens[j - 1].word
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to find changed token indices
  const oldChanged = new Set<number>();
  const newChanged = new Set<number>();
  let i = oldLen;
  let j = newLen;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1].word === newTokens[j - 1].word) {
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newChanged.add(j - 1);
      j--;
    } else {
      oldChanged.add(i - 1);
      i--;
    }
  }

  // Convert changed token indices to merged character ranges (offset by +1 for prefix)
  const toRanges = (
    changed: Set<number>,
    tokens: Array<{ start: number; len: number }>,
  ): Array<{ from: number; to: number }> => {
    const sorted = Array.from(changed).sort((a, b) => a - b);
    if (sorted.length === 0) return [];
    const ranges: Array<{ from: number; to: number }> = [];
    let from = tokens[sorted[0]].start + 1; // +1 for +/- prefix
    let to = from + tokens[sorted[0]].len;
    for (let k = 1; k < sorted.length; k++) {
      const tFrom = tokens[sorted[k]].start + 1;
      const tTo = tFrom + tokens[sorted[k]].len;
      if (tFrom <= to) {
        to = tTo; // merge adjacent
      } else {
        ranges.push({ from, to });
        from = tFrom;
        to = tTo;
      }
    }
    ranges.push({ from, to });
    return ranges;
  };

  return {
    oldRanges: toRanges(oldChanged, oldTokens),
    newRanges: toRanges(newChanged, newTokens),
  };
}

/** Simple character-level prefix/suffix mismatch for fallback on long lines. */
function computeMismatchFallback(oldText: string, newText: string) {
  let prefixLen = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
    prefixLen++;
  }
  let suffixLen = 0;
  const maxSuffix = minLen - prefixLen;
  while (suffixLen < maxSuffix && oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]) {
    suffixLen++;
  }
  return { prefixLen: prefixLen + 1, suffixLen };
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
      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "✓ Accept";
      acceptBtn.className = "hunk-action-btn accept";
      acceptBtn.title = "Stage this hunk";
      acceptBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.index, "stage");
      };
      span.appendChild(acceptBtn);

      const rejectBtn = document.createElement("button");
      rejectBtn.textContent = "✗ Reject";
      rejectBtn.className = "hunk-action-btn reject";
      rejectBtn.title = "Discard this hunk";
      rejectBtn.onclick = (e) => {
        e.stopPropagation();
        this.onAction(this.hunk, this.index, "discard");
      };
      span.appendChild(rejectBtn);
    } else if (this.source === "staged") {
      const unstageBtn = document.createElement("button");
      unstageBtn.textContent = "↩ Unstage";
      unstageBtn.className = "hunk-action-btn unstage";
      unstageBtn.title = "Unstage this hunk";
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

/**
 * Widget that appears on individual changed lines, allowing per-line accept/reject/discard.
 */
class LineActionsWidget extends WidgetType {
  constructor(
    readonly hunk: DiffHunk,
    readonly lineIndex: number,
    readonly source: "working" | "staged" | "commit",
    readonly onLineAction: (
      hunk: DiffHunk,
      lineIndex: number,
      action: "stage" | "unstage" | "discard",
    ) => void,
  ) {
    super();
  }

  eq(other: LineActionsWidget) {
    return this.lineIndex === other.lineIndex && this.source === other.source;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "diff-line-actions-widget";

    if (this.source === "commit") return span;

    if (this.source === "working") {
      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "✓";
      acceptBtn.className = "line-action-btn accept";
      acceptBtn.title = "Accept this line (stage)";
      acceptBtn.onclick = (e) => {
        e.stopPropagation();
        this.onLineAction(this.hunk, this.lineIndex, "stage");
      };
      span.appendChild(acceptBtn);

      const rejectBtn = document.createElement("button");
      rejectBtn.textContent = "✗";
      rejectBtn.className = "line-action-btn reject";
      rejectBtn.title = "Reject this line (discard)";
      rejectBtn.onclick = (e) => {
        e.stopPropagation();
        this.onLineAction(this.hunk, this.lineIndex, "discard");
      };
      span.appendChild(rejectBtn);
    } else if (this.source === "staged") {
      const unstageBtn = document.createElement("button");
      unstageBtn.textContent = "↩";
      unstageBtn.className = "line-action-btn unstage";
      unstageBtn.title = "Unstage this line";
      unstageBtn.onclick = (e) => {
        e.stopPropagation();
        this.onLineAction(this.hunk, this.lineIndex, "unstage");
      };
      span.appendChild(unstageBtn);
    }

    return span;
  }

  ignoreEvent() {
    return false;
  }
}

function getDiffHighlightExtension(
  hunks: DiffHunk[],
  source: "working" | "staged" | "commit",
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void,
  onLineAction: (hunk: DiffHunk, lineIndex: number, action: "stage" | "unstage" | "discard") => void,
  side?: "old" | "new",
  oldLines?: string[],
  newLines?: string[],
) {
  return StateField.define<DecorationSet>({
    create(state) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = state.doc;
      let hunkIndex = 0;
      // Track which hunk each document line belongs to (for per-line actions)
      const lineToHunk: { hunk: DiffHunk; lineIndexInHunk: number }[] = [];
      let currentHunkForLines: DiffHunk | null = null;
      let hunkLineCounter = 0;
      
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const text = line.text;
        
        // Track hunk association for changed lines
        if (text.startsWith("@@")) {
          currentHunkForLines = hunks[hunkIndex] || null;
          hunkLineCounter = 0;
        } else if (currentHunkForLines) {
          // Map doc line -> hunk line index (skip header lines in hunk.lines)
          const hunkLines = currentHunkForLines.lines.filter((l) => l.type !== "header");
          if (hunkLineCounter < hunkLines.length) {
            lineToHunk[i] = { hunk: currentHunkForLines, lineIndexInHunk: hunkLineCounter };
          }
          hunkLineCounter++;
        }
        
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

          // Per-line action widget (accept/reject) for working/staged diffs
          if (source !== "commit" && lineToHunk[i]) {
            builder.add(
              line.to,
              line.to,
              Decoration.widget({
                widget: new LineActionsWidget(
                  lineToHunk[i].hunk,
                  lineToHunk[i].lineIndexInHunk,
                  source,
                  onLineAction,
                ),
                side: 1,
              }),
            );
          }

          // Inline word-level highlight for side-by-side split view
          if (side === "new" && oldLines && newLines && i <= oldLines.length) {
            const oldText = oldLines[i - 1];
            if (oldText && oldText.startsWith("-")) {
              const { newRanges } = computeWordDiffRanges(oldText, text);
              for (const range of newRanges) {
                builder.add(line.from + range.from, line.from + range.to, Decoration.mark({ class: "diff-inline-added" }));
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

          // Per-line action widget (accept/reject) for working/staged diffs
          if (source !== "commit" && lineToHunk[i]) {
            builder.add(
              line.to,
              line.to,
              Decoration.widget({
                widget: new LineActionsWidget(
                  lineToHunk[i].hunk,
                  lineToHunk[i].lineIndexInHunk,
                  source,
                  onLineAction,
                ),
                side: 1,
              }),
            );
          }
          
          // Inline word-level highlight for side-by-side split view
          if (side === "old" && oldLines && newLines && i <= newLines.length) {
            const newText = newLines[i - 1];
            if (newText && newText.startsWith("+")) {
              const { oldRanges } = computeWordDiffRanges(text, newText);
              for (const range of oldRanges) {
                builder.add(line.from + range.from, line.from + range.to, Decoration.mark({ class: "diff-inline-deleted" }));
              }
            }
          } else if (!side && i < doc.lines) {
            // Check if next line is an added line to pair for word-level inline highlights (Unified mode)
            const nextLine = doc.line(i + 1);
            if (nextLine.text.startsWith("+")) {
              const { oldRanges } = computeWordDiffRanges(text, nextLine.text);
              for (const range of oldRanges) {
                builder.add(line.from + range.from, line.from + range.to, Decoration.mark({ class: "diff-inline-deleted" }));
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
        
        // Check if previous line is a deleted line to pair for word-level inline highlights (Unified mode)
        if (!side && text.startsWith("+") && i > 1) {
          const prevLine = doc.line(i - 1);
          if (prevLine.text.startsWith("-")) {
            const { newRanges } = computeWordDiffRanges(prevLine.text, text);
            for (const range of newRanges) {
              builder.add(line.from + range.from, line.from + range.to, Decoration.mark({ class: "diff-inline-added" }));
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

function createEditor(
  parent: HTMLDivElement,
  content: string,
  lang: ReturnType<typeof javascript>,
  theme: any[],
  hunks: DiffHunk[],
  source: "working" | "staged" | "commit",
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void,
  onLineAction: (hunk: DiffHunk, lineIndex: number, action: "stage" | "unstage" | "discard") => void,
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
      getDiffHighlightExtension(hunks, source, onAction, onLineAction, side, oldLines, newLines),
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

/**
 * Build a single-line patch for applying/reverting one changed line.
 * Constructs a minimal hunk with the target line and its surrounding context.
 */
function buildSingleLinePatch(prefix: string, hunk: DiffHunk, targetLine: DiffLine): string {
  // Build a minimal hunk around the target line with 1 line of context
  const nonHeaderLines = hunk.lines.filter((l) => l.type !== "header");
  const targetIdx = nonHeaderLines.indexOf(targetLine);
  if (targetIdx === -1) return buildHunkPatch(prefix, hunk);

  // Find context window: 1 line before and after
  const start = Math.max(0, targetIdx - 1);
  const end = Math.min(nonHeaderLines.length - 1, targetIdx + 1);

  const selectedLines = nonHeaderLines.slice(start, end + 1);

  // Compute old/new ranges for the mini hunk
  let oldStart = 0, oldCount = 0, newStart = 0, newCount = 0;
  for (const l of selectedLines) {
    if (l.type === "context" || l.type === "delete") {
      if (oldStart === 0 && l.oldLineNumber !== null) oldStart = l.oldLineNumber;
      oldCount++;
    }
    if (l.type === "context" || l.type === "add") {
      if (newStart === 0 && l.newLineNumber !== null) newStart = l.newLineNumber;
      newCount++;
    }
  }

  if (oldStart === 0) oldStart = hunk.oldStart;
  if (newStart === 0) newStart = hunk.newStart;

  const miniHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`;
  const lines = selectedLines.map((l) => l.content).join("\n");
  return `${prefix}\n${miniHeader}\n${lines}\n`;
}
