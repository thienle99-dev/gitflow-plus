import { useState, useEffect, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitSearch } from "@/queries/useGitSearch";
import type { SearchOptions } from "@/queries/useGitSearch";
import { useGitBranches } from "@/queries/useGitLog";
import { api } from "@/api/tauri";
import { Search, X, GitCommit, Calendar, User, FileText, GitBranch, Sparkles, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/form";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: branches } = useGitBranches(repoPath);

  // Mode select state
  const [searchMode, setSearchMode] = useState<"standard" | "semantic">("standard");

  // Standard Search filter state
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [branch, setBranch] = useState("");
  const [maxCount, setMaxCount] = useState(50);

  // Semantic Search state
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [loadingSemantic, setLoadingSemantic] = useState(false);
  const [semanticError, setSemanticError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Build search options — only send non-empty filters
  const searchOpts: SearchOptions = {
    ...(query && { query }),
    ...(author && { author }),
    ...(file && { file }),
    ...(since && { since }),
    ...(until && { until }),
    ...(branch && { branch }),
    ...(maxCount !== 50 && { maxCount }),
  };

  const { data: results, isLoading } = useGitSearch(repoPath, searchOpts);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleSemanticSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!semanticQuery.trim() || !repoPath) return;

    setLoadingSemantic(true);
    setSemanticError(null);
    setSemanticResults([]);

    try {
      const apiKey = localStorage.getItem("gitflowAiApiKey") || "";
      const model = localStorage.getItem("gitflowAiModel") || "claude-sonnet-4-20250514";
      const customUrl = localStorage.getItem("gitflowAiApiUrl") || "";
      const limit = Number(localStorage.getItem("gitflowAiTokenLimit") || "4096");

      // Fetch latest 150 commits to analyze
      const commits = await api.log(repoPath, 0, 150);
      if (commits.length === 0) {
        throw new Error("No commits found in this repository to search.");
      }

      const prompt = `You are a professional software repository analyst.
We have a list of Git commits from the repository and a user's natural language search query.
Analyze the commit messages, author names, dates, and ref names to identify and filter the commits that semantically match the user's query.

USER NATURAL LANGUAGE QUERY:
"${semanticQuery}"

GIT COMMITS LIST:
${JSON.stringify(commits.map(c => ({ hash: c.hash, message: c.message, author: c.author, date: c.date })))}

CRITICAL INSTRUCTIONS:
1. Identify all commits that semantically match the query (e.g. related to CORS, reqwest dependency additions, files modified, specific authors, or temporal clues like "yesterday", "last week").
2. Return ONLY a valid JSON array of commit hashes that match, ordered from most relevant to least relevant.
3. Example output: ["3a2b1c0...", "4f5e6d7..."]
4. ABSOLUTELY NO markdown wrapping, no code blocks (do NOT wrap in \`\`\`), no prefixing with "Here is...", no introductory/explanatory text. Return ONLY the raw JSON string.`;

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
        let cleanJsonStr = message.trim();
        if (cleanJsonStr.startsWith("```")) {
          const lines = cleanJsonStr.split("\n");
          if (lines[0].startsWith("```")) {
            lines.shift();
          }
          if (lines[lines.length - 1] === "```") {
            lines.pop();
          }
          cleanJsonStr = lines.join("\n");
        }
        
        const startIdx = cleanJsonStr.indexOf("[");
        const endIdx = cleanJsonStr.lastIndexOf("]");
        if (startIdx !== -1 && endIdx !== -1) {
          cleanJsonStr = cleanJsonStr.slice(startIdx, endIdx + 1);
        }

        const matchedHashes: string[] = JSON.parse(cleanJsonStr);
        if (Array.isArray(matchedHashes)) {
          const filtered = matchedHashes
            .map(hash => commits.find(c => c.hash.startsWith(hash) || hash.startsWith(c.hash)))
            .filter((c): c is NonNullable<typeof c> => !!c);
          setSemanticResults(filtered);
        } else {
          throw new Error("AI did not return a valid array of hashes.");
        }
      } else {
        throw new Error("AI returned empty search result.");
      }
    } catch (e: any) {
      console.error(e);
      setSemanticError(e.message || String(e));
    } finally {
      setLoadingSemantic(false);
    }
  };

  if (!open) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog */}
      <div className="relative w-[640px] max-h-[60vh] bg-surface-0 border border-border rounded-mac shadow-xl flex flex-col overflow-hidden">
        {/* Mode selector tabs */}
        <div className="flex border-b border-border bg-surface-1 px-3">
          <button
            onClick={() => setSearchMode("standard")}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-all ${
              searchMode === "standard"
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            Standard Search
          </button>
          <button
            onClick={() => setSearchMode("semantic")}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              searchMode === "semantic"
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <Sparkles size={11} className="text-accent" />
            Semantic AI Search
          </button>
        </div>

        {/* Filters / Query section */}
        {searchMode === "semantic" ? (
          <form onSubmit={handleSemanticSearch} className="px-3 py-3 space-y-2 border-b border-border">
            <div className="relative">
              <Sparkles size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-accent" />
              <Input
                variant="surface-1"
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                placeholder="Ask AI using natural language (e.g. Find where I fixed CORS yesterday)..."
                className="h-8 pl-8 pr-20 text-xs placeholder:text-text-muted/60"
              />
              <button
                type="submit"
                disabled={loadingSemantic || !semanticQuery.trim()}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-3 bg-accent text-accent-fg text-2xs font-medium rounded hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-1"
              >
                {loadingSemantic ? (
                  <RefreshCw size={10} className="animate-spin text-accent-fg" />
                ) : (
                  <Search size={10} />
                )}
                <span>Search</span>
              </button>
            </div>
            {semanticError && (
              <div className="text-2xs text-[#ff375f] bg-[#ff375f]/5 p-2 border border-[#ff375f]/15 rounded-mac">
                Error: {semanticError}
              </div>
            )}
          </form>
        ) : (
          <div className="px-3 py-2 space-y-1.5 border-b border-border">
            {/* Query input — prominent */}
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                ref={inputRef}
                variant="surface-1"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commit messages..."
                className="h-8 pl-7 pr-7 text-sm"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 ghost p-0.5">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter row */}
            <div className="flex gap-1.5 flex-wrap">
              {/* Author */}
              <div className="relative flex-1 min-w-[120px]">
                <User size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  variant="surface-1"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author"
                  className="h-6 pl-5 pr-1 text-2xs"
                />
              </div>
              {/* Branch selector */}
              <div className="relative flex-1 min-w-[100px]">
                <GitBranch size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full h-6 pl-5 pr-1 text-2xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer"
                >
                  <option value="">All branches</option>
                  {branches?.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {/* File path */}
              <div className="relative flex-[2] min-w-[150px]">
                <FileText size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  variant="surface-1"
                  value={file}
                  onChange={(e) => setFile(e.target.value)}
                  placeholder="File path"
                  className="h-6 pl-5 pr-1 text-2xs"
                />
              </div>
              {/* Since date */}
              <div className="relative flex-1 min-w-[100px]">
                <Calendar size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  variant="surface-1"
                  type="date"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  className="h-6 pl-5 pr-1 text-2xs [color-scheme:dark]"
                />
              </div>
              {/* Until date */}
              <div className="relative flex-1 min-w-[100px]">
                <Calendar size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  variant="surface-1"
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="h-6 pl-5 pr-1 text-2xs [color-scheme:dark]"
                />
              </div>
              {/* Max results */}
              <div className="flex-1 min-w-[60px]">
                <Input
                  variant="surface-1"
                  type="number"
                  value={maxCount}
                  onChange={(e) => setMaxCount(Number(e.target.value))}
                  placeholder="Max"
                  min={1}
                  max={500}
                  className="h-6 px-1.5 text-2xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {searchMode === "semantic" ? (
            <>
              {loadingSemantic && (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-text-muted">
                  <RefreshCw size={18} className="animate-spin text-accent" />
                  <span className="text-2xs">AI is searching and ranking commits...</span>
                </div>
              )}
              {!loadingSemantic && semanticResults.length === 0 && !semanticError && (
                <div className="text-xs text-text-muted text-center py-12 flex flex-col items-center justify-center space-y-1">
                  <Sparkles size={16} className="text-text-muted/40 mb-1" />
                  <span>No semantic search results yet.</span>
                  <span className="text-3xs opacity-60">Try: "Find where I fixed CORS yesterday" or "When was reqwest added?"</span>
                </div>
              )}
              {!loadingSemantic && semanticResults.map((commit) => (
                <div
                  key={commit.hash}
                  className="flex items-start gap-2 px-3 py-1.5 border-b border-border hover:bg-surface-1 transition-colors cursor-pointer"
                >
                  <GitCommit size={14} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-text-primary truncate">{commit.message}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xs font-mono text-text-muted">
                        {commit.hash.slice(0, 7)}
                      </span>
                      <span className="text-2xs text-text-muted">{commit.author}</span>
                      <span className="text-2xs text-text-muted">{formatDate(commit.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {isLoading && (
                <div className="text-xs text-text-muted text-center py-6">Searching...</div>
              )}
              {!isLoading && results && results.length === 0 && (
                <div className="text-xs text-text-muted text-center py-6">No matching commits</div>
              )}
              {results?.map((commit) => (
                <div
                  key={commit.hash}
                  className="flex items-start gap-2 px-3 py-1.5 border-b border-border hover:bg-surface-1 transition-colors cursor-pointer"
                >
                  <GitCommit size={14} className="mt-0.5 shrink-0 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-text-primary truncate">{commit.message}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xs font-mono text-text-muted">
                        {commit.hash.slice(0, 7)}
                      </span>
                      <span className="text-2xs text-text-muted">{commit.author}</span>
                      <span className="text-2xs text-text-muted">{formatDate(commit.date)}</span>
                      {commit.refs?.length > 0 && (
                        <span className="text-2xs text-[#30d158]">
                          {commit.refs.map((r) => r.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-surface-1">
          <span className="text-2xs text-text-muted">
            {searchMode === "semantic"
              ? `${semanticResults.length} semantic result(s)`
              : results?.length ? `${results.length} result(s)` : "Enter filters to search"
            }
          </span>
          <button onClick={onClose} className="text-2xs text-text-muted hover:text-text-primary transition-colors">
            Esc to close
          </button>
        </div>
      </div>
    </div>
  );
}
