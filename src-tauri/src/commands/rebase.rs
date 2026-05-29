use std::process::Command;
use std::io::Write;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Clone, Debug)]
pub struct RebaseResult {
    pub success: bool,
    pub message: String,
    pub conflicted_files: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RebaseTodo {
    pub action: String,
    pub commit_hash: String,
    pub message: String,
}

/// Start interactive rebase using GIT_SEQUENCE_EDITOR
/// Writes a shell script that copies the todo list into the rebase todo file
pub fn git_rebase_interactive(path: &str, base: &str, todos: &[RebaseTodo]) -> Result<RebaseResult, String> {
    if todos.is_empty() {
        return Err("No rebase todo items provided".to_string());
    }

    // Generate the todo file content that our fake editor will write
    let todo_content = todos.iter()
        .map(|t| format!("{} {} {}", t.action, t.commit_hash, t.message))
        .collect::<Vec<_>>()
        .join("\n");

    // Write a temp script that copies our content to the rebase todo file
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

    // Make executable
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o755))
        .ok();

    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "rebase", "-i", base, "--no-edit"])
        .env("GIT_SEQUENCE_EDITOR", script_path.to_str().unwrap_or("/bin/true"))
        .output()
        .map_err(|e| format!("Failed to run rebase: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(RebaseResult {
            success: true,
            message: "Rebase completed successfully".to_string(),
            conflicted_files: vec![],
        })
    } else {
        let conflicted = parse_rebase_conflicts(&stderr);
        Ok(RebaseResult {
            success: !conflicted.is_empty(),
            message: if conflicted.is_empty() { stderr.trim().to_string() } else { "Rebase paused due to conflicts".to_string() },
            conflicted_files: conflicted,
        })
    }
}

pub fn git_rebase_continue(path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "rebase", "--continue", "--no-edit"])
        .output()
        .map_err(|e| format!("Failed to continue rebase: {}", e))?;

    if output.status.success() {
        Ok("Rebase continued".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_rebase_skip(path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "rebase", "--skip"])
        .output()
        .map_err(|e| format!("Failed to skip rebase: {}", e))?;

    if output.status.success() {
        Ok("Rebase skipped".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_rebase_abort(path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "rebase", "--abort"])
        .output()
        .map_err(|e| format!("Failed to abort rebase: {}", e))?;

    if output.status.success() {
        Ok("Rebase aborted".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_rebase_status(path: &str) -> Result<(bool, Vec<String>), String> {
    let git_dir_output = Command::new("git")
        .args(["--no-pager", "-C", path, "rev-parse", "--git-dir"])
        .output()
        .map_err(|e| format!("Git error: {}", e))?;

    let git_dir = String::from_utf8_lossy(&git_dir_output.stdout).trim().to_string();
    let rebase_apply = format!("{}/rebase-apply", git_dir);
    let rebase_merge = format!("{}/rebase-merge", git_dir);

    let in_progress = std::path::Path::new(&rebase_apply).exists()
        || std::path::Path::new(&rebase_merge).exists();

    let mut conflicts = vec![];
    if in_progress {
        if let Ok(status_output) = Command::new("git")
            .args(["--no-pager", "-C", path, "status", "--porcelain", "--untracked-files=no"])
            .output()
        {
            for line in String::from_utf8_lossy(&status_output.stdout).lines() {
                if (line.starts_with("UU") || line.starts_with("AA") || line.starts_with("DD")) {
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
pub fn git_rebase_todo_range(path: &str, base: &str) -> Result<Vec<RebaseTodo>, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "log",
               "--reverse", "--pretty=format:%H|%s",
               format!("{}..HEAD", base).as_str()])
        .output()
        .map_err(|e| format!("Failed to list commits: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let todos = stdout.lines()
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
pub fn rebase_start(path: String, base: String, todos: Vec<RebaseTodo>) -> Result<RebaseResult, String> {
    git_rebase_interactive(&path, &base, &todos)
}

#[tauri::command]
pub fn rebase_continue(path: String) -> Result<String, String> {
    git_rebase_continue(&path)
}

#[tauri::command]
pub fn rebase_skip(path: String) -> Result<String, String> {
    git_rebase_skip(&path)
}

#[tauri::command]
pub fn rebase_abort(path: String) -> Result<String, String> {
    git_rebase_abort(&path)
}

#[tauri::command]
pub fn rebase_status(path: String) -> Result<(bool, Vec<String>), String> {
    git_rebase_status(&path)
}

#[tauri::command]
pub fn rebase_todo_list(path: String, base: String) -> Result<Vec<RebaseTodo>, String> {
    git_rebase_todo_range(&path, &base)
}
