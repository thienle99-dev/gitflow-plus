import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { Check, Combine, ArrowLeft, Sparkles, RefreshCw, X, ChevronDown, ChevronRight, Lightbulb, Loader2, Wand2, ShieldCheck, ShieldAlert, ShieldQuestion, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAIConflictExplain, useAIConflictResolve } from "@/queries/useAI";
import { trackAIConflictResolve } from "@/lib/analytics";
import type { ConflictExplanation, ConflictResolution } from "@/lib/ai";
import AIMarkdown from "@/components/ui/feedback/AIMarkdown";

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

  // AI Conflict Explanation state
  const [explanations, setExplanations] = useState<Record<number, ConflictExplanation>>({});
  const [explainingBlocks, setExplainingBlocks] = useState<Set<number>>(new Set());
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const conflictExplain = useAIConflictExplain();

  // AI Conflict Resolution state (per-block suggestions with preview)
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, ConflictResolution>>({});
  const [suggestingBlocks, setSuggestingBlocks] = useState<Set<number>>(new Set());
  const [previewBlocks, setPreviewBlocks] = useState<Set<number>>(new Set());
  const conflictResolve = useAIConflictResolve();

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

  // Get context lines (surrounding non-conflict segments) for a specific block
  const getContextForBlock = useCallback(
    (blockId: number): { before: string[]; after: string[] } => {
      let before: string[] = [];
      let after: string[] = [];
      let foundBlock = false;

      for (const seg of segments) {
        if (seg.type === "context") {
          if (!foundBlock) {
            before = seg.lines;
          } else {
            after = seg.lines;
            break;
          }
        } else if (seg.type === "conflict" && seg.block.id === blockId) {
          foundBlock = true;
        }
      }

      return { before, after };
    },
    [segments],
  );

  const handleExplainConflict = useCallback(
    async (blockId: number) => {
      const block = conflictBlocks.find((b) => b.id === blockId);
      if (!block || !repoPath) return;

      // Toggle off if already expanded
      if (expandedExplanations.has(blockId) && explanations[blockId]) {
        setExpandedExplanations((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
        return;
      }

      // Show if already loaded
      if (explanations[blockId]) {
        setExpandedExplanations((prev) => new Set(prev).add(blockId));
        return;
      }

      setExplainingBlocks((prev) => new Set(prev).add(blockId));
      setExpandedExplanations((prev) => new Set(prev).add(blockId));

      try {
        const { before, after } = getContextForBlock(blockId);
        const result = await conflictExplain.mutateAsync({
          filePath,
          ours: block.ours,
          theirs: block.theirs,
          contextBefore: before,
          contextAfter: after,
          repoPath,
        });
        setExplanations((prev) => ({ ...prev, [blockId]: result }));
      } catch (e: any) {
        showToast(`AI Explain failed: ${e.message || e}`, "error");
        setExpandedExplanations((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      } finally {
        setExplainingBlocks((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    },
    [conflictBlocks, repoPath, filePath, explanations, expandedExplanations, getContextForBlock, conflictExplain],
  );

  // Per-block AI suggest: get AI suggestion for a single conflict block
  const handleSuggestForBlock = useCallback(
    async (blockId: number) => {
      const block = conflictBlocks.find((b) => b.id === blockId);
      if (!block || !repoPath) return;

      // Toggle off if already showing preview
      if (previewBlocks.has(blockId) && aiSuggestions[blockId]) {
        setPreviewBlocks((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
        return;
      }

      // Show if already loaded
      if (aiSuggestions[blockId]) {
        setPreviewBlocks((prev) => new Set(prev).add(blockId));
        return;
      }

      setSuggestingBlocks((prev) => new Set(prev).add(blockId));
      setPreviewBlocks((prev) => new Set(prev).add(blockId));

      try {
        const { before, after } = getContextForBlock(blockId);
        const result = await conflictResolve.mutateAsync({
          filePath,
          ours: block.ours,
          theirs: block.theirs,
          contextBefore: before,
          contextAfter: after,
          repoPath: repoPath ?? undefined,
        });
        setAiSuggestions((prev) => ({ ...prev, [blockId]: result }));
        trackAIConflictResolve();
      } catch (e: any) {
        showToast(`AI Resolve failed: ${e.message || e}`, "error");
        setPreviewBlocks((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      } finally {
        setSuggestingBlocks((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    },
    [conflictBlocks, repoPath, filePath, aiSuggestions, previewBlocks, getContextForBlock, conflictResolve],
  );

  // Apply AI suggestion to a specific block (user must confirm)
  const handleApplySuggestion = useCallback(
    (blockId: number) => {
      const suggestion = aiSuggestions[blockId];
      if (!suggestion) return;
      updateBlock(blockId, {
        resolvedLines: [...suggestion.suggestedLines],
        resolution: "custom" as const,
      });
      // Hide preview after applying
      setPreviewBlocks((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
      showToast(`Applied AI suggestion for Conflict #${blockId + 1}`);
    },
    [aiSuggestions, updateBlock],
  );

  // Bulk AI resolve: resolve each block individually via AI
  const handleBulkAiResolve = async () => {
    if (!repoPath) return;
    setLoadingAi(true);
    showToast("AI is resolving all conflicts individually...");
    try {
      for (const block of conflictBlocks) {
        if (suggestingBlocks.has(block.id)) continue;
        try {
          const { before, after } = getContextForBlock(block.id);
          const result = await conflictResolve.mutateAsync({
            filePath,
            ours: block.ours,
            theirs: block.theirs,
            contextBefore: before,
            contextAfter: after,
            repoPath: repoPath ?? undefined,
          });
          setAiSuggestions((prev) => ({ ...prev, [block.id]: result }));
          // Auto-apply for bulk resolve
          updateBlock(block.id, {
            resolvedLines: [...result.suggestedLines],
            resolution: "custom" as const,
          });
        } catch {
          // Continue with next block even if one fails
        }
      }
      trackAIConflictResolve();
      showToast("AI resolved all conflicts! Review each block before completing.");
    } catch (e: any) {
      showToast(`AI Bulk Resolve failed: ${e.message || e}`, "error");
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
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-60 bg-surface-1-40 backdrop-blur-md">
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
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-40 bg-surface-1-30">
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
          onClick={handleBulkAiResolve}
          disabled={loadingAi}
          title="AI resolves each conflict block individually with preview"
        >
          {loadingAi ? (
            <RefreshCw size={10} className="animate-spin text-accent-fg" />
          ) : (
            <Wand2 size={10} className="text-accent-fg" />
          )}
          <span>AI Resolve All</span>
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
                  <div className="w-px h-3 bg-border-40 mx-0.5" />
                  <button
                    className={`conflict-block-btn flex items-center gap-0.5 px-1.5 py-0.5 rounded text-3xs font-medium transition-all ${
                      expandedExplanations.has(block.id)
                        ? "bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30"
                        : "text-text-muted hover:text-[#ff9f0a] hover:bg-[#ff9f0a]/10 border border-transparent"
                    }`}
                    onClick={() => handleExplainConflict(block.id)}
                    disabled={explainingBlocks.has(block.id)}
                    title="AI Explain: why does this conflict exist?"
                  >
                    {explainingBlocks.has(block.id) ? (
                      <Loader2 size={9} className="animate-spin" />
                    ) : (
                      <Lightbulb size={9} />
                    )}
                    <span>{explainingBlocks.has(block.id) ? "Analyzing..." : "Explain"}</span>
                  </button>
                  <div className="w-px h-3 bg-border-40 mx-0.5" />
                  <button
                    className={`conflict-block-btn flex items-center gap-0.5 px-1.5 py-0.5 rounded text-3xs font-medium transition-all ${
                      previewBlocks.has(block.id) && aiSuggestions[block.id]
                        ? "bg-accent/15 text-accent border border-accent/30"
                        : suggestingBlocks.has(block.id)
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : "text-text-muted hover:text-accent hover:bg-accent/10 border border-transparent"
                    }`}
                    onClick={() => handleSuggestForBlock(block.id)}
                    disabled={suggestingBlocks.has(block.id)}
                    title="AI Suggest: get an AI-suggested resolution for this block"
                  >
                    {suggestingBlocks.has(block.id) ? (
                      <Loader2 size={9} className="animate-spin" />
                    ) : (
                      <Wand2 size={9} />
                    )}
                    <span>{suggestingBlocks.has(block.id) ? "Resolving..." : "AI Suggest"}</span>
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

              {/* AI Conflict Explanation Panel */}
              {expandedExplanations.has(block.id) && (
                <div className="conflict-explanation-panel">
                  {explainingBlocks.has(block.id) ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-3xs text-text-muted">
                      <Loader2 size={12} className="animate-spin text-[#ff9f0a]" />
                      <span>AI is analyzing why this conflict occurred...</span>
                    </div>
                  ) : explanations[block.id] ? (
                    <div className="px-4 py-3 space-y-3 border-t border-[#ff9f0a]/20 bg-[#ff9f0a]/5">
                      <div className="flex items-center gap-1.5">
                        <Lightbulb size={11} className="text-[#ff9f0a]" />
                        <span className="text-3xs font-bold text-[#ff9f0a] uppercase tracking-wider">Why This Conflict</span>
                      </div>

                      {/* Why conflict */}
                      <div className="space-y-1">
                        <div className="text-3xs font-semibold text-text-secondary uppercase tracking-wider">Cause</div>
                        <div className="text-2xs text-text-primary leading-relaxed">
                          <AIMarkdown content={explanations[block.id].whyConflict} />
                        </div>
                      </div>

                      {/* What ours changed */}
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1 bg-[#30d158]/5 rounded px-2.5 py-2 border border-[#30d158]/15">
                          <div className="text-3xs font-semibold text-[#30d158] uppercase tracking-wider">Ours Changed</div>
                          <div className="text-2xs text-text-primary leading-relaxed">
                            <AIMarkdown content={explanations[block.id].oursChanged} />
                          </div>
                        </div>

                        {/* What theirs changed */}
                        <div className="flex-1 space-y-1 bg-[#ff9f0a]/5 rounded px-2.5 py-2 border border-[#ff9f0a]/15">
                          <div className="text-3xs font-semibold text-[#ff9f0a] uppercase tracking-wider">Theirs Changed</div>
                          <div className="text-2xs text-text-primary leading-relaxed">
                            <AIMarkdown content={explanations[block.id].theirsChanged} />
                          </div>
                        </div>
                      </div>

                      {/* Recommendation */}
                      {explanations[block.id].recommendation && (
                        <div className="space-y-1 bg-accent/5 rounded px-2.5 py-2 border border-accent/15">
                          <div className="text-3xs font-semibold text-accent uppercase tracking-wider">💡 Recommendation</div>
                          <div className="text-2xs text-text-primary leading-relaxed">
                            <AIMarkdown content={explanations[block.id].recommendation} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* AI Suggestion Preview Panel */}
              {previewBlocks.has(block.id) && (
                <div className="border-t border-accent/20 bg-accent/5">
                  {suggestingBlocks.has(block.id) ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-3xs text-text-muted">
                      <Loader2 size={12} className="animate-spin text-accent" />
                      <span>AI is generating a suggested resolution for this conflict...</span>
                    </div>
                  ) : aiSuggestions[block.id] ? (
                    <div className="px-4 py-3 space-y-3">
                      {/* Header with confidence badge */}
                      <div className="flex items-center gap-2">
                        <Wand2 size={11} className="text-accent" />
                        <span className="text-3xs font-bold text-accent uppercase tracking-wider">AI Suggested Resolution</span>
                        <div className="flex-1" />
                        <span className={`flex items-center gap-1 text-3xs font-semibold px-1.5 py-0.5 rounded-full border ${
                          aiSuggestions[block.id].confidence === "high"
                            ? "text-[#30d158] bg-[#30d158]/10 border-[#30d158]/30"
                            : aiSuggestions[block.id].confidence === "medium"
                              ? "text-[#ff9f0a] bg-[#ff9f0a]/10 border-[#ff9f0a]/30"
                              : "text-[#ff453a] bg-[#ff453a]/10 border-[#ff453a]/30"
                        }`}>
                          {aiSuggestions[block.id].confidence === "high" ? (
                            <ShieldCheck size={9} />
                          ) : aiSuggestions[block.id].confidence === "medium" ? (
                            <ShieldQuestion size={9} />
                          ) : (
                            <ShieldAlert size={9} />
                          )}
                          {aiSuggestions[block.id].confidence} confidence
                        </span>
                      </div>

                      {/* Explanation */}
                      <div className="text-2xs text-text-primary leading-relaxed bg-surface-1-30 rounded px-2.5 py-2 border border-border-40">
                        <AIMarkdown content={aiSuggestions[block.id].explanation} />
                      </div>

                      {/* Suggested lines preview */}
                      <div className="bg-surface-1-30 border border-border-40 rounded overflow-hidden">
                        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-40 bg-surface-1-40">
                          <span className="text-3xs font-semibold text-text-secondary uppercase tracking-wider">Suggested Lines</span>
                          <span className="text-3xs text-text-muted">{aiSuggestions[block.id].suggestedLines.length} lines</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {aiSuggestions[block.id].suggestedLines.map((line, li) => (
                            <div key={li} className="flex items-center px-2.5 py-0.5 text-2xs font-mono text-text-primary hover:bg-accent/5">
                              <span className="w-5 text-right text-text-muted mr-2 select-none text-3xs">{li + 1}</span>
                              <span className="flex-1 whitespace-pre">{line || "\u00A0"}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApplySuggestion(block.id)}
                          className="h-6 px-3 bg-accent text-accent-fg hover:opacity-90 text-3xs font-semibold rounded flex items-center gap-1 transition-all shadow-sm"
                          title="Apply this AI suggestion to the conflict block"
                        >
                          <Check size={9} />
                          <span>Apply Suggestion</span>
                        </button>
                        <button
                          onClick={() => {
                            setPreviewBlocks((prev) => {
                              const next = new Set(prev);
                              next.delete(block.id);
                              return next;
                            });
                          }}
                          className="h-6 px-3 text-3xs font-medium text-text-muted hover:text-text-primary border border-border hover:bg-surface-2 rounded transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : null}
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
