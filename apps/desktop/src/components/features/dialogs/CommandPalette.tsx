import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitBranches } from "@/queries/useGitLog";
import { api } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { trackRemoteOp } from "@/stores/operations";
import {
  Search,
  GitBranch,
  GitCommit,
  GitFork,
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  Archive,
  Plus,
  Merge,
  Tag,
  Settings,
  Keyboard,
  BarChart3,
  Clock,
  ArrowRight,
  Hash,
  Layers,
  Sparkles,
  Trash2,
  RotateCcw,
  Rocket,
  Zap,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type ActionCategory = "git" | "navigation" | "ai" | "repo";

interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  category: ActionCategory;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  /** Only show when a repo is open */
  requiresRepo?: boolean;
}

interface PaletteItem {
  type: "action" | "branch" | "commit" | "repo";
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category?: string;
}

/** Simple fuzzy match — checks if all query characters appear in order */
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Score for sorting — lower is better */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  let qi = 0;
  let score = 0;
  let lastMatch = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Consecutive matches get bonus
      if (ti === lastMatch + 1) score -= 1;
      // Word boundary match gets bonus
      if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "/" || t[ti - 1] === "-") score -= 2;
      lastMatch = ti;
      qi++;
      score += ti;
    }
  }
  return qi === q.length ? score : Infinity;
}

const ACTIONS: PaletteAction[] = [
  // Git actions
  {
    id: "git-fetch",
    label: "Fetch",
    description: "Fetch from remote",
    category: "git",
    icon: <Download size={13} />,
    shortcut: "",
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-pull",
    label: "Pull",
    description: "Pull from remote",
    category: "git",
    icon: <Download size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-push",
    label: "Push",
    description: "Push to remote",
    category: "git",
    icon: <Upload size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-create-branch",
    label: "Create Branch",
    description: "Create a new branch",
    category: "git",
    icon: <Plus size={13} />,
    shortcut: "⌘N",
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-stash",
    label: "Stash Changes",
    description: "Stash current changes",
    category: "git",
    icon: <Archive size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-stash-pop",
    label: "Stash Pop",
    description: "Pop latest stash",
    category: "git",
    icon: <RotateCcw size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-merge",
    label: "Merge Branch",
    description: "Merge a branch into current",
    category: "git",
    icon: <Merge size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-tag",
    label: "Create Tag",
    description: "Create a new tag",
    category: "git",
    icon: <Tag size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-stage-all",
    label: "Stage All",
    description: "Stage all changes",
    category: "git",
    icon: <Layers size={13} />,
    shortcut: "⌘⇧A",
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-unstage-all",
    label: "Unstage All",
    description: "Unstage all changes",
    category: "git",
    icon: <Layers size={13} />,
    shortcut: "⌘U",
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "git-refresh",
    label: "Refresh",
    description: "Refresh repository state",
    category: "git",
    icon: <RefreshCw size={13} />,
    shortcut: "⌘R",
    action: () => {},
    requiresRepo: true,
  },
  // Navigation
  {
    id: "nav-search",
    label: "Spotlight Search",
    description: "Search commits",
    category: "navigation",
    icon: <Search size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "nav-analytics",
    label: "Analytics",
    description: "View repository analytics",
    category: "navigation",
    icon: <BarChart3 size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "nav-settings",
    label: "Settings",
    description: "Open settings",
    category: "navigation",
    icon: <Settings size={13} />,
    shortcut: "⌘,",
    action: () => {},
  },
  {
    id: "nav-shortcuts",
    label: "Keyboard Shortcuts",
    description: "View all shortcuts",
    category: "navigation",
    icon: <Keyboard size={13} />,
    shortcut: "⌘?",
    action: () => {},
  },
  {
    id: "nav-open-repo",
    label: "Open Repository",
    description: "Open a Git repository",
    category: "repo",
    icon: <FolderOpen size={13} />,
    shortcut: "⌘O",
    action: () => {},
  },
  {
    id: "nav-clone",
    label: "Clone Repository",
    description: "Clone from URL",
    category: "repo",
    icon: <Download size={13} />,
    action: () => {},
  },
  // AI
  {
    id: "ai-commit-message",
    label: "AI: Generate Commit Message",
    description: "Generate a commit message with AI",
    category: "ai",
    icon: <Sparkles size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  // GitFlow
  {
    id: "gitflow-init",
    label: "GitFlow: Initialize",
    description: "Initialize GitFlow branching model",
    category: "git",
    icon: <GitFork size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "gitflow-feature-start",
    label: "GitFlow: Start Feature",
    description: "Create a new feature branch from develop",
    category: "git",
    icon: <Plus size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "gitflow-release-start",
    label: "GitFlow: Start Release",
    description: "Create a new release branch from develop",
    category: "git",
    icon: <Rocket size={13} />,
    action: () => {},
    requiresRepo: true,
  },
  {
    id: "gitflow-hotfix-start",
    label: "GitFlow: Start Hotfix",
    description: "Create a new hotfix branch from main",
    category: "git",
    icon: <Zap size={13} />,
    action: () => {},
    requiresRepo: true,
  },
];

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const openRepo = useRepoStore((s) => s.openRepo);
  const openDialog = useUIStore((s) => s.openDialog);
  const queryClient = useQueryClient();

  const { data: branches } = useGitBranches(repoPath);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build action handlers with real implementations
  const actionHandlers = useMemo(() => {
    if (!repoPath) return {};
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    return {
      "git-fetch": async () => {
        try {
          await trackRemoteOp("fetch", () => api.remote.fetch(repoPath));
          showToast("Fetched from remote");
          invalidate();
        } catch (e: any) { showToast(`Fetch failed: ${e}`, "error"); }
      },
      "git-pull": async () => {
        try {
          await trackRemoteOp("pull", () => api.remote.pull(repoPath));
          showToast("Pulled from remote");
          invalidate();
        } catch (e: any) { showToast(`Pull failed: ${e}`, "error"); }
      },
      "git-push": async () => {
        try {
          await trackRemoteOp("push", () => api.remote.push(repoPath));
          showToast("Pushed to remote");
          invalidate();
        } catch (e: any) { showToast(`Push failed: ${e}`, "error"); }
      },
      "git-create-branch": () => openDialog("create-branch"),
      "git-stash": async () => {
        try {
          await api.stash.push(repoPath);
          showToast("Changes stashed");
          invalidate();
        } catch (e: any) { showToast(`Stash failed: ${e}`, "error"); }
      },
      "git-stash-pop": async () => {
        try {
          await api.stash.pop(repoPath);
          showToast("Stash popped");
          invalidate();
        } catch (e: any) { showToast(`Stash pop failed: ${e}`, "error"); }
      },
      "git-merge": () => openDialog("merge"),
      "git-tag": () => openDialog("tag"),
      "git-stage-all": async () => {
        try {
          await api.commit.stageAll(repoPath);
          showToast("All changes staged");
          invalidate();
        } catch (e: any) { showToast(`Stage failed: ${e}`, "error"); }
      },
      "git-unstage-all": async () => {
        try {
          await api.commit.unstageAll(repoPath);
          showToast("All changes unstaged");
          invalidate();
        } catch (e: any) { showToast(`Unstage failed: ${e}`, "error"); }
      },
      "git-refresh": () => {
        invalidate();
        showToast("Refreshed");
      },
      "nav-search": () => openDialog("search"),
      "nav-analytics": () => openDialog("analytics"),
      "nav-settings": () => openDialog("settings"),
      "nav-shortcuts": () => openDialog("keyboard-shortcuts"),
      "nav-open-repo": async () => {
        const { open: openNativeDialog } = await import("@tauri-apps/plugin-dialog");
        const selected = await openNativeDialog({ directory: true, multiple: false });
        if (selected) openRepo(selected as string);
      },
      "nav-clone": () => openDialog("clone"),
      "ai-commit-message": () => {
        // Focus commit box — the user can then click the AI button
        showToast("Open the commit box and click ✨ to generate with AI");
      },
      "gitflow-init": () => openDialog("gitflow"),
      "gitflow-feature-start": () => openDialog("gitflow-feature-start"),
      "gitflow-release-start": () => openDialog("gitflow-release-start"),
      "gitflow-hotfix-start": () => openDialog("gitflow-hotfix-start"),
    } as Record<string, () => void | Promise<void>>;
  }, [repoPath, queryClient, openDialog, openRepo]);

  // Build all items
  const allItems = useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = [];

    // Actions
    for (const act of ACTIONS) {
      if (act.requiresRepo && !repoPath) continue;
      items.push({
        type: "action",
        id: act.id,
        label: act.label,
        subtitle: act.description,
        icon: act.icon,
        category: act.category === "git" ? "Git" : act.category === "navigation" ? "Navigation" : act.category === "ai" ? "AI" : "Repository",
        action: () => {
          const handler = actionHandlers[act.id];
          if (handler) handler();
          onClose();
        },
      });
    }

    // Branches
    if (branches && repoPath) {
      for (const branch of branches) {
        const prefix = branch.current ? "● " : "";
        const remote = branch.remote ? ` (${branch.remote})` : "";
        items.push({
          type: "branch",
          id: `branch-${branch.name}`,
          label: `${prefix}${branch.name}`,
          subtitle: `${branch.current ? "current" : "checkout"}${remote}`,
          icon: <GitBranch size={13} className={branch.current ? "text-[#30d158]" : ""} />,
          category: "Branches",
          action: async () => {
            if (branch.current) return;
            try {
              await api.branches.checkout(repoPath, branch.name);
              showToast(`Checked out ${branch.name}`);
              queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
            } catch (e: any) {
              showToast(`Checkout failed: ${e}`, "error");
            }
            onClose();
          },
        });
      }
    }

    // Recent repos
    if (recentRepos.length > 0) {
      for (const repo of recentRepos) {
        const name = repo.split(/[/\\]/).filter(Boolean).pop() || repo;
        const parent = repo.split(/[/\\]/).filter(Boolean).slice(-2, -1)[0] || "";
        items.push({
          type: "repo",
          id: `repo-${repo}`,
          label: name,
          subtitle: parent !== name ? `${parent} · ${repo}` : repo,
          icon: <FolderOpen size={13} />,
          category: "Recent Repos",
          action: () => {
            openRepo(repo);
            onClose();
          },
        });
      }
    }

    return items;
  }, [branches, repoPath, recentRepos, actionHandlers, openRepo, onClose, queryClient]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    return allItems.filter(
      (item) =>
        fuzzyMatch(query, item.label) ||
        fuzzyMatch(query, item.subtitle || "") ||
        fuzzyMatch(query, item.category || ""),
    ).sort((a, b) => {
      const sa = fuzzyScore(query, a.label);
      const sb = fuzzyScore(query, b.label);
      if (sa !== sb) return sa - sb;
      // Type priority: action > branch > repo
      const typeOrder = { action: 0, branch: 1, commit: 2, repo: 3 };
      return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    });
  }, [allItems, query]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: { category: string; items: PaletteItem[] }[] = [];
    const seen = new Set<string>();
    for (const item of filteredItems) {
      const cat = item.category || "Other";
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({ category: cat, items: [] });
      }
      groups.find((g) => g.category === cat)!.items.push(item);
    }
    return groups;
  }, [filteredItems]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => filteredItems, [filteredItems]);

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector(`[data-palette-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const executeItem = useCallback(
    (item: PaletteItem) => {
      item.action();
    },
    [],
  );

  // Keyboard handler
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item) executeItem(item);
        return;
      }
      // Tab to accept first result
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const item = flatItems[0];
        if (item) executeItem(item);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, flatItems, selectedIndex, onClose, executeItem]);

  const [shouldRender, phase] = useAnimatedMount(open, 150);

  if (!shouldRender) return null;

  const isExiting = phase === "exit";

  return (
    <div className={`fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] ${isExiting ? "anim-overlay-exit" : "anim-overlay-enter"}`} onClick={onClose}>
      <div
        className={`w-[min(560px,90vw)] bg-surface-0 rounded-xl shadow-2xl border border-border-60 overflow-hidden ${isExiting ? "anim-palette-exit" : "anim-palette-enter"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-40">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, branch, or repo..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] font-mono text-text-muted">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[min(420px,50vh)] overflow-y-auto py-1.5">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-text-muted">No results for "{query}"</p>
            </div>
          ) : (
            (() => {
              let globalIndex = 0;
              return grouped.map((group) => (
                <div key={group.category}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {group.category}
                  </div>
                  {group.items.map((item) => {
                    const idx = globalIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        data-palette-index={idx}
                        className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-accent/10 text-text-primary"
                            : "text-text-secondary hover:bg-surface-1-50"
                        }`}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <span className={`shrink-0 ${isSelected ? "text-accent" : "text-text-muted"}`}>
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="text-xs font-medium truncate block">{item.label}</span>
                          {item.subtitle && (
                            <span className="text-[10px] text-text-muted truncate block">{item.subtitle}</span>
                          )}
                        </span>
                        {isSelected && (
                          <ArrowRight size={10} className="text-accent shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-40 bg-surface-1-30">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <kbd className="px-1 py-0.5 bg-surface-2 border border-border rounded text-[9px] font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <kbd className="px-1 py-0.5 bg-surface-2 border border-border rounded text-[9px] font-mono">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <kbd className="px-1 py-0.5 bg-surface-2 border border-border rounded text-[9px] font-mono">Tab</kbd>
              first result
            </span>
          </div>
          <span className="text-[10px] text-text-muted">
            {flatItems.length} result{flatItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
