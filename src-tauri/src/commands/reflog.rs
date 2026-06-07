use serde::Serialize;
use tokio::process::Command;
use super::op_lock::RepoLocks;

#[derive(Serialize)]
pub struct ReflogEntry {
    pub index: u32,
    pub commit_hash: String,
    pub action: String,
    pub description: String,
    pub date: String,
}

pub async fn git_reflog(path: &str, max_count: Option<u32>) -> Result<Vec<ReflogEntry>, String> {
    let count_str = max_count.map(|max| format!("-{}", max));
    let mut args = vec![
        "--no-pager",
        "-C",
        path,
        "reflog",
        "--pretty=format:%gd|%H|%gs|%ci",
    ];
    if let Some(ref s) = count_str {
        args.push(s);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to read reflog: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_reflog_output(&stdout))
}

fn parse_reflog_output(stdout: &str) -> Vec<ReflogEntry> {
    stdout
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(4, '|').collect();
            if parts.len() >= 3 {
                let ref_name = parts[0].trim();
                let index_str = ref_name.trim_start_matches("HEAD@{").trim_end_matches('}');
                let index: u32 = index_str.parse().unwrap_or(0);
                let action = classify_reflog_action(parts[2]);
                Some(ReflogEntry {
                    index,
                    commit_hash: parts[1].to_string(),
                    action,
                    description: parts[2].to_string(),
                    date: parts.get(3).unwrap_or(&"").to_string(),
                })
            } else {
                None
            }
        })
        .collect()
}

pub async fn git_undo(path: &str) -> Result<String, String> {
    // Undo last commit: git reset --soft HEAD~1
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "reset", "--soft", "HEAD~1"])
        .output()
        .await
        .map_err(|e| format!("Failed to undo: {}", e))?;

    if output.status.success() {
        Ok("Undo successful (reset --soft HEAD~1)".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("ambiguous argument") {
            Err("No commits to undo".to_string())
        } else {
            Err(stderr.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_reflog_entries_and_classifies_actions() {
        let entries = parse_reflog_output(
            "HEAD@{0}|abc123|commit: add parser tests|2026-06-01 09:00:00 +0700\nHEAD@{2}|def456|checkout: moving from main to feature|2026-06-01 08:00:00 +0700\n",
        );

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].index, 0);
        assert_eq!(entries[0].commit_hash, "abc123");
        assert_eq!(entries[0].action, "commit");
        assert_eq!(entries[0].description, "commit: add parser tests");
        assert_eq!(entries[1].index, 2);
        assert_eq!(entries[1].action, "checkout");
    }

    #[test]
    fn classifies_known_reflog_actions() {
        assert_eq!(classify_reflog_action("reset: moving to HEAD~1"), "reset");
        assert_eq!(
            classify_reflog_action("merge feature: Fast-forward"),
            "merge"
        );
        assert_eq!(
            classify_reflog_action("cherry-pick: fix bug"),
            "cherry-pick"
        );
        assert_eq!(
            classify_reflog_action("commit (amend): update message"),
            "commit"
        );
        assert_eq!(classify_reflog_action("unknown action"), "other");
    }
}

fn classify_reflog_action(description: &str) -> String {
    if description.starts_with("commit") {
        "commit".to_string()
    } else if description.starts_with("reset") {
        "reset".to_string()
    } else if description.starts_with("checkout") {
        "checkout".to_string()
    } else if description.starts_with("merge") {
        "merge".to_string()
    } else if description.starts_with("rebase") {
        "rebase".to_string()
    } else if description.starts_with("cherry-pick") || description.starts_with("cherry pick") {
        "cherry-pick".to_string()
    } else if description.starts_with("pull") {
        "pull".to_string()
    } else if description.starts_with("amend") || description.contains("--amend") {
        "amend".to_string()
    } else {
        "other".to_string()
    }
}

#[tauri::command]
pub async fn reflog_list(path: String, max_count: Option<u32>) -> Result<Vec<ReflogEntry>, String> {
    git_reflog(&path, max_count).await
}

#[tauri::command]
pub async fn undo_last(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    git_undo(&path).await
}

/// Restore working tree + index to match a specific commit (hard reset).
/// Uses `git reset --hard <hash>` — destructive to uncommitted changes.
pub async fn git_restore_to_commit(path: &str, hash: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "reset", "--hard", hash])
        .output()
        .await
        .map_err(|e| format!("Failed to restore: {}", e))?;

    if output.status.success() {
        Ok(format!("Restored to {}", hash))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn restore_to_commit(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    hash: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    git_restore_to_commit(&path, &hash).await
}
