use tokio::process::Command;
use super::op_lock::RepoLocks;

#[tauri::command]
pub async fn stage_file(path: String, file_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "add", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(format!("Staged '{}'", file_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to stage: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn unstage_file(path: String, file_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "restore", "--staged", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(format!("Unstaged '{}'", file_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to unstage: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn stage_all(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "add", "-A"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok("Staged all changes".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to stage all: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn unstage_all(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "restore", "--staged", "."])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok("Unstaged all changes".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to unstage all: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn discard_file(path: String, file_path: String) -> Result<String, String> {
    let restore = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "restore",
            "--staged",
            "--worktree",
            "--",
            &file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git restore: {}", e))?;

    let clean = Command::new("git")
        .args(["--no-pager", "-C", &path, "clean", "-fd", "--", &file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to run git clean: {}", e))?;

    if restore.status.success() || clean.status.success() {
        Ok(format!("Discarded '{}'", file_path))
    } else {
        let restore_stderr = String::from_utf8_lossy(&restore.stderr);
        let clean_stderr = String::from_utf8_lossy(&clean.stderr);
        Err(format!(
            "Failed to discard: {} {}",
            restore_stderr.trim(),
            clean_stderr.trim()
        ))
    }
}

#[tauri::command]
pub async fn discard_all(path: String) -> Result<String, String> {
    let restore = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "restore",
            "--staged",
            "--worktree",
            ".",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git restore: {}", e))?;

    let clean = Command::new("git")
        .args(["--no-pager", "-C", &path, "clean", "-fd", "."])
        .output()
        .await
        .map_err(|e| format!("Failed to run git clean: {}", e))?;

    if restore.status.success() || clean.status.success() {
        Ok("Discarded all changes".to_string())
    } else {
        let restore_stderr = String::from_utf8_lossy(&restore.stderr);
        let clean_stderr = String::from_utf8_lossy(&clean.stderr);
        Err(format!(
            "Failed to discard all: {} {}",
            restore_stderr.trim(),
            clean_stderr.trim()
        ))
    }
}

#[tauri::command]
pub async fn commit_changes(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    message: String,
    amend: Option<bool>,
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

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
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
