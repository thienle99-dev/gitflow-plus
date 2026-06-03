/**
 * Custom CodeMirror themes that match the app's Gruvbox and other variant themes.
 * Uses EditorView.theme() for editor chrome and HighlightStyle.define() for syntax.
 */
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Theme } from "@/stores/repo";

// ── Gruvbox Dark ──────────────────────────────────────────────────────────────

const gruvboxDarkEditor = EditorView.theme(
  {
    "&": { backgroundColor: "#282828", color: "#ebdbb2" },
    ".cm-content": { caretColor: "#ebdbb2" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ebdbb2" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "#504945" },
    ".cm-gutters": {
      backgroundColor: "#282828",
      color: "#665c54",
      border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "#3c3836" },
    ".cm-activeLine": { backgroundColor: "#3c383620" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#504945",
      color: "#a89984",
      border: "none",
    },
  },
  { dark: true },
);

const gruvboxDarkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#fb4934" },
  { tag: tags.operator, color: "#ebdbb2" },
  { tag: tags.special(tags.variableName), color: "#8ec07c" },
  { tag: tags.typeName, color: "#fabd2f" },
  { tag: tags.atom, color: "#d3869b" },
  { tag: tags.number, color: "#d3869b" },
  { tag: tags.bool, color: "#d3869b" },
  { tag: tags.definition(tags.variableName), color: "#ebdbb2" },
  { tag: tags.string, color: "#b8bb26" },
  { tag: tags.special(tags.string), color: "#fe8019" },
  { tag: tags.regexp, color: "#fe8019" },
  { tag: tags.comment, color: "#928374", fontStyle: "italic" },
  { tag: tags.variableName, color: "#ebdbb2" },
  { tag: tags.tagName, color: "#fb4934" },
  { tag: tags.bracket, color: "#fe8019" },
  { tag: tags.meta, color: "#fabd2f" },
  { tag: tags.attributeName, color: "#b8bb26" },
  { tag: tags.attributeValue, color: "#b8bb26" },
  { tag: tags.propertyName, color: "#83a598" },
  { tag: tags.className, color: "#fabd2f" },
  { tag: tags.labelName, color: "#8ec07c" },
  { tag: tags.namespace, color: "#8ec07c" },
  { tag: tags.macroName, color: "#8ec07c" },
  { tag: tags.literal, color: "#fe8019" },
  { tag: tags.separator, color: "#a89984" },
  { tag: tags.punctuation, color: "#fe8019" },
  { tag: tags.heading, color: "#b8bb26", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "#83a598", textDecoration: "underline" },
  { tag: tags.invalid, color: "#fb4934" },
]);

export const gruvboxDark = [
  gruvboxDarkEditor,
  syntaxHighlighting(gruvboxDarkHighlight),
];

// ── Gruvbox Light ─────────────────────────────────────────────────────────────

const gruvboxLightEditor = EditorView.theme(
  {
    "&": { backgroundColor: "#fbf1c7", color: "#3c3836" },
    ".cm-content": { caretColor: "#3c3836" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#3c3836" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "#d5c4a1" },
    ".cm-gutters": {
      backgroundColor: "#fbf1c7",
      color: "#bdae93",
      border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "#ebdbb2" },
    ".cm-activeLine": { backgroundColor: "#ebdbb260" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#d5c4a1",
      color: "#7c6f64",
      border: "none",
    },
  },
  { dark: false },
);

const gruvboxLightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#9d0006" },
  { tag: tags.operator, color: "#3c3836" },
  { tag: tags.special(tags.variableName), color: "#427b58" },
  { tag: tags.typeName, color: "#b57614" },
  { tag: tags.atom, color: "#8f3f71" },
  { tag: tags.number, color: "#8f3f71" },
  { tag: tags.bool, color: "#8f3f71" },
  { tag: tags.definition(tags.variableName), color: "#3c3836" },
  { tag: tags.string, color: "#79740e" },
  { tag: tags.special(tags.string), color: "#af3a03" },
  { tag: tags.regexp, color: "#af3a03" },
  { tag: tags.comment, color: "#928374", fontStyle: "italic" },
  { tag: tags.variableName, color: "#3c3836" },
  { tag: tags.tagName, color: "#9d0006" },
  { tag: tags.bracket, color: "#af3a03" },
  { tag: tags.meta, color: "#b57614" },
  { tag: tags.attributeName, color: "#79740e" },
  { tag: tags.attributeValue, color: "#79740e" },
  { tag: tags.propertyName, color: "#076678" },
  { tag: tags.className, color: "#b57614" },
  { tag: tags.labelName, color: "#427b58" },
  { tag: tags.namespace, color: "#427b58" },
  { tag: tags.macroName, color: "#427b58" },
  { tag: tags.literal, color: "#af3a03" },
  { tag: tags.separator, color: "#7c6f64" },
  { tag: tags.punctuation, color: "#af3a03" },
  { tag: tags.heading, color: "#79740e", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "#076678", textDecoration: "underline" },
  { tag: tags.invalid, color: "#9d0006" },
]);

export const gruvboxLight = [
  gruvboxLightEditor,
  syntaxHighlighting(gruvboxLightHighlight),
];

// ── Theme resolution ──────────────────────────────────────────────────────────

function isDarkAppTheme(theme: Theme): boolean {
  if (theme === "light" || theme.startsWith("gruvbox-light")) return false;
  if (theme === "system") {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return true;
}

/**
 * Return the appropriate CodeMirror extension array for the current app theme.
 * - Gruvbox dark variants → gruvboxDark
 * - Gruvbox light variants → gruvboxLight
 * - Any dark theme → gruvboxDark (complementary default)
 * - Any light theme → gruvboxLight (complementary default)
 */
export function getCodeMirrorTheme(theme: Theme): Extension[] {
  if (theme.startsWith("gruvbox-dark")) return gruvboxDark;
  if (theme.startsWith("gruvbox-light")) return gruvboxLight;
  if (isDarkAppTheme(theme)) return gruvboxDark;
  return gruvboxLight;
}
