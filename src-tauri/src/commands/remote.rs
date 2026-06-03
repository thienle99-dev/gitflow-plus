use tokio::process::Command;
use super::op_lock::RepoLocks;

#[tauri::command]
pub async fn git_pull(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
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
        .await
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
pub async fn git_push(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
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
        .await
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
pub async fn git_fetch(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    remote: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
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
        .await
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
pub async fn get_sync_status(path: String) -> Result<SyncStatus, String> {
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
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        // If there's no upstream branch, we return 0, 0
        return Ok(SyncStatus {
            ahead: 0,
            behind: 0,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_sync_status_output(&stdout))
}

fn parse_sync_status_output(stdout: &str) -> SyncStatus {
    let parts: Vec<&str> = stdout.trim().split_whitespace().collect();
    if parts.len() == 2 {
        let ahead = parts[0].parse::<usize>().unwrap_or(0);
        let behind = parts[1].parse::<usize>().unwrap_or(0);
        SyncStatus { ahead, behind }
    } else {
        SyncStatus {
            ahead: 0,
            behind: 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_sync_status_counts() {
        let status = parse_sync_status_output("3\t7\n");

        assert_eq!(status.ahead, 3);
        assert_eq!(status.behind, 7);
    }

    #[test]
    fn defaults_invalid_sync_status_to_zero() {
        let status = parse_sync_status_output("not-counts\n");

        assert_eq!(status.ahead, 0);
        assert_eq!(status.behind, 0);
    }
}
