use std::process::Command;

#[tauri::command]
pub fn git_pull(
    path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "pull".to_string(),
    ];

    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Pull failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub fn git_push(
    path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "push".to_string(),
    ];

    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Push failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub fn git_fetch(path: String, remote: Option<String>) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "fetch".to_string(),
        "--all".to_string(),
    ];

    if let Some(r) = remote {
        args.push(r);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Fetch failed: {}", stderr.trim()))
    }
}

#[derive(serde::Serialize)]
pub struct SyncStatus {
    pub ahead: usize,
    pub behind: usize,
}

#[tauri::command]
pub fn get_sync_status(path: String) -> Result<SyncStatus, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "rev-list",
            "--left-right",
            "--count",
            "HEAD...@{u}",
        ])
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        // If there's no upstream branch, we return 0, 0
        return Ok(SyncStatus {
            ahead: 0,
            behind: 0,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stdout.trim().split_whitespace().collect();
    if parts.len() == 2 {
        let ahead = parts[0].parse::<usize>().unwrap_or(0);
        let behind = parts[1].parse::<usize>().unwrap_or(0);
        Ok(SyncStatus { ahead, behind })
    } else {
        Ok(SyncStatus {
            ahead: 0,
            behind: 0,
        })
    }
}
