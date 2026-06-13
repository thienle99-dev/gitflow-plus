use serde::{Deserialize, Serialize};
use std::io::Write;
use tokio::process::Command;
use super::op_lock::RepoLocks;
use super::running_ops::RunningOps;

#[derive(Serialize, Clone, Debug)]
pub struct RebaseResult {
    pub success: bool,
    pub message: String,
    pub conflicted_files: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct PausedCommitInfo {
    pub message: String,
    pub staged_files: Vec<CommitFileEntry>,
}

#[derive(Serialize, Clone, Debug)]
pub struct CommitFileEntry {
    pub status: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RebaseTodo {
    pub action: String,
    pub commit_hash: String,
    pub message: String,
}

pub async fn git_rebase_status(path: &str) -> Result<(bool, Vec<String>), String> {
    let git_dir_output = Command::new("git")
        .args(["--no-pager", "-C", path, "rev-parse", "--git-dir"])
        .output()
        .await
        .map_err(|e| format!("Git error: {}", e))?;

    let git_dir = String::from_utf8_lossy(&git_dir_output.stdout)
        .trim()
        .to_string();
    let rebase_apply = format!("{}/rebase-apply", git_dir);
    let rebase_merge = format!("{}/rebase-merge", git_dir);

    let in_progress = std::path::Path::new(&rebase_apply).exists()
        || std::path::Path::new(&rebase_merge).exists();

    let mut conflicts = vec![];
    if in_progress {
        if let Ok(status_output) = Command::new("git")
            .args([
                "--no-pager",
                "-C",
                path,
                "status",
                "--porcelain",
                "--untracked-files=no",
            ])
            .output()
            .await
        {
            for line in String::from_utf8_lossy(&status_output.stdout).lines() {
                if line.starts_with("UU") || line.starts_with("AA") || line.starts_with("DD") {
                    if let Some(file) = line.get(3..) {
                        conflicts.push(file.trim().to_string());
                    }
                }
            }
        }
    }

    Ok((in_progress, conflicts))
}

/// Get commits between base..HEAD for building the todo list
pub async fn git_rebase_todo_range(path: &str, base: &str) -> Result<Vec<RebaseTodo>, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            path,
            "log",
            "--reverse",
            "--pretty=format:%H|%s",
            format!("{}..HEAD", base).as_str(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to list commits: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let todos = stdout
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(2, '|').collect();
            if parts.len() == 2 {
                Some(RebaseTodo {
                    action: "pick".to_string(),
                    commit_hash: parts[0].to_string(),
                    message: parts[1].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(todos)
}

fn parse_rebase_conflicts(stderr: &str) -> Vec<String> {
    let mut files = vec![];
    for line in stderr.lines() {
        if line.contains("CONFLICT") {
            if let Some(file) = line.split(" in ").nth(1) {
                files.push(file.trim_end_matches(|c| c == '.' || c == ' ').to_string());
            }
        }
    }
    files
}

// Tauri commands
#[tauri::command]
pub async fn rebase_start(
    locks: tauri::State<'_, RepoLocks>,
    running_ops: tauri::State<'_, RunningOps>,
    path: String,
    base: String,
    todos: Vec<RebaseTodo>,
    operation_id: Option<String>,
) -> Result<RebaseResult, String> {
    let _guard = locks.acquire(&path).await;

    if todos.is_empty() {
        return Err("No rebase todo items provided".to_string());
    }

    let todo_content = todos
        .iter()
        .map(|t| format!("{} {} {}", t.action, t.commit_hash, t.message))
        .collect::<Vec<_>>()
        .join("\n");

    let script_dir = std::env::temp_dir().join("gitflow-rebase");
    std::fs::create_dir_all(&script_dir).ok();
    let script_path = script_dir.join("sequencer.sh");

    let script = format!(
        "#!/bin/sh\necho '{}' > \"$1\"\n",
        todo_content.replace('\'', "'\\''")
    );

    {
        let mut f = std::fs::File::create(&script_path)
            .map_err(|e| format!("Failed to create sequencer script: {}", e))?;
        f.write_all(script.as_bytes())
            .map_err(|e| format!("Failed to write sequencer script: {}", e))?;
    }

    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o755)).ok();

    let mut cmd = tokio::process::Command::new("git");
    cmd.args(["--no-pager", "-C", &path, "rebase", "-i", &base, "--no-edit"])
        .env("GIT_SEQUENCE_EDITOR", script_path.to_str().unwrap_or("/bin/true"));

    let stderr_output = match operation_id {
        Some(op_id) => {
            let rx = running_ops.spawn(op_id, cmd)?;
            match rx.await.unwrap_or_else(|_| Err("Operation cancelled".into())) {
                Ok(_) => return Ok(RebaseResult {
                    success: true,
                    message: "Rebase completed successfully".to_string(),
                    conflicted_files: vec![],
                }),
                Err(e) => e,
            }
        }
        None => {
            let output = cmd.output().await
                .map_err(|e| format!("Failed to run rebase: {}", e))?;
            if output.status.success() {
                return Ok(RebaseResult {
                    success: true,
                    message: "Rebase completed successfully".to_string(),
                    conflicted_files: vec![],
                });
            }
            String::from_utf8_lossy(&output.stderr).to_string()
        }
    };

    let conflicted = parse_rebase_conflicts(&stderr_output);
    Ok(RebaseResult {
        success: !conflicted.is_empty(),
        message: if conflicted.is_empty() {
            stderr_output.trim().to_string()
        } else {
            "Rebase paused due to conflicts".to_string()
        },
        conflicted_files: conflicted,
    })
}

#[tauri::command]
pub async fn rebase_continue(
    locks: tauri::State<'_, RepoLocks>,
    running_ops: tauri::State<'_, RunningOps>,
    path: String,
    operation_id: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;

    let mut cmd = tokio::process::Command::new("git");
    cmd.args(["--no-pager", "-C", &path, "rebase", "--continue", "--no-edit"]);

    match operation_id {
        Some(op_id) => {
            let rx = running_ops.spawn(op_id, cmd)?;
            rx.await.unwrap_or_else(|_| Err("Operation cancelled".into()))
        }
        None => {
            let output = cmd.output().await
                .map_err(|e| format!("Failed to continue rebase: {}", e))?;
            if output.status.success() {
                Ok("Rebase continued".to_string())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
    }
}

#[tauri::command]
pub async fn rebase_skip(
    locks: tauri::State<'_, RepoLocks>,
    running_ops: tauri::State<'_, RunningOps>,
    path: String,
    operation_id: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;

    let mut cmd = tokio::process::Command::new("git");
    cmd.args(["--no-pager", "-C", &path, "rebase", "--skip"]);

    match operation_id {
        Some(op_id) => {
            let rx = running_ops.spawn(op_id, cmd)?;
            rx.await.unwrap_or_else(|_| Err("Operation cancelled".into()))
        }
        None => {
            let output = cmd.output().await
                .map_err(|e| format!("Failed to skip rebase: {}", e))?;
            if output.status.success() {
                Ok("Rebase skipped".to_string())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
    }
}

#[tauri::command]
pub async fn rebase_abort(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<String, String> {
    use tokio::process::Command;
    let _guard = locks.acquire(&path).await;
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "rebase", "--abort"])
        .output()
        .await
        .map_err(|e| format!("Failed to abort rebase: {}", e))?;

    if output.status.success() {
        Ok("Rebase aborted".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn rebase_status(path: String) -> Result<(bool, Vec<String>), String> {
    git_rebase_status(&path).await
}

#[tauri::command]
pub async fn rebase_todo_list(path: String, base: String) -> Result<Vec<RebaseTodo>, String> {
    git_rebase_todo_range(&path, &base).await
}

/// Get info about the current commit during a rebase edit pause
#[tauri::command]
pub async fn get_paused_commit_info(path: String) -> Result<PausedCommitInfo, String> {
    use tokio::process::Command;

    // Get HEAD commit message
    let msg_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "log", "-1", "--format=%B", "HEAD"])
        .output()
        .await
        .map_err(|e| format!("Failed to get commit message: {}", e))?;

    let message = String::from_utf8_lossy(&msg_output.stdout).trim().to_string();

    // Get files in the staged commit (what would be committed)
    let files_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "diff", "--cached", "--name-status"])
        .output()
        .await
        .map_err(|e| format!("Failed to get commit files: {}", e))?;

    let staged_files: Vec<CommitFileEntry> = String::from_utf8_lossy(&files_output.stdout)
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(2, '\t').collect();
            if parts.len() == 2 {
                Some(CommitFileEntry {
                    status: parts[0].to_string(),
                    path: parts[1].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(PausedCommitInfo {
        message,
        staged_files,
    })
}

/// Amend the paused commit during a rebase edit, then continue rebase
#[tauri::command]
pub async fn amend_and_continue_rebase(
    locks: tauri::State<'_, RepoLocks>,
    running_ops: tauri::State<'_, RunningOps>,
    path: String,
    message: Option<String>,
    operation_id: Option<String>,
) -> Result<RebaseResult, String> {
    let _guard = locks.acquire(&path).await;

    // Step 1: Amend the commit
    let mut amend_cmd = tokio::process::Command::new("git");
    if let Some(msg) = &message {
        amend_cmd.args(["--no-pager", "-C", &path, "commit", "--amend", "-m", msg]);
    } else {
        amend_cmd.args(["--no-pager", "-C", &path, "commit", "--amend", "--no-edit"]);
    }

    let amend_output = amend_cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run git commit --amend: {}", e))?;

    if !amend_output.status.success() {
        return Err(String::from_utf8_lossy(&amend_output.stderr).to_string());
    }

    // Step 2: Continue rebase
    let mut continue_cmd = tokio::process::Command::new("git");
    continue_cmd.args(["--no-pager", "-C", &path, "rebase", "--continue", "--no-edit"]);

    match operation_id {
        Some(op_id) => {
            let rx = running_ops.spawn(op_id, continue_cmd)?;
            match rx.await.unwrap_or_else(|_| Err("Operation cancelled".into())) {
                Ok(_) => Ok(RebaseResult {
                    success: true,
                    message: "Rebase completed after amend".to_string(),
                    conflicted_files: vec![],
                }),
                Err(stderr) => {
                    let conflicted = parse_rebase_conflicts(&stderr);
                    Ok(RebaseResult {
                        success: conflicted.is_empty(),
                        message: if conflicted.is_empty() {
                            stderr.trim().to_string()
                        } else {
                            "Rebase paused due to conflicts".to_string()
                        },
                        conflicted_files: conflicted,
                    })
                }
            }
        }
        None => {
            let output = continue_cmd
                .output()
                .await
                .map_err(|e| format!("Failed to continue rebase: {}", e))?;

            if output.status.success() {
                Ok(RebaseResult {
                    success: true,
                    message: "Rebase completed after amend".to_string(),
                    conflicted_files: vec![],
                })
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let conflicted = parse_rebase_conflicts(&stderr);
                Ok(RebaseResult {
                    success: conflicted.is_empty(),
                    message: if conflicted.is_empty() {
                        stderr.trim().to_string()
                    } else {
                        "Rebase paused due to conflicts".to_string()
                    },
                    conflicted_files: conflicted,
                })
            }
        }
    }
}
