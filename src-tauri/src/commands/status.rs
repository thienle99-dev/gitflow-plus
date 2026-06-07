use tokio::process::Command;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct StatusEntry {
    pub path: String,
    pub staged: bool,
    pub status: String,
}

#[tauri::command]
pub async fn git_status(
    path: String,
    cache_state: tauri::State<'_, crate::RepoCache>,
) -> Result<Vec<StatusEntry>, String> {
    // Check cache
    {
        let cache = cache_state.status_cache.lock().unwrap();
        if let Some(entries) = cache.get(&path) {
            return Ok(entries.clone());
        }
    }

    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "status",
            "--porcelain",
            "--untracked-files=normal",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let entries = parse_status_output(&stdout);

    // Save cache
    {
        let mut cache = cache_state.status_cache.lock().unwrap();
        cache.insert(path, entries.clone());
    }

    Ok(entries)
}

fn parse_status_output(stdout: &str) -> Vec<StatusEntry> {
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

    entries
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_staged_unstaged_and_untracked_status() {
        let entries = parse_status_output(
            " M src/main.rs\nM  src/lib.rs\nA  README.md\nD  old.txt\n?? new.txt\n",
        );

        assert_eq!(entries.len(), 5);
        assert_eq!(entries[0].path, "src/main.rs");
        assert!(!entries[0].staged);
        assert_eq!(entries[0].status, "modified");
        assert_eq!(entries[1].path, "src/lib.rs");
        assert!(entries[1].staged);
        assert_eq!(entries[1].status, "modified");
        assert_eq!(entries[2].status, "added");
        assert_eq!(entries[3].status, "deleted");
        assert_eq!(entries[4].path, "new.txt");
        assert_eq!(entries[4].status, "untracked");
    }

    #[test]
    fn skips_empty_and_malformed_status_lines() {
        let entries = parse_status_output("\nM\n");

        assert!(entries.is_empty());
    }
}
