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
  signature: string;
}

export interface Ref {
  name: string;
  ref_type: string;
}

export interface RemoteInfo {
  name: string;
  url: string;
}

export interface FileChange {
  path: string;
  staged: boolean;
  status: string;
}

export interface CommitFileGroupInput {
  files: string[];
  message: string;
}

export interface CommitGroupsResult {
  committed: number;
  message: string;
}

export interface CommitGroupProgress {
  current: number;
  total: number;
  message: string;
}

export interface CommitFileChange {
  path: string;
  old_path: string | null;
  status: string;
}

export interface Branch {
  name: string;
  current: boolean;
  remote: string | null;
}

export interface BranchComparison {
  ahead: number;
  behind: number;
  files: BranchFileChange[];
}

export interface BranchFileChange {
  path: string;
  old_path: string | null;
  status: string;
}

export interface RepoInfo {
  path: string;
  current_branch: string;
  remote: string | null;
  commit_signing: string;
  signing_key: string | null;
}

export interface SyncStatus {
  ahead: number;
  behind: number;
}

export interface SshKeyInfo {
  key_type: string;
  file_name: string;
  path: string;
  readable: boolean;
}

/** Map of "YYYY-MM-DD" → commit count */
export type ActivityMap = Record<string, number>;


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

export interface MergePreview {
  ahead: number;
  behind: number;
  incoming_commits: MergePreviewCommit[];
  changed_files: MergePreviewFile[];
}

export interface MergePreviewCommit {
  hash: string;
  message: string;
  author: string;
}

export interface MergePreviewFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
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

export interface SubmoduleInfo {
  name: string;
  path: string;
  commit_hash: string;
  status: string;
  desc: string;
}

export interface LfsFile {
  path: string;
  oid: string;
  state: string;
}

export interface LfsStatus {
  installed: boolean;
  tracked_files: LfsFile[];
  dirty_files: string[];
}

export interface CherryPickResult {
  success: boolean;
  message: string;
  conflicted_files: string[];
}

export interface PreflightResult {
  dirty_worktree: boolean;
  dirty_file_count: number;
  has_untracked_files: boolean;
  untracked_file_count: number;
  detached_head: boolean;
  merge_in_progress: boolean;
  rebase_in_progress: boolean;
  cherry_pick_in_progress: boolean;
  has_conflicts: boolean;
  conflicted_files: string[];
  current_branch: string | null;
  warnings: string[];
}

export interface BlameLine {
  line_number: number;
  commit_hash: string;
  author: string;
  email: string;
  date: string;
  content: string;
}

export interface ConventionFile {
  name: string;
  content: string;
}

export interface HealthFinding {
  category: string;
  severity: string;
  path: string;
  message: string;
  detail: string | null;
}

export interface HealthReport {
  findings: HealthFinding[];
  scanned_files: number;
  large_file_threshold_bytes: number;
}

export interface DiagnosticBundle {
  app_version: string;
  git_version: string;
  os_info: string;
  repo_path: string;
  current_branch: string;
  remote_url: string | null;
  head_commit: string;
  branch_count: number;
  tag_count: number;
  total_commits: number;
  staged_files: number;
  unstaged_files: number;
  untracked_files: number;
  lfs_enabled: boolean;
  conflict_state: boolean;
  rebase_in_progress: boolean;
  merge_in_progress: boolean;
  recent_errors: string[];
}

export interface ReflogEntry {
  index: number;
  commit_hash: string;
  action: string;
  description: string;
  date: string;
}

export interface BisectStatus {
  status: string;
  current?: string;
  bad?: string;
  good?: string;
  skip?: string;
  steps_left?: number;
  diff?: string;
}

export interface GitHook {
  name: string;
  path: string;
  exists: boolean;
  executable: boolean;
  content: string | null;
}

export interface LintDiagnostic {
  file: string;
  line: number | null;
  column: number | null;
  rule: string | null;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface LintResponse {
  diagnostics: LintDiagnostic[];
  linters_run: string[];
}

export interface GitConfigEntry {
  key: string;
  value: string;
  scope: string;
}

export interface GitConfigSection {
  name: string;
  subsections: string[];
  variables: GitConfigEntry[];
}

export interface AppLogEntry {
  timestamp: string;
  level: string;
  target: string;
  message: string;
  raw: string;
}

export interface GitFlowConfig {
  initialized: boolean;
  master: string;
  develop: string;
  feature_prefix: string;
  release_prefix: string;
  hotfix_prefix: string;
  versiontag_prefix: string;
}

export interface GitFlowResult {
  success: boolean;
  message: string;
}

export interface CloneProgress {
  phase: string;
  percent: number;
  message: string;
}

export interface WorktreeInfo {
  path: string;
  head: string;
  branch: string | null;
  is_locked: boolean;
  is_bare: boolean;
  is_prunable: boolean;
  is_current: boolean;
}

export interface SignatureVerification {
  commitHash: string;
  signatureType: string;
  status: string;
  signerName: string;
  signerEmail: string;
  keyFingerprint: string;
}

export interface SigningKeyInfo {
  keyType: string;
  keyId: string;
  name: string;
  email: string;
}

// Typed invoke wrappers
export const api = {
  repo: {
    open: (path: string) =>
      invoke<RepoInfo>("open_repo", { path }),
    info: (path: string) =>
      invoke<RepoInfo>("get_repo_info", { path }),
    clone: (url: string, destination: string) =>
      invoke<string>("git_clone", { url, destination }),
    cancelClone: () =>
      invoke<string>("cancel_clone"),
  },

  window: {
    showMain: () =>
      invoke<void>("show_main_window"),
    openSettings: () =>
      invoke<void>("open_settings_window"),
    openRepoFromTray: () =>
      invoke<void>("open_repo_from_tray"),
    setTraySyncStatus: (path: string) =>
      invoke<void>("set_tray_sync_status", { path }),
  },

  logs: {
    path: () =>
      invoke<string>("app_log_path"),
    list: (maxLines?: number, level?: string, query?: string) =>
      invoke<AppLogEntry[]>("app_log_list", {
        maxLines: maxLines ?? null,
        level: level ?? null,
        query: query ?? null,
      }),
    exportText: () =>
      invoke<string>("app_log_export_text"),
    clear: () =>
      invoke<void>("app_log_clear"),
  },

  logStream: (path: string, page?: number, perPage?: number, refName?: string | null) =>
    invoke<string>("git_log_stream", {
      path,
      page: page ?? 0,
      perPage: perPage ?? 200,
      refName: refName ?? null,
    }),

  log: (path: string, page?: number, perPage?: number, refName?: string | null) =>
    invoke<Commit[]>("git_log", {
      path,
      page: page ?? 0,
      perPage: perPage ?? 200,
      refName: refName ?? null,
    }),

  activity: (path: string, days?: number) =>
    invoke<ActivityMap>("git_activity", {
      path,
      days: days ?? 365,
    }),

  logSince: (path: string, knownHash: string, maxCount?: number, refName?: string | null) =>
    invoke<Commit[]>("git_log_since", {
      path,
      knownHash,
      maxCount: maxCount ?? 200,
      refName: refName ?? null,
    }),

  fileHistory: (path: string, filePath: string, maxCount?: number) =>
    invoke<Commit[]>("file_history", {
      path,
      filePath,
      maxCount: maxCount ?? null,
    }),

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
    compare: (path: string, base: string, target: string) =>
      invoke<BranchComparison>("compare_branches", { path, base, target }),
    fileDiff: (path: string, base: string, target: string, filePath: string, context?: number) =>
      invoke<string>("branch_file_diff", { path, base, target, filePath, context: context ?? null }),
  },

  commit: {
    stage: (path: string, filePath: string) =>
      invoke<string>("stage_file", { path, filePath }),
    stageFiles: (path: string, filePaths: string[]) =>
      invoke<string>("stage_files", { path, filePaths }),
    unstage: (path: string, filePath: string) =>
      invoke<string>("unstage_file", { path, filePath }),
    stageAll: (path: string) =>
      invoke<string>("stage_all", { path }),
    unstageAll: (path: string) =>
      invoke<string>("unstage_all", { path }),
    discard: (path: string, filePath: string) =>
      invoke<string>("discard_file", { path, filePath }),
    discardAll: (path: string) =>
      invoke<string>("discard_all", { path }),
    commit: (path: string, message: string, amend?: boolean, noVerify?: boolean) =>
      invoke<string>("commit_changes", { path, message, amend: amend ?? false, noVerify: noVerify ?? false }),
    commitGroups: (path: string, groups: CommitFileGroupInput[], noVerify?: boolean) =>
      invoke<CommitGroupsResult>("commit_file_groups", { path, groups, noVerify: noVerify ?? false }),
    revert: (path: string, commitHash: string) =>
      invoke<string>("revert_commit", { path, commitHash }),
    openInEditor: (path: string, filePath: string) =>
      invoke<string>("open_file_in_editor", { path, filePath }),
  },

  lint: {
    run: (path: string) =>
      invoke<LintResponse>("run_project_linters", { repoPath: path }),
  },

  diff: {
    file: (path: string, filePath: string, context?: number) =>
      invoke<string>("file_diff", { path, filePath, context: context ?? null }),
    commit: (path: string, commitHash: string, filePath?: string, context?: number) =>
      invoke<string>("commit_diff", { path, commitHash, filePath: filePath ?? null, context: context ?? null }),
    commitFiles: (path: string, commitHash: string) =>
      invoke<CommitFileChange[]>("commit_changed_files", { path, commitHash }),
    staged: (path: string, filePath?: string, context?: number) =>
      invoke<string>("staged_diff", { path, filePath: filePath ?? null, context: context ?? null }),
    applyHunk: (path: string, patch: string, action: "stage" | "unstage" | "discard") =>
      invoke<string>("apply_diff_hunk", { path, patch, action }),
    writeContent: (path: string, filePath: string, content: string) =>
      invoke<string>("write_file_content", { path, filePath, content }),
  },

  remote: {
    pull: (path: string, remote?: string, branch?: string, operationId?: string) =>
      invoke<string>("git_pull", { path, remote: remote ?? null, branch: branch ?? null, operationId: operationId ?? null }),
    push: (path: string, remote?: string, branch?: string, operationId?: string) =>
      invoke<string>("git_push", { path, remote: remote ?? null, branch: branch ?? null, operationId: operationId ?? null }),
    fetch: (path: string, remote?: string, operationId?: string) =>
      invoke<string>("git_fetch", { path, remote: remote ?? null, operationId: operationId ?? null }),
    cancelOp: (operationId: string) =>
      invoke<boolean>("cancel_git_op", { operationId }),
    getSyncStatus: (path: string) =>
      invoke<SyncStatus>("get_sync_status", { path }),
    detectSshKeys: () =>
      invoke<SshKeyInfo[]>("detect_ssh_keys"),
    detectProtocol: (path: string) =>
      invoke<string>("detect_remote_protocol", { path }),
    setTempCredentials: (path: string, username: string, password: string, remote?: string) =>
      invoke<string>("set_temp_credentials", { path, username, password, remote: remote ?? null }),
    restoreRemoteUrl: (path: string, originalUrl: string, remote?: string) =>
      invoke<void>("restore_remote_url", { path, originalUrl, remote: remote ?? null }),
    listRemotes: (path: string) =>
      invoke<RemoteInfo[]>("list_remotes", { path }),
    addRemote: (path: string, name: string, url: string) =>
      invoke<string>("add_remote", { path, name, url }),
    removeRemote: (path: string, name: string) =>
      invoke<string>("remove_remote", { path, name }),
    renameRemote: (path: string, name: string, newName: string) =>
      invoke<string>("rename_remote", { path, name, newName }),
    setRemoteUrl: (path: string, name: string, url: string) =>
      invoke<string>("set_remote_url", { path, name, url }),
    getRemoteUrl: (path: string) =>
      invoke<string>("get_remote_url", { path }),
    generateSshKey: (path: string, email: string) =>
      invoke<{ privateKey: string; publicKey: string }>("generate_ssh_key", { path, email }),
    testSshConnection: (path: string) =>
      invoke<boolean>("test_ssh_connection", { path }),
    testHttpsToken: (path: string, token: string) =>
      invoke<boolean>("test_https_token", { path, token }),
  },

  lfs: {
    status: (path: string) =>
      invoke<LfsStatus>("lfs_status", { path }),
    pull: (path: string) =>
      invoke<string>("lfs_pull", { path }),
    push: (path: string) =>
      invoke<string>("lfs_push", { path }),
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
    preview: (path: string, branch: string) =>
      invoke<MergePreview>("merge_preview", { path, branch }),
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
    diff: (path: string, index: number) =>
      invoke<string>("stash_diff", { path, index }),
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
    restoreToCommit: (path: string, hash: string) =>
      invoke<string>("restore_to_commit", { path, hash }),
    resetToCommit: (path: string, hash: string, mode: string) =>
      invoke<string>("reset_to_commit", { path, hash, mode }),
  },

  rebase: {
    start: (path: string, base: string, todos: { action: string; commit_hash: string; message: string }[], operationId?: string) =>
      invoke<{ success: boolean; message: string; conflicted_files: string[] }>("rebase_start", { path, base, todos, operationId: operationId ?? null }),
    continue: (path: string, operationId?: string) =>
      invoke<string>("rebase_continue", { path, operationId: operationId ?? null }),
    skip: (path: string, operationId?: string) =>
      invoke<string>("rebase_skip", { path, operationId: operationId ?? null }),
    abort: (path: string) =>
      invoke<string>("rebase_abort", { path }),
    status: (path: string) =>
      invoke<[boolean, string[]]>("rebase_status", { path }),
    todoList: (path: string, base: string) =>
      invoke<{ action: string; commit_hash: string; message: string }[]>("rebase_todo_list", { path, base }),
  },
  ai: {
    request: (url: string, method: string, headers: Record<string, string>, body?: string) =>
      invoke<{ status: number; body: string }>("ai_http_request", {
        request: { url, method, headers, body: body ?? null }
      }),
    readConventionFiles: (path: string) =>
      invoke<ConventionFile[]>("read_convention_files", { path }),
  },

  submodules: {
    list: (path: string) =>
      invoke<SubmoduleInfo[]>("submodule_list", { path }),
    init: (path: string, submodulePath?: string) =>
      invoke<string>("submodule_init", { path, submodulePath: submodulePath ?? null }),
    update: (path: string, submodulePath?: string) =>
      invoke<string>("submodule_update", { path, submodulePath: submodulePath ?? null }),
    remove: (path: string, submodulePath: string) =>
        invoke<string>("submodule_remove", { path, submodulePath }),
    },
    health: {
      check: (path: string) =>
        invoke<HealthReport>("repo_health_check", { path }),
      diagnostics: (path: string) =>
        invoke<DiagnosticBundle>("diagnostic_bundle", { path }),
    },
    preflight: {
      check: (path: string) =>
        invoke<PreflightResult>("preflight_check", { path }),
    },

    gitflow: {
      detect: (path: string) =>
        invoke<GitFlowConfig>("gitflow_detect", { path }),
      init: (
        path: string,
        master: string,
        develop: string,
        featurePrefix: string,
        releasePrefix: string,
        hotfixPrefix: string,
        versiontagPrefix: string,
      ) =>
        invoke<GitFlowConfig>("gitflow_init", {
          path,
          master,
          develop,
          featurePrefix,
          releasePrefix,
          hotfixPrefix,
          versiontagPrefix,
        }),
      updateConfig: (
        path: string,
        master: string,
        develop: string,
        featurePrefix: string,
        releasePrefix: string,
        hotfixPrefix: string,
        versiontagPrefix: string,
      ) =>
        invoke<GitFlowConfig>("gitflow_update_config", {
          path,
          master,
          develop,
          featurePrefix,
          releasePrefix,
          hotfixPrefix,
          versiontagPrefix,
        }),
      featureStart: (path: string, name: string) =>
        invoke<GitFlowResult>("gitflow_feature_start", { path, name }),
      featureFinish: (path: string, name: string, mergeStrategy: string, deleteBranch: boolean) =>
        invoke<GitFlowResult>("gitflow_feature_finish", { path, name, mergeStrategy, deleteBranch }),
      releaseStart: (path: string, version: string) =>
        invoke<GitFlowResult>("gitflow_release_start", { path, version }),
      releaseFinish: (path: string, version: string, mergeStrategy: string, createTag: boolean, tagMessage?: string) =>
        invoke<GitFlowResult>("gitflow_release_finish", {
          path, version, mergeStrategy, createTag, tagMessage: tagMessage ?? null,
        }),
      hotfixStart: (path: string, version: string) =>
        invoke<GitFlowResult>("gitflow_hotfix_start", { path, version }),
      hotfixFinish: (path: string, version: string, mergeStrategy: string, createTag: boolean, tagMessage?: string) =>
        invoke<GitFlowResult>("gitflow_hotfix_finish", {
          path, version, mergeStrategy, createTag, tagMessage: tagMessage ?? null,
        }),
    },

  bisect: {
    start: (path: string, bad: string, good?: string) =>
      invoke<string>("bisect_start", { path, bad, good: good ?? null }),
    good: (path: string) =>
      invoke<BisectStatus>("bisect_good", { path }),
    bad: (path: string) =>
      invoke<BisectStatus>("bisect_bad", { path }),
    skip: (path: string) =>
      invoke<BisectStatus>("bisect_skip", { path }),
    status: (path: string) =>
      invoke<BisectStatus>("bisect_status", { path }),
    reset: (path: string) =>
      invoke<string>("bisect_reset", { path }),
    candidateDiff: (path: string) =>
      invoke<string>("bisect_candidate_diff", { path }),
  },

  hooks: {
    list: (path: string) =>
      invoke<GitHook[]>("list_hooks", { repo_path: path }),
    enable: (path: string, hookName: string) =>
      invoke<void>("enable_hook", { repo_path: path, hook_name: hookName }),
    disable: (path: string, hookName: string) =>
      invoke<void>("disable_hook", { repo_path: path, hook_name: hookName }),
    save: (path: string, hookName: string, content: string) =>
      invoke<void>("save_hook", { repo_path: path, hook_name: hookName, content }),
    delete: (path: string, hookName: string) =>
      invoke<void>("delete_hook", { repo_path: path, hook_name: hookName }),
  },

  gitConfig: {
    list: (path: string, scope?: string) =>
      invoke<GitConfigEntry[]>("list_git_config", { path, scope }),
    get: (path: string, key: string, scope?: string) =>
      invoke<string>("get_git_config", { path, key, scope }),
    set: (path: string, key: string, value: string, scope?: string) =>
      invoke<string>("set_git_config", { path, key, value, scope }),
    unset: (path: string, key: string, scope?: string) =>
      invoke<string>("unset_git_config", { path, key, scope }),
    add: (path: string, key: string, value: string, scope?: string) =>
      invoke<string>("add_git_config", { path, key, value, scope }),
  },

  credentials: {
    set: (key: string, value: string) =>
      invoke<void>("credential_set", { key, value }),
    get: (key: string) =>
      invoke<string>("credential_get", { key }),
    delete: (key: string) =>
      invoke<void>("credential_delete", { key }),
  },

  signing: {
    verify: (repoPath: string, commitHash: string) =>
      invoke<SignatureVerification>("verify_signature", { repoPath, commitHash }),
    hasSignature: (repoPath: string, commitHash: string) =>
      invoke<boolean>("has_signature", { repoPath, commitHash }),
    listKeys: () =>
      invoke<SigningKeyInfo[]>("list_signing_keys"),
  },

  worktrees: {
    list: (path: string) =>
      invoke<WorktreeInfo[]>("worktree_list", { path }),
    add: (path: string, targetPath: string, branch?: string, newBranch?: string) =>
      invoke<string>("worktree_add", { path, targetPath, branch: branch ?? null, newBranch: newBranch ?? null }),
    remove: (path: string, worktreePath: string, force?: boolean) =>
      invoke<string>("worktree_remove", { path, worktreePath, force: force ?? false }),
    lock: (path: string, worktreePath: string) =>
      invoke<string>("worktree_lock", { path, worktreePath }),
    unlock: (path: string, worktreePath: string) =>
      invoke<string>("worktree_unlock", { path, worktreePath }),
    prune: (path: string) =>
      invoke<string>("worktree_prune", { path }),
  },
};
