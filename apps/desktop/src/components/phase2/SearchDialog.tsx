import { useState, useEffect, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitSearch } from "@/queries/useGitSearch";
import type { SearchOptions } from "@/queries/useGitSearch";
import { useGitBranches } from "@/queries/useGitLog";
import { Search, X, GitCommit, Calendar, User, FileText, GitBranch } from "lucide-react";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: branches } = useGitBranches(repoPath);

  // Search filter state
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [branch, setBranch] = useState("");
  const [maxCount, setMaxCount] = useState(50);

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
        {/* Filters section */}
        <div className="px-3 py-2 space-y-1.5 border-b border-border">
          {/* Query input — prominent */}
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commit messages..."
              className="w-full h-8 pl-7 pr-7 text-sm bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
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
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author"
                className="w-full h-6 pl-5 pr-1 text-2xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
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
              <input
                value={file}
                onChange={(e) => setFile(e.target.value)}
                placeholder="File path"
                className="w-full h-6 pl-5 pr-1 text-2xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />
            </div>
            {/* Since date */}
            <div className="relative flex-1 min-w-[100px]">
              <Calendar size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="w-full h-6 pl-5 pr-1 text-2xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent [color-scheme:dark]"
              />
            </div>
            {/* Until date */}
            <div className="relative flex-1 min-w-[100px]">
              <Calendar size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="w-full h-6 pl-5 pr-1 text-2xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent [color-scheme:dark]"
              />
            </div>
            {/* Max results */}
            <div className="flex-1 min-w-[60px]">
              <input
                type="number"
                value={maxCount}
                onChange={(e) => setMaxCount(Number(e.target.value))}
                placeholder="Max"
                min={1}
                max={500}
                className="w-full h-6 px-1.5 text-2xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-surface-1">
          <span className="text-2xs text-text-muted">
            {results?.length ? `${results.length} result(s)` : "Enter filters to search"}
          </span>
          <button onClick={onClose} className="text-2xs text-text-muted hover:text-text-primary transition-colors">
            Esc to close
          </button>
        </div>
      </div>
    </div>
  );
}
