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
};
