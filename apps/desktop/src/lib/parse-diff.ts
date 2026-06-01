/**
 * Parse a unified diff string into structured hunks.
 */

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "delete" | "context" | "header";
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export function parseDiff(diff: string): DiffHunk[] {
  const lines = diff.split("\n");
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = {
          oldStart: parseInt(match[1]),
          oldLines: parseInt(match[2] || "1"),
          newStart: parseInt(match[3]),
          newLines: parseInt(match[4] || "1"),
          header: line,
          lines: [],
        };
        oldLine = parseInt(match[1]);
        newLine = parseInt(match[3]);
        currentHunk.lines.push({ type: "header", content: line, oldLineNumber: null, newLineNumber: null });
      }
    } else if (currentHunk) {
      if (line.startsWith("+")) {
        currentHunk.lines.push({ type: "add", content: line, oldLineNumber: null, newLineNumber: newLine });
        newLine++;
      } else if (line.startsWith("-")) {
        currentHunk.lines.push({ type: "delete", content: line, oldLineNumber: oldLine, newLineNumber: null });
        oldLine++;
      } else {
        currentHunk.lines.push({ type: "context", content: line, oldLineNumber: oldLine, newLineNumber: newLine });
        oldLine++;
        newLine++;
      }
    }
  }

  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}

/**
 * File-level diff parsing for stash diff viewer and file history.
 */
export interface DiffFile {
  path: string;
  status: "added" | "modified" | "deleted";
  hunks: DiffHunk[];
}

export function parseDiffFiles(diffOutput: string): DiffFile[] {
  const fileChunks = diffOutput.split(/(?=^diff --git)/m).filter(Boolean);
  const result: DiffFile[] = [];

  for (const chunk of fileChunks) {
    const firstLine = chunk.split("\n")[0];
    const match = firstLine.match(/diff --git a\/(.*) b\/(.*)/);
    if (!match) continue;

    const path = match[2];
    const hunks = parseDiff(chunk);
    const status: DiffFile["status"] = chunk.includes("new file mode")
      ? "added"
      : chunk.includes("deleted file mode")
        ? "deleted"
        : "modified";

    result.push({ path, status, hunks });
  }

  return result;
}

export function countDiffChanges(files: DiffFile[]): { added: number; removed: number; files: number } {
  let added = 0;
  let removed = 0;

  for (const file of files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") added++;
        if (line.type === "delete") removed++;
      }
    }
  }

  return { added, removed, files: files.length };
}
