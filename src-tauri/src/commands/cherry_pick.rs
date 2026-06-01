use serde::Serialize;
use tokio::process::Command;

#[derive(Serialize)]
pub struct CherryPickResult {
    pub success: bool,
    pub message: String,
    pub conflicted_files: Vec<String>,
}

pub async fn git_cherry_pick(
    path: &str,
    commit_hash: &str,
    no_commit: bool,
) -> Result<CherryPickResult, String> {
    let mut args = vec!["--no-pager", "-C", path, "cherry-pick"];

    if no_commit {
        args.push("--no-commit");
    }
    args.push(commit_hash);

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to cherry-pick: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(CherryPickResult {
            success: true,
            message: String::from_utf8_lossy(&output.stdout).trim().to_string(),
            conflicted_files: vec![],
        })
    } else {
        let conflicted = parse_cherry_pick_conflicts(&stderr);
        Ok(CherryPickResult {
            success: false,
            message: stderr,
            conflicted_files: conflicted,
        })
    }
}

pub async fn git_cherry_pick_abort(path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "cherry-pick", "--abort"])
        .output()
        .await
        .map_err(|e| format!("Failed to abort cherry-pick: {}", e))?;

    if output.status.success() {
        Ok("Cherry-pick aborted".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn parse_cherry_pick_conflicts(stderr: &str) -> Vec<String> {
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
pub async fn cherry_pick(
    path: String,
    commit_hash: String,
    no_commit: Option<bool>,
) -> Result<CherryPickResult, String> {
    git_cherry_pick(&path, &commit_hash, no_commit.unwrap_or(false)).await
}

#[tauri::command]
pub async fn cherry_pick_abort(path: String) -> Result<String, String> {
    git_cherry_pick_abort(&path).await
}
