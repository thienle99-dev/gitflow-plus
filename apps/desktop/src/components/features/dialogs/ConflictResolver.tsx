import { useState, useEffect, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { Check, Combine, ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { useQueryClient } from "@tanstack/react-query";

interface ConflictResolverProps {
  filePath: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function ConflictResolver({ filePath, onComplete, onCancel }: ConflictResolverProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();
  const [oursContent, setOursContent] = useState("");
  const [theirsContent, setTheirsContent] = useState("");
  const [resultContent, setResultContent] = useState("");
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAiResolveConflict = async () => {
    setLoadingAi(true);
    showToast("AI is resolving conflict...");
    try {
      const apiKey = localStorage.getItem("gitflowAiApiKey") || "";
      const model = localStorage.getItem("gitflowAiModel") || "claude-sonnet-4-20250514";
      const customUrl = localStorage.getItem("gitflowAiApiUrl") || "";
      const limit = Number(localStorage.getItem("gitflowAiTokenLimit") || "4096");

      const prompt = `You are an elite, highly experienced lead software engineer. We have a merge conflict in the file "${filePath}".
Please merge the following two versions of code changes intelligently. Solve all conflicts, preserve key logic from both branches where applicable, and ensure correct syntax with no compiler errors.

==================================================
OURS VERSION (Your current active working branch changes):
${oursContent}

==================================================
THEIRS VERSION (Incoming changes from target branch):
${theirsContent}

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
        setResultContent(resolved);
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

  const oursRef = useRef<HTMLDivElement>(null);
  const theirsRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch conflicted file content (ours / theirs from conflict markers in the working tree)
  useEffect(() => {
    if (!repoPath) return;
    (async () => {
      try {
        const rawDiff = await api.diff.file(repoPath, filePath);
        const lines = rawDiff.split("\n");
        const ours: string[] = [];
        const theirs: string[] = [];
        let inOurs = false;
        let inTheirs = false;

        for (const line of lines) {
          if (line.startsWith("<<<<<<<")) {
            inOurs = true;
            continue;
          }
          if (line.startsWith("=======")) {
            inOurs = false;
            inTheirs = true;
            continue;
          }
          if (line.startsWith(">>>>>>>")) {
            inTheirs = false;
            continue;
          }
          if (inOurs) ours.push(line);
          if (inTheirs) theirs.push(line);
        }

        setOursContent(ours.join("\n"));
        setTheirsContent(theirs.join("\n"));
        // Default result is OURS
        setResultContent(ours.join("\n"));
      } catch (e: any) {
        showToast(`Error loading conflict: ${e}`);
      }
    })();
  }, [repoPath, filePath]);

  // Initialize CodeMirror editors
  useEffect(() => {
    if (!oursRef.current || !theirsRef.current || !resultRef.current) return;

    const readOnlyExtensions = [
      basicSetup,
      oneDark,
      javascript(),
      EditorView.editable.of(false),
    ];

    const oursView = new EditorView({
      state: EditorState.create({ doc: oursContent, extensions: readOnlyExtensions }),
      parent: oursRef.current,
    });

    const theirsView = new EditorView({
      state: EditorState.create({ doc: theirsContent, extensions: readOnlyExtensions }),
      parent: theirsRef.current,
    });

    const resultView = new EditorView({
      state: EditorState.create({
        doc: resultContent,
        extensions: [basicSetup, oneDark, javascript()],
      }),
      parent: resultRef.current,
    });

    return () => {
      oursView.destroy();
      theirsView.destroy();
      resultView.destroy();
    };
  }, [oursContent, theirsContent, resultContent]);

  const acceptOurs = () => setResultContent(oursContent);
  const acceptTheirs = () => setResultContent(theirsContent);
  const acceptBoth = () => setResultContent(`${oursContent}\n\n${theirsContent}`);

  const handleComplete = async () => {
    if (!repoPath) return;
    setResolving(true);
    try {
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
      </div>

      {/* 3-panel content area */}
      <div className="flex-1 grid grid-rows-[1fr_1fr_1fr] gap-0 overflow-hidden">
        {/* OURS panel */}
        <div className="flex flex-col border-b border-border-40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1/60 border-b border-border-40/50">
            <span className="text-3xs font-bold text-[#30d158] uppercase tracking-wider">OURS (current branch)</span>
            <div className="flex-1" />
            <button
              className="h-6 px-2.5 rounded bg-[#30d158]/10 text-[#30d158] hover:bg-[#30d158]/20 text-3xs font-semibold flex items-center gap-1 transition-all"
              onClick={acceptOurs}
            >
              <Check size={10} />
              <span>Accept Ours</span>
            </button>
          </div>
          <div ref={oursRef} className="flex-1 overflow-auto" />
        </div>

        {/* THEIRS panel */}
        <div className="flex flex-col border-b border-border-40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1/60 border-b border-border-40/50">
            <span className="text-3xs font-bold text-[#ff9f0a] uppercase tracking-wider">THEIRS (incoming changes)</span>
            <div className="flex-1" />
            <button
              className="h-6 px-2.5 rounded bg-[#ff9f0a]/10 text-[#ff9f0a] hover:bg-[#ff9f0a]/20 text-3xs font-semibold flex items-center gap-1 transition-all"
              onClick={acceptTheirs}
            >
              <Check size={10} />
              <span>Accept Theirs</span>
            </button>
          </div>
          <div ref={theirsRef} className="flex-1 overflow-auto" />
        </div>

        {/* RESULT panel */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1/60 border-b border-border-40/50">
            <span className="text-3xs font-bold text-text-primary uppercase tracking-wider">RESULT (merged preview / editable)</span>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <button
                className="h-6 px-2.5 rounded bg-surface-3 hover:bg-surface-4 text-text-primary text-3xs font-semibold flex items-center gap-1 transition-all border border-border-40"
                onClick={acceptBoth}
              >
                <Combine size={10} />
                <span>Accept Both</span>
              </button>
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
          </div>
          <div ref={resultRef} className="flex-1 overflow-auto" />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2.5 px-4 py-2.5 border-t border-border-60 bg-surface-1">
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
