/**
 * Shared utilities for diff rendering: CodeMirror extensions, content builders,
 * language detection, and widget types.
 */
import { EditorView, basicSetup } from "codemirror";
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { keymap, Decoration, type DecorationSet, WidgetType } from "@codemirror/view";
import { getCodeMirrorTheme } from "@/lib/codemirror-themes";
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
import type { DiffHunk, DiffLine } from "@/lib/parse-diff";
import type { InlineReviewComment } from "@/lib/ai";

// ─── Language Detection ──────────────────────────────────────────────────────

export const LANG_MAP: Record<string, ReturnType<typeof javascript>> = {
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

export function getLang(ext: string) {
  return LANG_MAP[ext] || javascript();
}

// ─── Widget Types ────────────────────────────────────────────────────────────

export class PrefixWidget extends WidgetType {
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

export class HunkActionsWidget extends WidgetType {
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
    return false;
  }
}

export class LineActionsWidget extends WidgetType {
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

export class InlineCommentWidget extends WidgetType {
  constructor(
    readonly comments: InlineReviewComment[],
  ) {
    super();
  }

  eq(other: InlineCommentWidget) {
    return (
      this.comments.length === other.comments.length &&
      this.comments.every((c, i) =>
        c.line === other.comments[i].line &&
        c.side === other.comments[i].side &&
        c.category === other.comments[i].category &&
        c.message === other.comments[i].message,
      )
    );
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "inline-review-comment-container";

    for (const comment of this.comments) {
      const card = document.createElement("div");
      const severityClass =
        comment.severity === "error"
          ? "inline-review-comment-error"
          : comment.severity === "warning"
            ? "inline-review-comment-warning"
            : "inline-review-comment-info";
      card.className = `inline-review-comment-card ${severityClass}`;

      const header = document.createElement("div");
      header.className = "inline-review-comment-header";

      const badge = document.createElement("span");
      badge.className = "inline-review-comment-badge";
      badge.textContent = comment.category;
      header.appendChild(badge);

      const severityIcon = document.createElement("span");
      severityIcon.className = "inline-review-comment-severity";
      severityIcon.textContent =
        comment.severity === "error" ? "●" : comment.severity === "warning" ? "◐" : "○";
      header.appendChild(severityIcon);

      card.appendChild(header);

      const body = document.createElement("div");
      body.className = "inline-review-comment-body";
      body.textContent = comment.message;
      card.appendChild(body);

      container.appendChild(card);
    }

    return container;
  }

  ignoreEvent() {
    return false;
  }
}

// ─── Word-Level Diff ─────────────────────────────────────────────────────────

/**
 * Compute word-level diff between two diff lines (with +/- prefix).
 * Returns multiple character ranges for changed words in each line.
 * Ranges are offsets from the start of the line string (including prefix).
 */
export function computeWordDiffRanges(
  oldLine: string,
  newLine: string,
): { oldRanges: Array<{ from: number; to: number }>; newRanges: Array<{ from: number; to: number }> } {
  const oldText = oldLine.slice(1);
  const newText = newLine.slice(1);

  if (oldText.length > 800 || newText.length > 800) {
    const m = computeMismatchFallback(oldText, newText);
    return {
      oldRanges: m.suffixLen < oldText.length ? [{ from: m.prefixLen, to: oldText.length + 1 - m.suffixLen }] : [],
      newRanges: m.suffixLen < newText.length ? [{ from: m.prefixLen, to: newText.length + 1 - m.suffixLen }] : [],
    };
  }

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

  const dp: number[][] = Array.from({ length: oldLen + 1 }, () => new Array(newLen + 1).fill(0));
  for (let i = 1; i <= oldLen; i++) {
    for (let j = 1; j <= newLen; j++) {
      dp[i][j] =
        oldTokens[i - 1].word === newTokens[j - 1].word
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

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

  const toRanges = (
    changed: Set<number>,
    tokens: Array<{ start: number; len: number }>,
  ): Array<{ from: number; to: number }> => {
    const sorted = Array.from(changed).sort((a, b) => a - b);
    if (sorted.length === 0) return [];
    const ranges: Array<{ from: number; to: number }> = [];
    let from = tokens[sorted[0]].start + 1;
    let to = from + tokens[sorted[0]].len;
    for (let k = 1; k < sorted.length; k++) {
      const tFrom = tokens[sorted[k]].start + 1;
      const tTo = tFrom + tokens[sorted[k]].len;
      if (tFrom <= to) {
        to = tTo;
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
export function computeMismatchFallback(oldText: string, newText: string) {
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

// ─── CodeMirror Extension ────────────────────────────────────────────────────

export function getDiffHighlightExtension(
  hunks: DiffHunk[],
  source: "working" | "staged" | "commit",
  onAction: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void,
  onLineAction: (hunk: DiffHunk, lineIndex: number, action: "stage" | "unstage" | "discard") => void,
  side?: "old" | "new",
  oldLines?: string[],
  newLines?: string[],
  inlineComments?: InlineReviewComment[],
) {
  const commentMap = new Map<string, InlineReviewComment[]>();
  if (inlineComments && inlineComments.length > 0) {
    for (const comment of inlineComments) {
      const key = `${comment.side}:${comment.line}`;
      const existing = commentMap.get(key);
      if (existing) {
        existing.push(comment);
      } else {
        commentMap.set(key, [comment]);
      }
    }
  }

  return StateField.define<DecorationSet>({
    create(state) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = state.doc;
      let hunkIndex = 0;
      const lineToHunk: { hunk: DiffHunk; lineIndexInHunk: number }[] = [];
      let currentHunkForLines: DiffHunk | null = null;
      let hunkLineCounter = 0;
      let currentOldLine = 0;
      let currentNewLine = 0;
      
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const text = line.text;
        
        if (text.startsWith("@@")) {
          currentHunkForLines = hunks[hunkIndex] || null;
          hunkLineCounter = 0;
          const hunkMatch = text.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
          if (hunkMatch) {
            currentOldLine = parseInt(hunkMatch[1]);
            currentNewLine = parseInt(hunkMatch[3]);
          }
        } else if (currentHunkForLines) {
          const hunkLines = currentHunkForLines.lines.filter((l) => l.type !== "header");
          if (hunkLineCounter < hunkLines.length) {
            lineToHunk[i] = { hunk: currentHunkForLines, lineIndexInHunk: hunkLineCounter };
          }
          hunkLineCounter++;
        }
        
        if (text.startsWith("+")) {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { class: "diff-line-added" } }),
          );
          
          builder.add(
            line.from,
            line.from + 1,
            Decoration.replace({ widget: new PrefixWidget("+") }),
          );

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

          const newLineKey = `new:${currentNewLine}`;
          const newLineComments = commentMap.get(newLineKey);
          if (newLineComments && newLineComments.length > 0) {
            builder.add(
              line.to,
              line.to,
              Decoration.widget({
                widget: new InlineCommentWidget(newLineComments),
                side: 1,
                block: true,
              }),
            );
          }
          currentNewLine++;

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
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { class: "diff-line-deleted" } }),
          );
          
          builder.add(
            line.from,
            line.from + 1,
            Decoration.replace({ widget: new PrefixWidget("-") }),
          );

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

          const oldLineKey = `old:${currentOldLine}`;
          const oldLineComments = commentMap.get(oldLineKey);
          if (oldLineComments && oldLineComments.length > 0) {
            builder.add(
              line.to,
              line.to,
              Decoration.widget({
                widget: new InlineCommentWidget(oldLineComments),
                side: 1,
                block: true,
              }),
            );
          }
          currentOldLine++;
          
          if (side === "old" && oldLines && newLines && i <= newLines.length) {
            const newText = newLines[i - 1];
            if (newText && newText.startsWith("+")) {
              const { oldRanges } = computeWordDiffRanges(text, newText);
              for (const range of oldRanges) {
                builder.add(line.from + range.from, line.from + range.to, Decoration.mark({ class: "diff-inline-deleted" }));
              }
            }
          } else if (!side && i < doc.lines) {
            const nextLine = doc.line(i + 1);
            if (nextLine.text.startsWith("+")) {
              const { oldRanges } = computeWordDiffRanges(text, nextLine.text);
              for (const range of oldRanges) {
                builder.add(line.from + range.from, line.from + range.to, Decoration.mark({ class: "diff-inline-deleted" }));
              }
            }
          }
        } else if (text.startsWith("~")) {
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
          builder.add(
            line.from,
            line.from + 1,
            Decoration.replace({ widget: new PrefixWidget(" ") }),
          );
          currentOldLine++;
          currentNewLine++;
        } else if (text.startsWith("@@")) {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { class: "diff-line-header" } }),
          );
          
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

// ─── Editor Factory ──────────────────────────────────────────────────────────

export function createEditor(
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
  inlineComments?: InlineReviewComment[],
): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      lang,
      ...theme,
      getDiffHighlightExtension(hunks, source, onAction, onLineAction, side, oldLines, newLines, inlineComments),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      keymap.of([]),
    ],
  });
  return new EditorView({ state, parent });
}

// ─── Content Builders ────────────────────────────────────────────────────────

export function buildSideContent(hunks: DiffHunk[], side: "old" | "new"): string {
  const lines: string[] = [];
  
  for (const hunk of hunks) {
    lines.push(hunk.header);
    
    const hunkLines = hunk.lines.filter((line) => line.type !== "header");
    let i = 0;
    while (i < hunkLines.length) {
      const deletes: string[] = [];
      while (i < hunkLines.length && hunkLines[i].type === "delete") {
        deletes.push(hunkLines[i].content);
        i++;
      }
      
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
        const line = hunkLines[i];
        const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";
        lines.push(prefix + line.content.slice(1));
        i++;
      }
    }
  }
  return lines.join("\n");
}

export function buildUnifiedContent(hunks: DiffHunk[]): string {
  return hunks.map((h) => h.lines.map((l) => l.content).join("\n")).join("\n");
}

export function getPatchPrefix(diff: string) {
  const lines = diff.split("\n");
  const firstHunkIndex = lines.findIndex((line) => line.startsWith("@@"));
  if (firstHunkIndex <= 0) return "";
  return lines.slice(0, firstHunkIndex).join("\n");
}

export function buildHunkPatch(prefix: string, hunk: DiffHunk) {
  const hunkLines = hunk.lines.map((line) => line.content).join("\n");
  return `${prefix}\n${hunkLines}\n`;
}

/**
 * Build a single-line patch for applying/reverting one changed line.
 * Constructs a minimal hunk with the target line and its surrounding context.
 */
export function buildSingleLinePatch(prefix: string, hunk: DiffHunk, targetLine: DiffLine): string {
  const nonHeaderLines = hunk.lines.filter((l) => l.type !== "header");
  const targetIdx = nonHeaderLines.indexOf(targetLine);
  if (targetIdx === -1) return buildHunkPatch(prefix, hunk);

  const start = Math.max(0, targetIdx - 1);
  const end = Math.min(nonHeaderLines.length - 1, targetIdx + 1);

  const selectedLines = nonHeaderLines.slice(start, end + 1);

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
