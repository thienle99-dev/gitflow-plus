use std::path::Path;
use tokio::process::Command;

#[derive(serde::Serialize)]
pub struct RepoInfo {
    pub path: String,
    pub current_branch: String,
    pub remote: Option<String>,
}

#[tauri::command]
pub async fn open_repo(path: String) -> Result<RepoInfo, String> {
    let git_dir = Path::new(&path).join(".git");
    if !git_dir.exists() {
        return Err("Not a git repository".to_string());
    }
    get_repo_info_inner(&path).await
}

#[tauri::command]
pub async fn get_repo_info(path: String) -> Result<RepoInfo, String> {
    get_repo_info_inner(&path).await
}

async fn get_repo_info_inner(path: &str) -> Result<RepoInfo, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            path,
            "rev-parse",
            "--abbrev-ref",
            "HEAD",
            "--show-toplevel",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    let branch = lines.first().unwrap_or(&"unknown").to_string();
    let root = lines.get(1).unwrap_or(&path).to_string();

    // Get remote URL. Prefer origin, but fall back to the first configured remote.
    let mut remote_output = Command::new("git")
        .args(["--no-pager", "-C", path, "remote", "get-url", "origin"])
        .output()
        .await
        .ok();

    if !remote_output.as_ref().is_some_and(|o| o.status.success()) {
        let first_remote = Command::new("git")
            .args(["--no-pager", "-C", path, "remote"])
            .output()
            .await
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    String::from_utf8_lossy(&o.stdout)
                        .lines()
                        .next()
                        .map(str::to_string)
                } else {
                    None
                }
            });

        if let Some(remote_name) = first_remote {
            remote_output = Command::new("git")
                .args(["--no-pager", "-C", path, "remote", "get-url", &remote_name])
                .output()
                .await
                .ok();
        }
    }

    let remote = remote_output.and_then(|o| {
        if o.status.success() {
            Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
        } else {
            None
        }
    });

    Ok(RepoInfo {
        path: root,
        current_branch: branch,
        remote,
    })
}
