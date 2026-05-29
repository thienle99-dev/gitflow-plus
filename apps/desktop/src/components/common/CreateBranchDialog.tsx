import { useState, useRef, useEffect } from "react";
import { api, type Branch } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, RefreshCw } from "lucide-react";

interface CreateBranchDialogProps {
  repoPath: string;
  branches: Branch[];
  open: boolean;
  onClose: () => void;
  initialRef?: string;
}

export default function CreateBranchDialog({
  repoPath,
  branches,
  open,
  onClose,
  initialRef,
}: CreateBranchDialogProps) {
  const [name, setName] = useState("");
  const [baseRef, setBaseRef] = useState(initialRef || "HEAD");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleAiSuggestBranchName = async () => {
    setLoadingAi(true);
    setError(null);
    try {
      const apiKey = localStorage.getItem("gitflowAiApiKey") || "";
      const model = localStorage.getItem("gitflowAiModel") || "claude-sonnet-4-20250514";
      const customUrl = localStorage.getItem("gitflowAiApiUrl") || "";
      const limit = Number(localStorage.getItem("gitflowAiTokenLimit") || "4096");

      const statusList = await api.status(repoPath);
      if (statusList.length === 0) {
        throw new Error("No modified files in working directory to suggest a branch name for.");
      }

      const changesText = statusList.map(c => `- ${c.path} (${c.status})`).join("\n");
      const prompt = `You are a professional software architect. We are creating a new Git branch.
Based on the following list of modified files in the working directory, suggest a short, highly descriptive Git branch name that follows Conventional Commits format (e.g. feat/cors-backend-proxy, fix/memory-leak-login, refactor/auth-hook).

MODIFIED FILES:
${changesText}

CRITICAL INSTRUCTIONS:
1. Return ONLY the raw branch name (lowercase, kebab-case, no spaces, using standard prefixes: feat/, fix/, refactor/, chore/, docs/, perf/).
2. ABSOLUTELY NO other text, no markdown wrapping, no code blocks (do NOT wrap in \`\`\`), no prefixing with "Here is...", no introductory/explanatory text.
3. Keep it under 35 characters if possible.`;

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
        let suggested = message.trim();
        if (suggested.startsWith("```")) {
          const lines = suggested.split("\n");
          if (lines[0].startsWith("```")) {
            lines.shift();
          }
          if (lines[lines.length - 1] === "```") {
            lines.pop();
          }
          suggested = lines.join("\n");
        }
        suggested = suggested.replace(/\s+/g, "").toLowerCase();
        setName(suggested);
      } else {
        throw new Error("AI returned empty branch name.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || String(e));
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (open) {
      setName("");
      setBaseRef(initialRef || "HEAD");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialRef]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Branch name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.branches.create(repoPath, name.trim(), baseRef === "HEAD" ? undefined : baseRef);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
      onClose();
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "Failed to create branch");
    } finally {
      setLoading(false);
    }
  };

  const localBranches = branches.filter((b) => !b.remote && b.name !== name.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-surface-1 border border-border rounded-mac shadow-xl min-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">Create Branch</h3>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-text-secondary">Branch name</label>
              <button
                type="button"
                disabled={loadingAi}
                onClick={handleAiSuggestBranchName}
                className="text-2xs text-accent hover:underline flex items-center gap-1 transition-all"
                title="Suggest branch name based on changed files"
              >
                {loadingAi ? (
                  <RefreshCw size={10} className="animate-spin text-accent" />
                ) : (
                  <Sparkles size={10} />
                )}
                <span>AI Suggest</span>
              </button>
            </div>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="feature/..."
              className="w-full text-xs bg-surface-0 border border-border rounded-mac px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Based on</label>
            <select
              value={baseRef}
              onChange={(e) => setBaseRef(e.target.value)}
              className="w-full text-xs bg-surface-0 border border-border rounded-mac px-2.5 py-1.5 text-text-primary outline-none focus:border-accent"
            >
              <option value="HEAD">HEAD (current branch)</option>
              {localBranches.map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          {error && <div className="text-xs text-[#ff375f]">{error}</div>}
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button className="ghost text-xs px-3" onClick={onClose}>Cancel</button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="px-4 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {loading ? "Creating..." : "Create Branch"}
          </button>
        </div>
      </div>
    </div>
  );
}
