use serde::Serialize;
use tokio::process::Command;

/// Result of a pre-flight safety check before performing gitflow operations.
/// The frontend should inspect `warnings` before proceeding — each warning
/// represents a condition that could cause data loss or unexpected behavior.
#[derive(Serialize, Clone, Debug)]
pub struct PreflightResult {
    /// Whether the worktree has staged or unstaged changes
    pub dirty_worktree: bool,
    /// Number of staged + unstaged changed files
    pub dirty_file_count: usize,
    /// Whether there are untracked files in the worktree
    pub has_untracked_files: bool,
    /// Number of untracked files
    pub untracked_file_count: usize,
    /// Whether HEAD is detached (not on a named branch)
    pub detached_head: bool,
    /// Whether a merge is in progress (`.git/MERGE_HEAD` exists)
    pub merge_in_progress: bool,
    /// Whether a rebase is in progress (`.git/rebase-merge` or `.git/rebase-apply`)
    pub rebase_in_progress: bool,
    /// Whether a cherry-pick is in progress (`.git/CHERRY_PICK_HEAD`)
    pub cherry_pick_in_progress: bool,
    /// Whether there are unresolved merge conflicts (`UU`/`AA`/`DD` entries)
    pub has_conflicts: bool,
    /// List of conflicting file paths, empty if no conflicts
    pub conflicted_files: Vec<String>,
    /// The current branch name, or `None` if detached
    pub current_branch: Option<String>,
    /// Human-readable warning messages for conditions that should block or warn
    /// the user before proceeding with a gitflow operation
    pub warnings: Vec<String>,
}

/// Run a comprehensive pre-flight check on the repository at `path`.
/// Returns a structured report the frontend can use to display warnings
/// and decide whether to proceed, auto-stash, or abort.
#[tauri::command]
pub async fn preflight_check(path: String) -> Result<PreflightResult, String> {
    let git_dir_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "rev-parse", "--git-dir"])
        .output()
        .await
        .map_err(|e| format!("Failed to find git dir: {}", e))?;

    if !git_dir_output.status.success() {
        return Err("Not a git repository".to_string());
    }

    let git_dir = String::from_utf8_lossy(&git_dir_output.stdout).trim().to_string();

    // Resolve git_dir to an absolute path (it may be relative)
    let git_dir_path = if git_dir.starts_with('/') {
        std::path::PathBuf::from(&git_dir)
    } else {
        std::path::Path::new(&path).join(&git_dir)
    };

    // ── 1. Detached HEAD & current branch ──────────────────────────
    let symbolic_ref = Command::new("git")
        .args(["--no-pager", "-C", &path, "symbolic-ref", "--quiet", "HEAD"])
        .output()
        .await
        .map_err(|e| format!("Git error: {}", e))?;

    let detached_head = !symbolic_ref.status.success();
    let current_branch = if detached_head {
        None
    } else {
        let ref_name = String::from_utf8_lossy(&symbolic_ref.stdout).trim().to_string();
        // Extract short branch name (refs/heads/feature/foo → feature/foo)
        ref_name
            .strip_prefix("refs/heads/")
            .map(|s| s.to_string())
            .or_else(|| Some(ref_name))
    };

    // ── 2. Worktree dirty status (staged + unstaged) ───────────────
    let status_output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "status",
            "--porcelain",
            "--untracked-files=normal",
        ])
        .output()
        .await
        .map_err(|e| format!("Git error: {}", e))?;

    let status_text = String::from_utf8_lossy(&status_output.stdout);
    let mut dirty_file_count = 0usize;
    let mut untracked_file_count = 0usize;
    let mut conflicted_files: Vec<String> = Vec::new();

    for line in status_text.lines() {
        if line.len() < 3 {
            continue;
        }
        let x = line.chars().nth(0).unwrap_or(' ');
        let y = line.chars().nth(1).unwrap_or(' ');
        let file_path = line[3..].trim().to_string();

        // Unmerged / conflict markers
        if matches!(
            (x, y),
            ('U', _) | (_, 'U') | ('D', 'D') | ('A', 'A')
        ) {
            conflicted_files.push(file_path);
            continue;
        }

        if x == '?' && y == '?' {
            untracked_file_count += 1;
        } else {
            dirty_file_count += 1;
        }
    }

    let dirty_worktree = dirty_file_count > 0;
    let has_untracked_files = untracked_file_count > 0;
    let has_conflicts = !conflicted_files.is_empty();

    // ── 3. Operation-in-progress flags ─────────────────────────────
    let merge_in_progress = git_dir_path.join("MERGE_HEAD").exists();
    let rebase_in_progress = git_dir_path.join("rebase-merge").exists()
        || git_dir_path.join("rebase-apply").exists();
    let cherry_pick_in_progress = git_dir_path.join("CHERRY_PICK_HEAD").exists();

    // ── 4. Build human-readable warnings ───────────────────────────
    let mut warnings: Vec<String> = Vec::new();

    if dirty_worktree {
        warnings.push(format!(
            "Working tree has {} uncommitted change(s). Consider committing or stashing before proceeding.",
            dirty_file_count
        ));
    }

    if has_untracked_files {
        warnings.push(format!(
            "There are {} untracked file(s). These may be ignored by some operations.",
            untracked_file_count
        ));
    }

    if detached_head {
        warnings.push(
            "HEAD is detached. Create or switch to a branch before starting a gitflow operation."
                .to_string(),
        );
    }

    if merge_in_progress {
        warnings.push(
            "A merge is already in progress. Complete or abort it before starting a new operation."
                .to_string(),
        );
    }

    if rebase_in_progress {
        warnings.push(
            "A rebase is already in progress. Continue, skip, or abort it before starting a new operation."
                .to_string(),
        );
    }

    if cherry_pick_in_progress {
        warnings.push(
            "A cherry-pick is already in progress. Complete or abort it before starting a new operation."
                .to_string(),
        );
    }

    if has_conflicts {
        warnings.push(format!(
            "There are {} unresolved conflict(s). Resolve them before proceeding.",
            conflicted_files.len()
        ));
    }

    Ok(PreflightResult {
        dirty_worktree,
        dirty_file_count,
        has_untracked_files,
        untracked_file_count,
        detached_head,
        merge_in_progress,
        rebase_in_progress,
        cherry_pick_in_progress,
        has_conflicts,
        conflicted_files,
        current_branch,
        warnings,
    })
}

// ─── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preflight_result_serializes_cleanly() {
        let result = PreflightResult {
            dirty_worktree: false,
            dirty_file_count: 0,
            has_untracked_files: false,
            untracked_file_count: 0,
            detached_head: false,
            merge_in_progress: false,
            rebase_in_progress: false,
            cherry_pick_in_progress: false,
            has_conflicts: false,
            conflicted_files: vec![],
            current_branch: Some("main".to_string()),
            warnings: vec![],
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"dirty_worktree\":false"));
        assert!(json.contains("\"current_branch\":\"main\""));
    }

    #[test]
    fn preflight_result_with_warnings_serializes() {
        let result = PreflightResult {
            dirty_worktree: true,
            dirty_file_count: 3,
            has_untracked_files: true,
            untracked_file_count: 2,
            detached_head: true,
            merge_in_progress: false,
            rebase_in_progress: true,
            cherry_pick_in_progress: false,
            has_conflicts: true,
            conflicted_files: vec!["src/main.rs".to_string(), "lib.rs".to_string()],
            current_branch: None,
            warnings: vec![
                "Working tree has 3 uncommitted change(s).".to_string(),
                "HEAD is detached.".to_string(),
                "A rebase is already in progress.".to_string(),
                "There are 2 unresolved conflict(s).".to_string(),
            ],
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"dirty_worktree\":true"));
        assert!(json.contains("\"detached_head\":true"));
        assert!(json.contains("\"rebase_in_progress\":true"));
        assert!(json.contains("unresolved conflict"));
    }
}
