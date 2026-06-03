use serde::Serialize;
use tokio::process::Command;
use super::op_lock::RepoLocks;

#[derive(Serialize)]
pub struct MergePreview {
    pub ahead: usize,
    pub behind: usize,
    pub incoming_commits: Vec<MergePreviewCommit>,
    pub changed_files: Vec<MergePreviewFile>,
}

#[derive(Serialize)]
pub struct MergePreviewCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
}

#[derive(Serialize)]
pub struct MergePreviewFile {
    pub path: String,
    pub status: String,
    pub additions: usize,
    pub deletions: usize,
}

#[tauri::command]
pub async fn merge_preview(path: String, branch: String) -> Result<MergePreview, String> {
    // 1. Ahead/behind count
    let rev_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "rev-list", "--left-right", "--count", &format!("HEAD...{}", branch)])
        .output()
        .await
        .map_err(|e| format!("Failed to get ahead/behind: {}", e))?;

    let (ahead, behind) = if rev_output.status.success() {
        let stdout = String::from_utf8_lossy(&rev_output.stdout);
        let parts: Vec<&str> = stdout.trim().split_whitespace().collect();
        if parts.len() == 2 {
            (parts[0].parse::<usize>().unwrap_or(0), parts[1].parse::<usize>().unwrap_or(0))
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    // 2. Incoming commits (commits in branch but not in HEAD)
    let log_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "log", "--oneline", "--format=%H%x00%s%x00%an", &format!("HEAD..{}", branch)])
        .output()
        .await
        .map_err(|e| format!("Failed to get incoming commits: {}", e))?;

    let mut incoming_commits = Vec::new();
    if log_output.status.success() {
        let stdout = String::from_utf8_lossy(&log_output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split('\0').collect();
            if parts.len() >= 3 {
                incoming_commits.push(MergePreviewCommit {
                    hash: parts[0].to_string(),
                    message: parts[1].to_string(),
                    author: parts[2].to_string(),
                });
            }
        }
    }

    // 3. Changed files with stat
    let stat_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "diff", "--numstat", &format!("HEAD...{}", branch)])
        .output()
        .await
        .map_err(|e| format!("Failed to get diff stat: {}", e))?;

    let mut changed_files = Vec::new();
    if stat_output.status.success() {
        let stdout = String::from_utf8_lossy(&stat_output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 3 {
                let additions = parts[0].parse::<usize>().unwrap_or(0);
                let deletions = parts[1].parse::<usize>().unwrap_or(0);
                changed_files.push(MergePreviewFile {
                    path: parts[2].to_string(),
                    status: if additions > 0 && deletions == 0 { "A" } else if additions == 0 && deletions > 0 { "D" } else { "M" }.to_string(),
                    additions,
                    deletions,
                });
            }
        }
    }

    Ok(MergePreview {
        ahead,
        behind,
        incoming_commits,
        changed_files,
    })
}

#[derive(Serialize)]
pub struct MergeResult {
    pub success: bool,
    pub message: String,
    pub conflicted_files: Vec<String>,
}

#[derive(Serialize)]
pub struct MergeStatus {
    pub merging: bool,
    pub conflicts: Vec<String>,
    pub stage_entries: Vec<String>,
}

pub async fn git_merge(
    path: &str,
    branch: &str,
    squash: bool,
    no_ff: bool,
) -> Result<MergeResult, String> {
    let mut args = vec!["--no-pager", "-C", path, "merge", branch];
    if squash {
        args.push("--squash");
    }
    if no_ff {
        args.push("--no-ff");
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to execute git merge: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(MergeResult {
            success: true,
            message: stdout.trim().to_string(),
            conflicted_files: vec![],
        })
    } else {
        // Check for conflicts
        let conflicted = parse_conflicted_files(&stderr);
        Ok(MergeResult {
            success: false,
            message: stderr.trim().to_string(),
            conflicted_files: conflicted,
        })
    }
}

pub async fn git_merge_abort(path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "merge", "--abort"])
        .output()
        .await
        .map_err(|e| format!("Failed to abort merge: {}", e))?;

    if output.status.success() {
        Ok("Merge aborted".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub async fn git_merge_continue(path: &str, message: Option<&str>) -> Result<String, String> {
    let mut args = vec!["--no-pager", "-C", path, "commit"];
    if let Some(msg) = message {
        args.push("-m");
        args.push(msg);
    } else {
        args.push("--no-edit");
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to continue merge: {}", e))?;

    if output.status.success() {
        Ok("Merge completed".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub async fn git_merge_status(path: &str) -> Result<MergeStatus, String> {
    // Check if we're in a merge state
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "rev-parse", "--git-dir"])
        .output()
        .await
        .map_err(|e| format!("Git error: {}", e))?;

    let git_dir = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let merge_head_path = format!("{}/MERGE_HEAD", git_dir);
    let merging = std::path::Path::new(&merge_head_path).exists();

    if !merging {
        return Ok(MergeStatus {
            merging: false,
            conflicts: vec![],
            stage_entries: vec![],
        });
    }

    // Get conflicted files from ls-files -u
    let ls_output = Command::new("git")
        .args(["--no-pager", "-C", path, "ls-files", "-u"])
        .output()
        .await
        .map_err(|e| format!("Git error: {}", e))?;

    let output_str = String::from_utf8_lossy(&ls_output.stdout);
    let mut stage_entries: Vec<String> = vec![];
    let mut conflicts: Vec<String> = vec![];

    // ls-files -u outputs: 100644 2b825ce 1	file.txt
    // stage 1 = ancestor, 2 = ours, 3 = theirs
    for line in output_str.lines() {
        stage_entries.push(line.to_string());
        if let Some(file) = line.split('\t').nth(1) {
            if !conflicts.contains(&file.to_string()) {
                conflicts.push(file.to_string());
            }
        }
    }

    // Also check for unmerged paths in status
    let status_output = Command::new("git")
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
        .map_err(|e| format!("Git error: {}", e))?;

    for line in String::from_utf8_lossy(&status_output.stdout).lines() {
        if line.starts_with("UU") || line.starts_with("AA") || line.starts_with("DD") {
            if let Some(file) = line.get(3..) {
                let file = file.trim().to_string();
                if !conflicts.contains(&file) {
                    conflicts.push(file);
                }
            }
        }
    }

    Ok(MergeStatus {
        merging: true,
        conflicts,
        stage_entries,
    })
}

fn parse_conflicted_files(stderr: &str) -> Vec<String> {
    let mut files = vec![];
    // Typical git merge conflict output:
    // Auto-merging file.txt
    // CONFLICT (content): Merge conflict in file.txt
    for line in stderr.lines() {
        if line.contains("CONFLICT") {
            if let Some(file) = line.split(" in ").nth(1) {
                files.push(file.trim_end_matches(|c| c == '.' || c == ' ').to_string());
            }
        }
    }
    files
}

#[tauri::command]
pub async fn merge_branch(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    branch: String,
    squash: Option<bool>,
    no_ff: Option<bool>,
) -> Result<MergeResult, String> {
    let _guard = locks.acquire(&path).await;
    git_merge(
        &path,
        &branch,
        squash.unwrap_or(false),
        no_ff.unwrap_or(false),
    )
    .await
}

#[tauri::command]
pub async fn merge_abort(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    git_merge_abort(&path).await
}

#[tauri::command]
pub async fn merge_continue(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    message: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    git_merge_continue(&path, message.as_deref()).await
}

#[tauri::command]
pub async fn merge_status(path: String) -> Result<MergeStatus, String> {
    git_merge_status(&path).await
}
