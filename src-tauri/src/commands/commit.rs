use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::process::Command;
use super::op_lock::RepoLocks;

fn clear_status_cache(cache_state: &tauri::State<'_, crate::RepoCache>, path: &str) {
    if let Ok(mut cache) = cache_state.status_cache.lock() {
        cache.remove(path);
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct CommitFileGroup {
    pub files: Vec<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CommitGroupProgress {
    pub current: usize,
    pub total: usize,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CommitGroupsResult {
    pub committed: usize,
    pub message: String,
}

#[tauri::command]
pub async fn stage_file(
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
    file_path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "add", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok(format!("Staged '{}'", file_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to stage: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn stage_files(
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
    file_paths: Vec<String>,
) -> Result<String, String> {
    if file_paths.is_empty() {
        return Ok("No files to stage".to_string());
    }

    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.clone(),
        "add".to_string(),
        "--".to_string(),
    ];
    args.extend(file_paths.iter().cloned());

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok(format!("Staged {} files", file_paths.len()))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to stage files: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn unstage_file(
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
    file_path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "reset", "HEAD", "--", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok(format!("Unstaged '{}'", file_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to unstage: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn stage_all(
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "add", "-A"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok("Staged all changes".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to stage all: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn unstage_all(
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "reset", "HEAD", "--", "."])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok("Unstaged all changes".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to unstage all: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn discard_file(
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
    file_path: String,
) -> Result<String, String> {
    let reset = Command::new("git")
        .args(["--no-pager", "-C", &path, "reset", "HEAD", "--", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git reset: {}", e))?;

    let checkout = Command::new("git")
        .args(["--no-pager", "-C", &path, "checkout", "HEAD", "--", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;

    let clean = Command::new("git")
        .args(["--no-pager", "-C", &path, "clean", "-fd", "--", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git clean: {}", e))?;

    if reset.status.success() || checkout.status.success() || clean.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok(format!("Discarded '{}'", file_path))
    } else {
        let reset_stderr = String::from_utf8_lossy(&reset.stderr);
        let checkout_stderr = String::from_utf8_lossy(&checkout.stderr);
        let clean_stderr = String::from_utf8_lossy(&clean.stderr);
        Err(format!(
            "Failed to discard: {} {} {}",
            reset_stderr.trim(),
            checkout_stderr.trim(),
            clean_stderr.trim()
        ))
    }
}

#[tauri::command]
pub async fn discard_all(
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
) -> Result<String, String> {
    let reset = Command::new("git")
        .args(["--no-pager", "-C", &path, "reset", "HEAD", "--", "."])
        .output()
        .await
        .map_err(|e| format!("Failed to run git reset: {}", e))?;

    let checkout = Command::new("git")
        .args(["--no-pager", "-C", &path, "checkout", "HEAD", "--", "."])
        .output()
        .await
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;

    let clean = Command::new("git")
        .args(["--no-pager", "-C", &path, "clean", "-fd", "."])
        .output()
        .await
        .map_err(|e| format!("Failed to run git clean: {}", e))?;

    if reset.status.success() || checkout.status.success() || clean.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok("Discarded all changes".to_string())
    } else {
        let reset_stderr = String::from_utf8_lossy(&reset.stderr);
        let checkout_stderr = String::from_utf8_lossy(&checkout.stderr);
        let clean_stderr = String::from_utf8_lossy(&clean.stderr);
        Err(format!(
            "Failed to discard all: {} {} {}",
            reset_stderr.trim(),
            checkout_stderr.trim(),
            clean_stderr.trim()
        ))
    }
}

/// Selectively remove untracked files / directories from the working tree.
///
/// Runs `git clean -fd -- <paths...>` (force + directories, never ignored files).
/// This is the user-driven counterpart to the implicit `clean -fd` in
/// `discard_file` / `discard_all` — useful when you want to nuke a specific
/// set of untracked files without touching tracked-but-modified ones.
#[tauri::command]
pub async fn clean_untracked(
    cache_state: tauri::State<'_, crate::RepoCache>,
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    paths: Vec<String>,
) -> Result<String, String> {
    if paths.is_empty() {
        return Ok("No paths to clean".to_string());
    }
    let _guard = locks.acquire(&path).await;
    let mut args: Vec<String> = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.clone(),
        "clean".to_string(),
        "-fd".to_string(),
        "--".to_string(),
    ];
    for p in &paths {
        args.push(p.clone());
    }
    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git clean: {}", e))?;
    if output.status.success() {
        clear_status_cache(&cache_state, &path);
        Ok(format!("Cleaned {} untracked path(s)", paths.len()))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Clean failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn commit_changes(
    locks: tauri::State<'_, RepoLocks>,
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
    message: String,
    amend: Option<bool>,
    no_verify: Option<bool>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "commit".to_string(),
        "-m".to_string(),
        message,
    ];

    if amend.unwrap_or(false) {
        args.push("--amend".to_string());
    }
    if no_verify.unwrap_or(false) {
        args.push("--no-verify".to_string());
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        clear_status_cache(&cache_state, &args[2]);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let short = stdout
            .lines()
            .last()
            .unwrap_or("Committed")
            .trim()
            .to_string();
        Ok(short)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Commit failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn commit_file_groups(
    app: tauri::AppHandle,
    locks: tauri::State<'_, RepoLocks>,
    cache_state: tauri::State<'_, crate::RepoCache>,
    path: String,
    groups: Vec<CommitFileGroup>,
    no_verify: Option<bool>,
) -> Result<CommitGroupsResult, String> {
    let _guard = locks.acquire(&path).await;
    let total = groups.len();
    if total == 0 {
        return Ok(CommitGroupsResult {
            committed: 0,
            message: "No groups to commit".to_string(),
        });
    }

    let mut committed = 0usize;

    for (index, group) in groups.into_iter().enumerate() {
        let current = index + 1;
        let message = group.message.trim().to_string();
        if message.is_empty() {
            return Err(format!("Group {} has an empty commit message", current));
        }
        if group.files.is_empty() {
            return Err(format!("Group {} has no files", current));
        }

        let _ = app.emit(
            "commit-groups-progress",
            CommitGroupProgress {
                current,
                total,
                message: message.clone(),
            },
        );

        run_git(&path, &["reset", "HEAD", "--", "."])
            .await
            .map_err(|e| format!("Group {}/{} failed while unstaging: {}", current, total, e))?;
        clear_status_cache(&cache_state, &path);

        let mut add_args = vec!["add".to_string(), "--".to_string()];
        add_args.extend(group.files.iter().cloned());
        run_git_owned(&path, add_args)
            .await
            .map_err(|e| format!("Group {}/{} failed while staging files: {}", current, total, e))?;
        clear_status_cache(&cache_state, &path);

        let mut commit_args = vec!["commit".to_string(), "-m".to_string(), message];
        if no_verify.unwrap_or(false) {
            commit_args.push("--no-verify".to_string());
        }
        run_git_owned(&path, commit_args)
            .await
            .map_err(|e| format!("Group {}/{} failed while committing: {}", current, total, e))?;
        clear_status_cache(&cache_state, &path);

        committed += 1;
    }

    Ok(CommitGroupsResult {
        committed,
        message: format!("Committed {} suggested commits", committed),
    })
}

async fn run_git(path: &str, args: &[&str]) -> Result<String, String> {
    let mut owned_args = Vec::with_capacity(args.len());
    owned_args.extend(args.iter().map(|arg| arg.to_string()));
    run_git_owned(path, owned_args).await
}

async fn run_git_owned(path: &str, args: Vec<String>) -> Result<String, String> {
    let mut full_args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.to_string(),
    ];
    full_args.extend(args);

    let output = Command::new("git")
        .args(&full_args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(stderr.trim().to_string())
    }
}

#[tauri::command]
pub async fn revert_commit(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    commit_hash: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "revert",
            &commit_hash,
            "--no-edit",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git revert: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let short = stdout
            .lines()
            .last()
            .unwrap_or("Reverted")
            .trim()
            .to_string();
        Ok(short)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stderr_str = stderr.trim();

        // Check for merge commit error
        if stderr_str.contains("is a merge") {
            return Err("Cannot revert merge commit. Use git revert -m 1 manually.".to_string());
        }

        // Check for conflict
        if stderr_str.contains("CONFLICT") || stderr_str.contains("could not apply") {
            return Err(format!("Revert conflict: {}", stderr_str));
        }

        Err(format!("Revert failed: {}", stderr_str))
    }
}

#[tauri::command]
pub async fn open_file_in_editor(path: String, file_path: String) -> Result<String, String> {
    let full_path = std::path::Path::new(&path).join(&file_path);

    if !full_path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args([full_path.to_str().unwrap()])
            .output()
            .await
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .args([full_path.to_str().unwrap()])
            .output()
            .await
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", full_path.to_str().unwrap()])
            .output()
            .await
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(file_path)
}
