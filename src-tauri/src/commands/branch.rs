use tokio::process::Command;

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

        branches.push(BranchInfo {
            name: clean_name,
            current,
            remote: if is_remote {
                Some("origin".to_string())
            } else {
                None
            },
        });
    }

    branches
}

#[tauri::command]
pub async fn create_branch(
    path: String,
    name: String,
    base_ref: Option<String>,
) -> Result<String, String> {
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
    fn skips_empty_branch_lines() {
        let branches = parse_branch_output("\n  main\n");

        assert_eq!(branches.len(), 1);
        assert_eq!(branches[0].name, "main");
    }
}

#[tauri::command]
pub async fn checkout_branch(path: String, name: String) -> Result<String, String> {
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
    path: String,
    name: String,
    force: Option<bool>,
) -> Result<String, String> {
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
