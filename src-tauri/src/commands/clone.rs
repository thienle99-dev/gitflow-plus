use tokio::process::Command;

#[tauri::command]
pub async fn git_clone(url: String, destination: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["clone", &url, &destination])
        .output()
        .await
        .map_err(|e| format!("Failed to run git clone: {}", e))?;

    if output.status.success() {
        Ok(format!("Cloned {} to {}", url, destination))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Clone failed: {}", stderr.trim()))
    }
}
