use std::process::Command;
use serde::Serialize;

#[derive(Serialize)]
pub struct ReflogEntry {
    pub index: u32,
    pub commit_hash: String,
    pub action: String,
    pub description: String,
    pub date: String,
}

pub fn git_reflog(path: &str, max_count: Option<u32>) -> Result<Vec<ReflogEntry>, String> {
    let count_str = max_count.map(|max| format!("-{}", max));
    let mut args = vec![
        "--no-pager", "-C", path, "reflog",
        "--pretty=format:%gd|%H|%gs|%ci",
    ];
    if let Some(ref s) = count_str { args.push(s); }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to read reflog: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let entries = stdout.lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(4, '|').collect();
            if parts.len() >= 3 {
                let ref_name = parts[0].trim();
                let index_str = ref_name.trim_start_matches("HEAD@{")
                    .trim_end_matches('}');
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
        .collect();

    Ok(entries)
}

pub fn git_undo(path: &str) -> Result<String, String> {
    // Undo last commit: git reset --soft HEAD~1
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "reset", "--soft", "HEAD~1"])
        .output()
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
pub fn reflog_list(path: String, max_count: Option<u32>) -> Result<Vec<ReflogEntry>, String> {
    git_reflog(&path, max_count)
}

#[tauri::command]
pub fn undo_last(path: String) -> Result<String, String> {
    git_undo(&path)
}
