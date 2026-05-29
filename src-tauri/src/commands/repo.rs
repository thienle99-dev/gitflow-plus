use std::path::Path;
use std::process::Command;

#[derive(serde::Serialize)]
pub struct RepoInfo {
    pub path: String,
    pub current_branch: String,
    pub remote: Option<String>,
}

#[tauri::command]
pub fn open_repo(path: String) -> Result<RepoInfo, String> {
    let git_dir = Path::new(&path).join(".git");
    if !git_dir.exists() {
        return Err("Not a git repository".to_string());
    }
    get_repo_info_inner(&path)
}

#[tauri::command]
pub fn get_repo_info(path: String) -> Result<RepoInfo, String> {
    get_repo_info_inner(&path)
}

fn get_repo_info_inner(path: &str) -> Result<RepoInfo, String> {
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
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    let branch = lines.first().unwrap_or(&"unknown").to_string();
    let root = lines.get(1).unwrap_or(&path).to_string();

    // Get remote URL
    let remote_output = Command::new("git")
        .args(["--no-pager", "-C", path, "remote", "get-url", "origin"])
        .output()
        .ok();
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
