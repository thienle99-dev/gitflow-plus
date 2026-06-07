use tokio::process::Command;
use std::path::PathBuf;
use serde::Serialize;
use super::op_lock::RepoLocks;

#[derive(Serialize)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
}

#[derive(Serialize)]
pub struct SshKeyInfo {
    pub key_type: String,
    pub file_name: String,
    pub path: String,
    pub readable: bool,
}

#[tauri::command]
pub async fn detect_ssh_keys() -> Result<Vec<SshKeyInfo>, String> {
    let home = std::env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| "Cannot determine home directory (HOME env not set)".to_string())?;
    let ssh_dir = home.join(".ssh");

    if !ssh_dir.exists() || !ssh_dir.is_dir() {
        return Ok(vec![]);
    }

    let known_types = ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"];
    let mut keys: Vec<SshKeyInfo> = vec![];

    let mut entries = tokio::fs::read_dir(&ssh_dir)
        .await
        .map_err(|e| format!("Failed to read ~/.ssh: {}", e))?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let file_name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();

        // Skip public keys, config, known_hosts, etc.
        if file_name.ends_with(".pub")
            || file_name == "known_hosts"
            || file_name == "config"
            || file_name == "authorized_keys"
            || file_name == "known_hosts2"
        {
            continue;
        }

        // Check if it matches a known private key type
        let key_type = known_types.iter().find(|t| file_name.starts_with(*t));
        if let Some(kt) = key_type {
            let readable = entry.metadata().await.map(|m| m.len() > 0).unwrap_or(false);
            keys.push(SshKeyInfo {
                key_type: kt.to_string(),
                file_name,
                path: path.to_string_lossy().to_string(),
                readable,
            });
        }
    }

    // Sort by key type for consistent ordering
    keys.sort_by(|a, b| a.key_type.cmp(&b.key_type));
    Ok(keys)
}

#[tauri::command]
pub async fn detect_remote_protocol(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "remote", "get-url", "origin"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Ok("unknown".to_string());
    }

    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if url.starts_with("git@") || url.contains("ssh://") {
        Ok("ssh".to_string())
    } else if url.starts_with("https://") || url.starts_with("http://") {
        Ok("https".to_string())
    } else {
        Ok("unknown".to_string())
    }
}

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

/// Temporarily embed credentials into the remote URL for HTTPS authentication.
/// Returns the original URL so it can be restored after the operation.
#[tauri::command]
pub async fn set_temp_credentials(
    path: String,
    username: String,
    password: String,
    remote: Option<String>,
) -> Result<String, String> {
    let remote_name = remote.unwrap_or_else(|| "origin".to_string());

    // Get current URL
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "remote", "get-url", &remote_name])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err("Failed to get remote URL".to_string());
    }

    let original_url = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Only modify HTTPS URLs
    if !original_url.starts_with("https://") && !original_url.starts_with("http://") {
        return Err("Credentials can only be set for HTTPS remotes".to_string());
    }

    // Insert credentials into URL: https://user:pass@github.com/...
    let cred_url = match original_url.strip_prefix("https://") {
        Some(rest) => format!("https://{}:{}@{}", username, password, rest),
        None => return Err("Invalid HTTPS URL".to_string()),
    };

    // Set the new URL
    let set_output = Command::new("git")
        .args(["-C", &path, "remote", "set-url", &remote_name, &cred_url])
        .output()
        .await
        .map_err(|e| format!("Failed to set remote URL: {}", e))?;

    if !set_output.status.success() {
        let stderr = String::from_utf8_lossy(&set_output.stderr);
        return Err(format!("Failed to set credentials: {}", stderr.trim()));
    }

    Ok(original_url)
}

/// Restore a remote URL to its original value (strip embedded credentials).
#[tauri::command]
pub async fn restore_remote_url(
    path: String,
    original_url: String,
    remote: Option<String>,
) -> Result<(), String> {
    let remote_name = remote.unwrap_or_else(|| "origin".to_string());

    let output = Command::new("git")
        .args(["-C", &path, "remote", "set-url", &remote_name, &original_url])
        .output()
        .await
        .map_err(|e| format!("Failed to restore remote URL: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to restore URL: {}", stderr.trim()));
    }

    Ok(())
}

// ─── Remote management (list, add, remove, rename, set-url) ─────────────

#[tauri::command]
pub async fn list_remotes(path: String) -> Result<Vec<RemoteInfo>, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "remote", "-v"])
        .output()
        .await
        .map_err(|e| format!("Failed to list remotes: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut remotes: Vec<RemoteInfo> = vec![];
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(3, '\t').collect();
        if parts.len() >= 2 {
            let name = parts[0].to_string();
            let url = parts[1].trim_end_matches(" (fetch)").trim_end_matches(" (push)").to_string();
            if !remotes.iter().any(|r| r.name == name) {
                remotes.push(RemoteInfo { name, url });
            }
        }
    }
    Ok(remotes)
}

#[tauri::command]
pub async fn add_remote(path: String, name: String, url: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["-C", &path, "remote", "add", &name, &url])
        .output()
        .await
        .map_err(|e| format!("Failed to add remote: {}", e))?;

    if output.status.success() {
        Ok(format!("Added remote {} ({})", name, url))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn remove_remote(path: String, name: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["-C", &path, "remote", "remove", &name])
        .output()
        .await
        .map_err(|e| format!("Failed to remove remote: {}", e))?;

    if output.status.success() {
        Ok(format!("Removed remote {}", name))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn rename_remote(path: String, old_name: String, new_name: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["-C", &path, "remote", "rename", &old_name, &new_name])
        .output()
        .await
        .map_err(|e| format!("Failed to rename remote: {}", e))?;

    if output.status.success() {
        Ok(format!("Renamed remote {} -> {}", old_name, new_name))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn set_remote_url(path: String, name: String, url: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["-C", &path, "remote", "set-url", &name, &url])
        .output()
        .await
        .map_err(|e| format!("Failed to set remote URL: {}", e))?;

    if output.status.success() {
        Ok(format!("Updated {} URL -> {}", name, url))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
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
