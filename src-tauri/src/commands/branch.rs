use tokio::process::Command;
use super::op_lock::RepoLocks;

#[derive(serde::Serialize, Clone, Debug)]
pub struct BranchInfo {
    pub name: String,
    pub current: bool,
    pub remote: Option<String>,
}

#[tauri::command]
pub async fn list_branches(path: String) -> Result<Vec<BranchInfo>, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "branch", "-a"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_branch_output(&stdout))
}

fn parse_branch_output(stdout: &str) -> Vec<BranchInfo> {
    let mut branches: Vec<BranchInfo> = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }
        let current = line.starts_with('*');
        let name = if current { &line[2..] } else { &line[2..] };
        let name = name.trim();

        let is_remote = name.starts_with("remotes/");
        let clean_name = if is_remote {
            name.strip_prefix("remotes/").unwrap_or(name).to_string()
        } else {
            name.to_string()
        };

        // Extract actual remote name from "remote/branch" path
        let remote_name = if is_remote {
            clean_name.split('/').next().map(|s| s.to_string())
        } else {
            None
        };

        branches.push(BranchInfo {
            name: clean_name,
            current,
            remote: remote_name,
        });
    }

    branches
}

#[tauri::command]
pub async fn create_branch(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    name: String,
    base_ref: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "branch".to_string(),
        name,
    ];
    if let Some(base) = base_ref {
        args.push(base);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok("Branch created".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to create branch: {}", stderr.trim()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_local_and_remote_branches() {
        let branches = parse_branch_output(
            "  feature/search\n* main\n  remotes/origin/main\n  remotes/origin/feature/search\n",
        );

        assert_eq!(branches.len(), 4);
        assert_eq!(branches[0].name, "feature/search");
        assert!(!branches[0].current);
        assert!(branches[0].remote.is_none());
        assert_eq!(branches[1].name, "main");
        assert!(branches[1].current);
        assert_eq!(branches[2].name, "origin/main");
        assert_eq!(branches[2].remote.as_deref(), Some("origin"));
    }

    #[test]
    fn parses_multiple_remotes() {
        let branches = parse_branch_output(
            "* main\n  remotes/origin/main\n  remotes/origin/develop\n  remotes/upstream/main\n  remotes/fork/feature\n",
        );

        assert_eq!(branches.len(), 5);
        assert_eq!(branches[1].remote.as_deref(), Some("origin"));
        assert_eq!(branches[2].remote.as_deref(), Some("origin"));
        assert_eq!(branches[3].remote.as_deref(), Some("upstream"));
        assert_eq!(branches[4].remote.as_deref(), Some("fork"));
    }

    #[test]
    fn skips_empty_branch_lines() {
        let branches = parse_branch_output("\n  main\n");

        assert_eq!(branches.len(), 1);
        assert_eq!(branches[0].name, "main");
    }
}

#[tauri::command]
pub async fn checkout_branch(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    name: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "checkout".to_string(),
        name.clone(),
    ];

    // Check if it's a remote branch
    if name.contains('/') && !name.starts_with("remotes/") {
        // Try to checkout local first, then try remote tracking
        let local_check = Command::new("git")
            .args(&["--no-pager", "-C", &args[2], "checkout", &name])
            .output()
            .await
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if local_check.status.success() {
            return Ok(format!("Switched to branch '{}'", name));
        }

        // Try remote tracking branch
        let parts: Vec<&str> = name.splitn(2, '/').collect();
        if parts.len() == 2 {
            args = vec![
                "--no-pager".to_string(),
                "-C".to_string(),
                args[2].clone(),
                "checkout".to_string(),
                "-b".to_string(),
                parts[1].to_string(),
                format!("{}/{}", parts[0], parts[1]),
            ];
        }
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(format!("Switched to branch '{}'", name))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to checkout: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn delete_branch(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    name: String,
    force: Option<bool>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    let flag = if force.unwrap_or(false) { "-D" } else { "-d" };
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "branch", flag, &name])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(format!("Deleted branch '{}'", name))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to delete branch: {}", stderr.trim()))
    }
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct BranchComparison {
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<BranchFileChange>,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct BranchFileChange {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String,
}

#[tauri::command]
pub async fn compare_branches(
    path: String,
    base: String,
    target: String,
) -> Result<BranchComparison, String> {
    // Get ahead/behind counts
    let rev_list = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "rev-list",
            "--left-right",
            "--count",
            &format!("{}...{}", base, target),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    let (ahead, behind) = if rev_list.status.success() {
        let stdout = String::from_utf8_lossy(&rev_list.stdout);
        let parts: Vec<&str> = stdout.trim().split_whitespace().collect();
        if parts.len() == 2 {
            (
                parts[0].parse::<usize>().unwrap_or(0),
                parts[1].parse::<usize>().unwrap_or(0),
            )
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    // Get changed files between the two refs
    let diff = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "diff",
            "--name-status",
            "-r",
            "--find-renames",
            &format!("{}...{}", base, target),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    let files = if diff.status.success() {
        let stdout = String::from_utf8_lossy(&diff.stdout);
        parse_branch_file_changes(&stdout)
    } else {
        Vec::new()
    };

    Ok(BranchComparison {
        ahead,
        behind,
        files,
    })
}

fn parse_branch_file_changes(stdout: &str) -> Vec<BranchFileChange> {
    stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() < 2 {
                return None;
            }
            let raw_status = parts[0];
            let status = match raw_status.chars().next().unwrap_or('M') {
                'A' => "added",
                'D' => "deleted",
                'R' => "renamed",
                'C' => "copied",
                'M' => "modified",
                'T' => "typechange",
                'U' => "unmerged",
                _ => "modified",
            };

            if raw_status.starts_with('R') || raw_status.starts_with('C') {
                if parts.len() < 3 {
                    return None;
                }
                Some(BranchFileChange {
                    path: parts[2].to_string(),
                    old_path: Some(parts[1].to_string()),
                    status: status.to_string(),
                })
            } else {
                Some(BranchFileChange {
                    path: parts[1].to_string(),
                    old_path: None,
                    status: status.to_string(),
                })
            }
        })
        .collect()
}

#[tauri::command]
pub async fn branch_file_diff(
    path: String,
    base: String,
    target: String,
    file_path: String,
    context: Option<u32>,
) -> Result<String, String> {
    let context_arg = format!("-U{}", context.unwrap_or(3));
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "diff",
            &context_arg,
            "--no-color",
            "--find-renames",
            &format!("{}...{}", base, target),
            "--",
            &file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}

#[cfg(test)]
mod compare_tests {
    use super::*;

    #[test]
    fn parses_branch_file_changes() {
        let input = "M\tsrc/main.rs\nA\tREADME.md\nR100\told.rs\tnew.rs\nD\tremoved.txt\n";
        let files = parse_branch_file_changes(input);
        assert_eq!(files.len(), 4);
        assert_eq!(files[0].path, "src/main.rs");
        assert_eq!(files[0].status, "modified");
        assert_eq!(files[1].path, "README.md");
        assert_eq!(files[1].status, "added");
        assert_eq!(files[2].path, "new.rs");
        assert_eq!(files[2].old_path.as_deref(), Some("old.rs"));
        assert_eq!(files[2].status, "renamed");
        assert_eq!(files[3].path, "removed.txt");
        assert_eq!(files[3].status, "deleted");
    }

    #[test]
    fn handles_empty_diff_output() {
        let files = parse_branch_file_changes("");
        assert_eq!(files.len(), 0);
    }
}
