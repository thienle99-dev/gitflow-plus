use tokio::process::Command;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct StatusEntry {
    pub path: String,
    pub staged: bool,
    pub status: String,
}

#[tauri::command]
pub async fn git_status(path: String) -> Result<Vec<StatusEntry>, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "status",
            "--porcelain",
            "--untracked-files=normal",
            "--no-ahead-behind",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut entries: Vec<StatusEntry> = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() || line.len() < 3 {
            continue;
        }
        let x = line.chars().nth(0).unwrap_or(' ');
        let y = line.chars().nth(1).unwrap_or(' ');
        let file_path = &line[3..];

        let staged = x != ' ' && x != '?';
        let status = match (x, y) {
            ('M', _) if staged => "modified",
            (_, 'M') => "modified",
            ('A', _) => "added",
            ('D', _) => "deleted",
            (_, 'D') => "deleted",
            ('R', _) => "renamed",
            ('?', _) => "untracked",
            _ => "modified",
        };

        entries.push(StatusEntry {
            path: file_path.to_string(),
            staged,
            status: status.to_string(),
        });
    }

    Ok(entries)
}
