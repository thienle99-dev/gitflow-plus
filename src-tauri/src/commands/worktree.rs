use serde::Serialize;
use tokio::process::Command;

#[derive(Serialize, Clone, Debug)]
pub struct WorktreeInfo {
    pub path: String,
    pub head: String,
    pub branch: Option<String>,
    pub is_locked: bool,
    pub is_bare: bool,
    pub is_prunable: bool,
    pub is_current: bool,
}

fn parse_worktree_porcelain(output: &str, repo_path: &str) -> Vec<WorktreeInfo> {
    let mut worktrees = Vec::new();
    let mut blocks = output.split("\n\n");

    while let Some(block) = blocks.next() {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        let mut path = String::new();
        let mut head = String::new();
        let mut branch = None;
        let mut is_locked = false;
        let mut is_bare = false;
        let mut is_prunable = false;

        for line in block.lines() {
            if let Some(val) = line.strip_prefix("worktree ") {
                path = val.to_string();
            } else if let Some(val) = line.strip_prefix("HEAD ") {
                head = val.to_string();
            } else if let Some(val) = line.strip_prefix("branch ") {
                branch = Some(val.strip_prefix("refs/heads/").unwrap_or(val).to_string());
            } else if line == "locked" {
                is_locked = true;
            } else if line == "bare" {
                is_bare = true;
            } else if line == "prunable" {
                is_prunable = true;
            }
        }

        if !path.is_empty() {
            let is_current = path == repo_path
                || std::path::Path::new(&path)
                    .canonicalize()
                    .ok()
                    .and_then(|p| std::path::Path::new(repo_path).canonicalize().ok().map(|r| p == r))
                    .unwrap_or(false);

            worktrees.push(WorktreeInfo {
                path,
                head,
                branch,
                is_locked,
                is_bare,
                is_prunable,
                is_current,
            });
        }
    }

    worktrees
}

#[tauri::command]
pub async fn worktree_list(path: String) -> Result<Vec<WorktreeInfo>, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "worktree", "list", "--porcelain"])
        .output()
        .await
        .map_err(|e| format!("Failed to list worktrees: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_worktree_porcelain(&stdout, &path))
}

#[tauri::command]
pub async fn worktree_add(
    path: String,
    target_path: String,
    branch: Option<String>,
    new_branch: Option<String>,
) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.clone(),
        "worktree".to_string(),
        "add".to_string(),
    ];

    if let Some(nb) = new_branch {
        args.push("-b".to_string());
        args.push(nb);
    }

    args.push(target_path.clone());

    if let Some(b) = branch {
        args.push(b);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to add worktree: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn worktree_remove(
    path: String,
    worktree_path: String,
    force: Option<bool>,
) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.clone(),
        "worktree".to_string(),
        "remove".to_string(),
    ];

    if force.unwrap_or(false) {
        args.push("--force".to_string());
    }

    args.push(worktree_path.clone());

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to remove worktree: {}", e))?;

    if output.status.success() {
        Ok(format!("Removed worktree {}", worktree_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn worktree_lock(
    path: String,
    worktree_path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "worktree", "lock", &worktree_path])
        .output()
        .await
        .map_err(|e| format!("Failed to lock worktree: {}", e))?;

    if output.status.success() {
        Ok(format!("Locked worktree {}", worktree_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn worktree_unlock(
    path: String,
    worktree_path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "worktree", "unlock", &worktree_path])
        .output()
        .await
        .map_err(|e| format!("Failed to unlock worktree: {}", e))?;

    if output.status.success() {
        Ok(format!("Unlocked worktree {}", worktree_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn worktree_prune(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "worktree", "prune"])
        .output()
        .await
        .map_err(|e| format!("Failed to prune worktrees: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            Ok("No stale worktrees to prune".to_string())
        } else {
            Ok(stdout)
        }
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_single_worktree() {
        let input = "worktree /path/to/main\nHEAD abc123\nbranch refs/heads/main\n";
        let result = parse_worktree_porcelain(input, "/path/to/main");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/path/to/main");
        assert_eq!(result[0].head, "abc123");
        assert_eq!(result[0].branch.as_deref(), Some("main"));
        assert!(!result[0].is_locked);
        assert!(!result[0].is_bare);
    }

    #[test]
    fn parses_multiple_worktrees_with_locked() {
        let input = "\
worktree /path/to/main
HEAD abc123
branch refs/heads/main

worktree /path/to/feature
HEAD def456
branch refs/heads/feature
locked
";
        let result = parse_worktree_porcelain(input, "/path/to/main");
        assert_eq!(result.len(), 2);
        assert!(!result[0].is_locked);
        assert!(result[1].is_locked);
        assert_eq!(result[1].branch.as_deref(), Some("feature"));
    }

    #[test]
    fn parses_bare_and_prunable() {
        let input = "\
worktree /path/to/bare
HEAD 0000000000000000000000000000000000000000
bare

worktree /path/to/stale
HEAD ghi789
branch refs/heads/old
prunable
";
        let result = parse_worktree_porcelain(input, "/path/to/main");
        assert_eq!(result.len(), 2);
        assert!(result[0].is_bare);
        assert!(result[1].is_prunable);
    }

    #[test]
    fn handles_empty_output() {
        let result = parse_worktree_porcelain("", "/path/to/main");
        assert!(result.is_empty());
    }

    #[test]
    fn strips_refs_heads_prefix() {
        let input = "worktree /repo\nHEAD abc\nbranch refs/heads/develop\n";
        let result = parse_worktree_porcelain(input, "/repo");
        assert_eq!(result[0].branch.as_deref(), Some("develop"));
    }
}
