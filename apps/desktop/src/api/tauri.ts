import { invoke } from "@tauri-apps/api/core";

// Data model types
export interface Commit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: string;
  message: string;
  refs: Ref[];
}

export interface Ref {
  name: string;
  ref_type: string;
}

export interface FileChange {
  path: string;
  staged: boolean;
  status: string;
}

export interface Branch {
  name: string;
  current: boolean;
  remote: string | null;
}

export interface RepoInfo {
  path: string;
  current_branch: string;
  remote: string | null;
}

export interface MergeResult {
  success: boolean;
  message: string;
  conflicted_files: string[];
}

export interface MergeStatus {
  merging: boolean;
  conflicts: string[];
  stage_entries: string[];
}

export interface StashEntry {
  index: number;
  message: string;
  branch: string;
}

export interface Tag {
  name: string;
  hash: string;
  annotated: boolean;
  message: string;
  author: string;
  date: string;
}

export interface CherryPickResult {
  success: boolean;
  message: string;
  conflicted_files: string[];
}

export interface BlameLine {
  line_number: number;
  commit_hash: string;
  author: string;
  date: string;
  content: string;
}

export interface ReflogEntry {
  index: number;
  commit_hash: string;
  action: string;
  description: string;
  date: string;
}

// Typed invoke wrappers
export const api = {
  repo: {
    open: (path: string) =>
      invoke<RepoInfo>("open_repo", { path }),
    info: (path: string) =>
      invoke<RepoInfo>("get_repo_info", { path }),
  },

  log: (path: string, page?: number, perPage?: number) =>
    invoke<Commit[]>("git_log", { path, page: page ?? 0, perPage: perPage ?? 200 }),

  status: (path: string) =>
    invoke<FileChange[]>("git_status", { path }),

  branches: {
    list: (path: string) =>
      invoke<Branch[]>("list_branches", { path }),
    create: (path: string, name: string, baseRef?: string) =>
      invoke<string>("create_branch", { path, name, baseRef: baseRef ?? null }),
    checkout: (path: string, name: string) =>
      invoke<string>("checkout_branch", { path, name }),
    delete: (path: string, name: string, force?: boolean) =>
      invoke<string>("delete_branch", { path, name, force: force ?? false }),
  },

  commit: {
    stage: (path: string, filePath: string) =>
      invoke<string>("stage_file", { path, filePath }),
    unstage: (path: string, filePath: string) =>
      invoke<string>("unstage_file", { path, filePath }),
    stageAll: (path: string) =>
      invoke<string>("stage_all", { path }),
    unstageAll: (path: string) =>
      invoke<string>("unstage_all", { path }),
    commit: (path: string, message: string, amend?: boolean) =>
      invoke<string>("commit_changes", { path, message, amend: amend ?? false }),
  },

  diff: {
    file: (path: string, filePath: string) =>
      invoke<string>("file_diff", { path, filePath }),
    commit: (path: string, commitHash: string, filePath?: string) =>
      invoke<string>("commit_diff", { path, commitHash, filePath: filePath ?? null }),
    staged: (path: string, filePath?: string) =>
      invoke<string>("staged_diff", { path, filePath: filePath ?? null }),
  },

  remote: {
    pull: (path: string, remote?: string, branch?: string) =>
      invoke<string>("git_pull", { path, remote: remote ?? null, branch: branch ?? null }),
    push: (path: string, remote?: string, branch?: string) =>
      invoke<string>("git_push", { path, remote: remote ?? null, branch: branch ?? null }),
    fetch: (path: string, remote?: string) =>
      invoke<string>("git_fetch", { path, remote: remote ?? null }),
  },

  watcher: {
    start: (path: string) =>
      invoke<string>("start_watcher", { path }),
    stop: () =>
      invoke<string>("stop_watcher"),
  },

  // Phase 2: Git Advanced
  merge: {
    start: (path: string, branch: string, squash?: boolean, noFF?: boolean) =>
      invoke<MergeResult>("merge_branch", { path, branch, squash: squash ?? false, noFF: noFF ?? false }),
    abort: (path: string) =>
      invoke<string>("merge_abort", { path }),
    continue: (path: string, message?: string) =>
      invoke<string>("merge_continue", { path, message: message ?? null }),
    status: (path: string) =>
      invoke<MergeStatus>("merge_status", { path }),
  },

  stash: {
    list: (path: string) =>
      invoke<StashEntry[]>("stash_list", { path }),
    push: (path: string, message?: string, includeUntracked?: boolean) =>
      invoke<string>("stash_push", { path, message: message ?? null, includeUntracked: includeUntracked ?? false }),
    pop: (path: string, index?: number) =>
      invoke<string>("stash_pop", { path, index: index ?? null }),
    apply: (path: string, index?: number) =>
      invoke<string>("stash_apply", { path, index: index ?? null }),
    drop: (path: string, index?: number) =>
      invoke<string>("stash_drop", { path, index: index ?? null }),
  },

  tag: {
    list: (path: string) =>
      invoke<Tag[]>("tag_list", { path }),
    create: (path: string, name: string, target?: string, message?: string) =>
      invoke<string>("tag_create", { path, name, target: target ?? null, message: message ?? null }),
    delete: (path: string, name: string) =>
      invoke<string>("tag_delete", { path, name }),
    push: (path: string, name: string, remote?: string) =>
      invoke<string>("tag_push", { path, name, remote: remote ?? null }),
  },

  cherryPick: {
    pick: (path: string, commitHash: string, noCommit?: boolean) =>
      invoke<CherryPickResult>("cherry_pick", { path, commitHash, noCommit: noCommit ?? false }),
    abort: (path: string) =>
      invoke<string>("cherry_pick_abort", { path }),
  },

  blame: (path: string, filePath: string) =>
    invoke<BlameLine[]>("file_blame", { path, filePath }),

  search: (path: string, opts: {
    query?: string;
    author?: string;
    file?: string;
    since?: string;
    until?: string;
    maxCount?: number;
    branch?: string;
  }) =>
    invoke<Commit[]>("search_commits", {
      path,
      query: opts.query ?? null,
      author: opts.author ?? null,
      file: opts.file ?? null,
      since: opts.since ?? null,
      until: opts.until ?? null,
      maxCount: opts.maxCount ?? null,
      branch: opts.branch ?? null,
    }),

  reflog: {
    list: (path: string, maxCount?: number) =>
      invoke<ReflogEntry[]>("reflog_list", { path, maxCount: maxCount ?? null }),
    undo: (path: string) =>
      invoke<string>("undo_last", { path }),
  },
};
