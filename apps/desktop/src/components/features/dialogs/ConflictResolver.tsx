import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { Check, Combine, ArrowLeft, Sparkles, RefreshCw, X, ChevronDown, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ConflictResolverProps {
  filePath: string;
  onComplete: () => void;
  onCancel: () => void;
}

/** A single conflict block parsed from the file */
interface ConflictBlock {
  id: number;
  ours: string[];
  theirs: string[];
  /** Current resolution: which lines are selected */
  resolvedLines: string[];
  /** "ours" | "theirs" | "both" | "custom" */
  resolution: "ours" | "theirs" | "both" | "custom";
  expanded: boolean;
}

/** Parsed result: non-conflict context + conflict blocks in order */
interface ParsedFile {
  segments: (
    | { type: "context"; lines: string[] }
    | { type: "conflict"; block: ConflictBlock }
  )[];
}

function parseConflictMarkers(raw: string): ParsedFile {
  const lines = raw.split("\n");
  const segments: ParsedFile["segments"] = [];
  const contextLines: string[] = [];
  let blockId = 0;

  let inOurs = false;
  let inTheirs = false;
  let ours: string[] = [];
  let theirs: string[] = [];

  const flushContext = () => {
    if (contextLines.length > 0) {
      segments.push({ type: "context", lines: [...contextLines] });
      contextLines.length = 0;
    }
  };

  for (const line of lines) {
    if (line.startsWith("<<<<<<<")) {
      flushContext();
      inOurs = true;
      inTheirs = false;
      ours = [];
      continue;
    }
    if (line.startsWith("=======") && inOurs) {
      inOurs = false;
      inTheirs = true;
      continue;
    }
    if (line.startsWith(">>>>>>>")) {
      inTheirs = false;
      const block: ConflictBlock = {
        id: blockId++,
        ours,
        theirs,
        resolvedLines: [...ours], // Default: accept ours
        resolution: "ours",
        expanded: true,
      };
      segments.push({ type: "conflict", block });
      ours = [];
      theirs = [];
      continue;
    }
    if (inOurs) {
      ours.push(line);
    } else if (inTheirs) {
      theirs.push(line);
    } else {
      contextLines.push(line);
    }
  }

  flushContext();
  return { segments };
}

function buildResolvedContent(segments: ParsedFile["segments"]): string {
  const result: string[] = [];
  for (const seg of segments) {
    if (seg.type === "context") {
      result.push(...seg.lines);
    } else {
      result.push(...seg.block.resolvedLines);
    }
  }
  return result.join("\n");
}

export default function ConflictResolver({ filePath, onComplete, onCancel }: ConflictResolverProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();
  const [segments, setSegments] = useState<ParsedFile["segments"]>([]);
  const [rawContent, setRawContent] = useState("");
  const [resolving, setResolving] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  // Fetch conflicted file content
  useEffect(() => {
    if (!repoPath) return;
    (async () => {
      try {
        // Read the actual file content (not diff) to get conflict markers
        const content = await api.diff.file(repoPath, filePath);
        setRawContent(content);
        const parsed = parseConflictMarkers(content);
        setSegments(parsed.segments);
      } catch (e: any) {
        showToast(`Error loading conflict: ${e}`, "error");
      }
    })();
  }, [repoPath, filePath]);

  const conflictBlocks = useMemo(
    () => segments.filter((s) => s.type === "conflict").map((s) => s.block),
    [segments],
  );

  const resolvedContent = useMemo(() => buildResolvedContent(segments), [segments]);

  // Update a single conflict block's resolution
  const updateBlock = useCallback(
    (blockId: number, updates: Partial<ConflictBlock> | ((block: ConflictBlock) => Partial<ConflictBlock>)) => {
      setSegments((prev) =>
        prev.map((seg) => {
          if (seg.type === "conflict" && seg.block.id === blockId) {
            const resolved = typeof updates === "function" ? updates(seg.block) : updates;
            return { type: "conflict" as const, block: { ...seg.block, ...resolved } };
          }
          return seg;
        }),
      );
    },
    [],
  );

  // Accept ours for a specific block
  const acceptOurs = useCallback(
    (blockId: number) => {
      updateBlock(blockId, (prev) => ({
        resolvedLines: [...prev.ours],
        resolution: "ours" as const,
      }));
    },
    [updateBlock],
  );

  // Accept theirs for a specific block
  const acceptTheirs = useCallback(
    (blockId: number) => {
      updateBlock(blockId, (prev) => ({
        resolvedLines: [...prev.theirs],
        resolution: "theirs" as const,
      }));
    },
    [updateBlock],
  );

  // Accept both for a specific block
  const acceptBoth = useCallback(
    (blockId: number) => {
      updateBlock(blockId, (prev) => ({
        resolvedLines: [...prev.ours, ...prev.theirs],
        resolution: "both" as const,
      }));
    },
    [updateBlock],
  );

  // Toggle a specific line from ours/theirs into the resolved lines
  const toggleLine = useCallback(
    (blockId: number, line: string, source: "ours" | "theirs") => {
      setSegments((prev) =>
        prev.map((seg) => {
          if (seg.type !== "conflict" || seg.block.id !== blockId) return seg;
          const block = seg.block;
          const idx = block.resolvedLines.indexOf(line);
          let newResolved: string[];
          if (idx >= 0) {
            // Remove the line
            newResolved = block.resolvedLines.filter((_, i) => i !== idx);
          } else {
            // Add the line at the end
            newResolved = [...block.resolvedLines, line];
          }
          return {
            type: "conflict" as const,
            block: { ...block, resolvedLines: newResolved, resolution: "custom" as const },
          };
        }),
      );
    },
    [],
  );

  // Accept all ours
  const acceptAllOurs = useCallback(() => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.type !== "conflict") return seg;
        return {
          type: "conflict" as const,
          block: { ...seg.block, resolvedLines: [...seg.block.ours], resolution: "ours" as const },
        };
      }),
    );
  }, []);

  // Accept all theirs
  const acceptAllTheirs = useCallback(() => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.type !== "conflict") return seg;
        return {
          type: "conflict" as const,
          block: { ...seg.block, resolvedLines: [...seg.block.theirs], resolution: "theirs" as const },
        };
      }),
    );
  }, []);

  // Accept all both
  const acceptAllBoth = useCallback(() => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.type !== "conflict") return seg;
        return {
          type: "conflict" as const,
          block: { ...seg.block, resolvedLines: [...seg.block.ours, ...seg.block.theirs], resolution: "both" as const },
        };
      }),
    );
  }, []);

  const handleAiResolveConflict = async () => {
    setLoadingAi(true);
    showToast("AI is resolving conflict...");
    try {
      const apiKey = localStorage.getItem("gitflowAiApiKey") || "";
      const model = localStorage.getItem("gitflowAiModel") || "claude-sonnet-4-20250514";
      const customUrl = localStorage.getItem("gitflowAiApiUrl") || "";
      const limit = Number(localStorage.getItem("gitflowAiTokenLimit") || "4096");

      // Build ours/theirs content from all blocks
      const allOurs = conflictBlocks.map((b) => b.ours.join("\n")).join("\n\n");
      const allTheirs = conflictBlocks.map((b) => b.theirs.join("\n")).join("\n\n");

      const prompt = `You are an elite, highly experienced lead software engineer. We have a merge conflict in the file "${filePath}".
Please merge the following two versions of code changes intelligently. Solve all conflicts, preserve key logic from both branches where applicable, and ensure correct syntax with no compiler errors.

==================================================
OURS VERSION (Your current active working branch changes):
${allOurs}

==================================================
THEIRS VERSION (Incoming changes from target branch):
${allTheirs}

==================================================
CRITICAL INSTRUCTIONS:
1. Return ONLY the resolved, syntactically correct code that merges both versions.
2. ABSOLUTELY NO introductory text, no "Here is the merged code...", no explanations, and no markdown code blocks (do NOT wrap in \`\`\`).
3. Return the exact, raw merged code text.`;

      let endpoint = "";
      let message = "";

      if (model.startsWith("claude-")) {
        endpoint = customUrl ? customUrl.trim() : "https://api.anthropic.com/v1/messages";
        if (customUrl && !endpoint.endsWith("/messages")) {
          endpoint = endpoint.replace(/\/+$/, "") + "/messages";
        }
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        };
        const body = JSON.stringify({
          model: model,
          max_tokens: limit,
          messages: [{ role: "user", content: prompt }],
          stream: false
        });

        const res = await api.ai.request(endpoint, "POST", headers, body);
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`API Error: ${res.status}`);
        }
        let data: any;
        const trimmedBody = res.body.trim();
        if (trimmedBody.startsWith("data:")) {
          let contentAccumulator = "";
          const lines = trimmedBody.split("\n");
          for (const line of lines) {
            const cleaned = line.trim();
            if (cleaned.startsWith("data:") && cleaned !== "data: [DONE]") {
              try {
                const chunkStr = cleaned.slice(5).trim();
                const chunkJson = JSON.parse(chunkStr);
                contentAccumulator += chunkJson.choices?.[0]?.delta?.content || chunkJson.delta?.content || "";
              } catch {}
            }
          }
          data = { content: [{ text: contentAccumulator }] };
        } else {
          data = JSON.parse(res.body);
        }
        message = data.content?.[0]?.text || "";
      } else {
        if (model === "ollama") {
          endpoint = customUrl ? customUrl.trim() : "http://localhost:11434/v1/chat/completions";
        } else if (model === "llama.cpp") {
          endpoint = customUrl ? customUrl.trim() : "http://localhost:8080/v1/chat/completions";
        } else {
          endpoint = customUrl ? customUrl.trim() : "https://api.openai.com/v1/chat/completions";
        }

        if (customUrl && !endpoint.endsWith("/chat/completions") && !endpoint.endsWith("/completions")) {
          endpoint = endpoint.replace(/\/+$/, "") + "/chat/completions";
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
        const body = JSON.stringify({
          model: model === "ollama" ? "llama3" : model === "llama.cpp" ? "local-model" : model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: limit,
          stream: false
        });

        const res = await api.ai.request(endpoint, "POST", headers, body);
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`API Error: ${res.status}`);
        }
        let data: any;
        const trimmedBody = res.body.trim();
        if (trimmedBody.startsWith("data:")) {
          let contentAccumulator = "";
          const lines = trimmedBody.split("\n");
          for (const line of lines) {
            const cleaned = line.trim();
            if (cleaned.startsWith("data:") && cleaned !== "data: [DONE]") {
              try {
                const chunkStr = cleaned.slice(5).trim();
                const chunkJson = JSON.parse(chunkStr);
                contentAccumulator += chunkJson.choices?.[0]?.delta?.content || chunkJson.choices?.[0]?.text || "";
              } catch {}
            }
          }
          data = { choices: [{ message: { content: contentAccumulator } }] };
        } else {
          data = JSON.parse(res.body);
        }
        message = data.choices?.[0]?.message?.content || "";
      }

      if (message.trim()) {
        let resolved = message.trim();
        if (resolved.startsWith("```")) {
          const lines = resolved.split("\n");
          if (lines[0].startsWith("```")) {
            lines.shift();
          }
          if (lines[lines.length - 1] === "```") {
            lines.pop();
          }
          resolved = lines.join("\n");
        }
        // Apply AI result to all conflict blocks as "custom"
        const aiLines = resolved.split("\n");
        // Distribute AI result evenly across blocks (simple approach)
        const linesPerBlock = Math.ceil(aiLines.length / conflictBlocks.length);
        setSegments((prev) => {
          let offset = 0;
          return prev.map((seg) => {
            if (seg.type !== "conflict") return seg;
            const blockLines = aiLines.slice(offset, offset + linesPerBlock);
            offset += linesPerBlock;
            return {
              type: "conflict" as const,
              block: { ...seg.block, resolvedLines: blockLines, resolution: "custom" as const },
            };
          });
        });
        showToast("AI resolved conflict successfully!");
      } else {
        throw new Error("AI returned empty resolution code.");
      }
    } catch (e: any) {
      console.error(e);
      showToast(`AI Resolve Failed: ${e.message || e}`);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleComplete = async () => {
    if (!repoPath) return;
    setResolving(true);
    try {
      // Write resolved content (without conflict markers) to the file
      await api.diff.writeContent(repoPath, filePath, resolvedContent);
      // Stage the resolved file so the merge machinery picks it up
      await api.commit.stage(repoPath, filePath);
      await api.merge.continue(repoPath);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      showToast("Merge conflict resolved");
      onComplete();
    } catch (e: any) {
      showToast(`Error completing merge: ${e}`);
    } finally {
      setResolving(false);
    }
  };

  const allResolved = conflictBlocks.every((b) => b.resolvedLines.length > 0 || (b.ours.length === 0 && b.theirs.length === 0));

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-60 bg-surface-1/40 backdrop-blur-md">
        <button onClick={onCancel} className="ghost p-1 text-text-muted hover:text-text-primary" title="Back">
          <ArrowLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-text-primary truncate flex-1">
          Resolve Conflict: {filePath}
        </span>
        <span className="text-3xs text-text-muted">
          {conflictBlocks.length} conflict{conflictBlocks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Global actions bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-40 bg-surface-1/30">
        <span className="text-3xs text-text-muted font-medium mr-1">Bulk:</span>
        <button
          className="conflict-bulk-btn accept-ours"
          onClick={acceptAllOurs}
          title="Accept all ours for every conflict block"
        >
          <Check size={10} />
          <span>All Ours</span>
        </button>
        <button
          className="conflict-bulk-btn accept-theirs"
          onClick={acceptAllTheirs}
          title="Accept all theirs for every conflict block"
        >
          <Check size={10} />
          <span>All Theirs</span>
        </button>
        <button
          className="conflict-bulk-btn accept-both"
          onClick={acceptAllBoth}
          title="Accept both sides for every conflict block"
        >
          <Combine size={10} />
          <span>All Both</span>
        </button>
        <div className="flex-1" />
        <button
          className="h-6 px-3 bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 text-3xs font-semibold rounded flex items-center gap-1 transition-all shadow-sm"
          onClick={handleAiResolveConflict}
          disabled={loadingAi}
        >
          {loadingAi ? (
            <RefreshCw size={10} className="animate-spin text-accent-fg" />
          ) : (
            <Sparkles size={10} className="text-accent-fg" />
          )}
          <span>AI Auto Resolve</span>
        </button>
      </div>

      {/* Conflict blocks list */}
      <div className="flex-1 overflow-y-auto">
        {segments.map((seg, idx) => {
          if (seg.type === "context") {
            return (
              <div key={`ctx-${idx}`} className="conflict-context-block">
                <div className="conflict-context-header">
                  <span className="text-3xs text-text-muted">Unchanged ({seg.lines.length} lines)</span>
                </div>
                <pre className="conflict-context-lines">
                  {seg.lines.slice(0, 5).map((line, i) => (
                    <div key={i} className="conflict-line context">{line || "\u00A0"}</div>
                  ))}
                  {seg.lines.length > 5 && (
                    <div className="conflict-line context-more">
                      ... {seg.lines.length - 5} more unchanged lines
                    </div>
                  )}
                </pre>
              </div>
            );
          }

          const block = seg.block;
          const resolutionColor =
            block.resolution === "ours"
              ? "text-[#30d158]"
              : block.resolution === "theirs"
                ? "text-[#ff9f0a]"
                : block.resolution === "both"
                  ? "text-accent"
                  : "text-text-secondary";

          return (
            <div key={`conflict-${block.id}`} className="conflict-block">
              {/* Block header */}
              <div className="conflict-block-header">
                <button
                  className="ghost p-0.5 text-text-muted hover:text-text-primary"
                  onClick={() => updateBlock(block.id, { expanded: !block.expanded })}
                >
                  {block.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <span className="text-3xs font-bold text-[#ff453a] uppercase tracking-wider">
                  Conflict #{block.id + 1}
                </span>
                <span className={`text-3xs font-medium ${resolutionColor}`}>
                  ({block.resolution})
                </span>
                <div className="flex-1" />
                <div className="flex items-center gap-1">
                  <button
                    className="conflict-block-btn accept-ours"
                    onClick={() => acceptOurs(block.id)}
                    title="Accept ours for this block"
                  >
                    <Check size={9} />
                    <span>Ours</span>
                  </button>
                  <button
                    className="conflict-block-btn accept-theirs"
                    onClick={() => acceptTheirs(block.id)}
                    title="Accept theirs for this block"
                  >
                    <Check size={9} />
                    <span>Theirs</span>
                  </button>
                  <button
                    className="conflict-block-btn accept-both"
                    onClick={() => acceptBoth(block.id)}
                    title="Accept both for this block"
                  >
                    <Combine size={9} />
                    <span>Both</span>
                  </button>
                </div>
              </div>

              {block.expanded && (
                <div className="conflict-block-body">
                  {/* OURS lines */}
                  <div className="conflict-side-panel">
                    <div className="conflict-side-header ours">
                      <span className="text-3xs font-bold text-[#30d158] uppercase">Ours</span>
                      <span className="text-3xs text-text-muted">Click to toggle</span>
                    </div>
                    <div className="conflict-lines-list">
                      {block.ours.length === 0 ? (
                        <div className="conflict-line empty">No changes</div>
                      ) : (
                        block.ours.map((line, li) => {
                          const isSelected = block.resolvedLines.includes(line);
                          return (
                            <button
                              key={`ours-${li}`}
                              className={`conflict-line ours ${isSelected ? "selected" : ""}`}
                              onClick={() => toggleLine(block.id, line, "ours")}
                              title={isSelected ? "Click to remove from result" : "Click to add to result"}
                            >
                              <span className="conflict-line-indicator">
                                {isSelected ? "✓" : "+"}
                              </span>
                              <span className="conflict-line-text">{line || "\u00A0"}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* THEIRS lines */}
                  <div className="conflict-side-panel">
                    <div className="conflict-side-header theirs">
                      <span className="text-3xs font-bold text-[#ff9f0a] uppercase">Theirs</span>
                      <span className="text-3xs text-text-muted">Click to toggle</span>
                    </div>
                    <div className="conflict-lines-list">
                      {block.theirs.length === 0 ? (
                        <div className="conflict-line empty">No changes</div>
                      ) : (
                        block.theirs.map((line, li) => {
                          const isSelected = block.resolvedLines.includes(line);
                          return (
                            <button
                              key={`theirs-${li}`}
                              className={`conflict-line theirs ${isSelected ? "selected" : ""}`}
                              onClick={() => toggleLine(block.id, line, "theirs")}
                              title={isSelected ? "Click to remove from result" : "Click to add to result"}
                            >
                              <span className="conflict-line-indicator">
                                {isSelected ? "✓" : "+"}
                              </span>
                              <span className="conflict-line-text">{line || "\u00A0"}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* RESOLVED preview */}
                  <div className="conflict-side-panel resolved">
                    <div className="conflict-side-header resolved">
                      <span className="text-3xs font-bold text-text-primary uppercase">Result</span>
                      <span className="text-3xs text-text-muted">{block.resolvedLines.length} lines</span>
                    </div>
                    <div className="conflict-lines-list">
                      {block.resolvedLines.length === 0 ? (
                        <div className="conflict-line empty text-text-muted">Empty (all lines removed)</div>
                      ) : (
                        block.resolvedLines.map((line, li) => (
                          <div key={`res-${li}`} className="conflict-line resolved">
                            <span className="conflict-line-indicator text-accent">·</span>
                            <span className="conflict-line-text">{line || "\u00A0"}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-60 bg-surface-1">
        <span className="text-3xs text-text-muted">
          {allResolved ? "All conflicts resolved" : "Some conflicts need resolution"}
        </span>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleComplete}
            disabled={resolving}
            className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity min-w-[64px]"
          >
            {resolving ? "Completing..." : "Complete Merge"}
          </button>
          <button
            onClick={onCancel}
            className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-all"
          >
            Cancel
          </button>
        </div>
      </div>

    </div>
  );
}
