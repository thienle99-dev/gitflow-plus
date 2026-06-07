use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct CommitFileChange {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String,
}

#[tauri::command]
pub async fn file_diff(
    path: String,
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
            &file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        if stdout.is_empty() && is_untracked_file(&path, &file_path).await? {
            return untracked_file_diff(path, file_path, context_arg).await;
        }
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}

async fn is_untracked_file(path: &str, file_path: &str) -> Result<bool, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            path,
            "ls-files",
            "--others",
            "--exclude-standard",
            "--",
            file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Untracked file check failed: {}", stderr.trim()));
    }

    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .any(|line| line == file_path))
}

async fn untracked_file_diff(
    path: String,
    file_path: String,
    context_arg: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "diff",
            &context_arg,
            "--no-color",
            "--no-index",
            "--",
            "/dev/null",
            &file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    // `git diff --no-index` exits with 1 when it successfully finds differences.
    let code = output.status.code().unwrap_or(1);
    if code == 0 || code == 1 {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn commit_diff(
    path: String,
    commit_hash: String,
    file_path: Option<String>,
    context: Option<u32>,
) -> Result<String, String> {
    let context_arg = format!("-U{}", context.unwrap_or(3));
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "show".to_string(),
        context_arg,
        "--format=".to_string(),
        "--no-color".to_string(),
        "--find-renames".to_string(),
        commit_hash,
    ];

    if let Some(fp) = file_path {
        args.push("--".to_string());
        args.push(fp);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn commit_changed_files(
    path: String,
    commit_hash: String,
) -> Result<Vec<CommitFileChange>, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "diff-tree",
            "--root",
            "--no-commit-id",
            "--name-status",
            "-r",
            "--find-renames",
            &commit_hash,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Changed files failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let files = stdout.lines().filter_map(parse_name_status_line).collect();

    Ok(files)
}

fn parse_name_status_line(line: &str) -> Option<CommitFileChange> {
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
        return Some(CommitFileChange {
            path: parts[2].to_string(),
            old_path: Some(parts[1].to_string()),
            status: status.to_string(),
        });
    }

    Some(CommitFileChange {
        path: parts[1].to_string(),
        old_path: None,
        status: status.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tokio::process::Command;

    #[test]
    fn parses_name_status_for_basic_file_changes() {
        let added = parse_name_status_line("A\tREADME.md").unwrap();
        assert_eq!(added.path, "README.md");
        assert_eq!(added.old_path, None);
        assert_eq!(added.status, "added");

        let modified = parse_name_status_line("M\tsrc/lib.rs").unwrap();
        assert_eq!(modified.path, "src/lib.rs");
        assert_eq!(modified.status, "modified");

        let deleted = parse_name_status_line("D\told.txt").unwrap();
        assert_eq!(deleted.path, "old.txt");
        assert_eq!(deleted.status, "deleted");
    }

    #[test]
    fn parses_name_status_for_renames_and_copies() {
        let renamed = parse_name_status_line("R100\told.rs\tnew.rs").unwrap();
        assert_eq!(renamed.path, "new.rs");
        assert_eq!(renamed.old_path.as_deref(), Some("old.rs"));
        assert_eq!(renamed.status, "renamed");

        let copied = parse_name_status_line("C075\tsrc/a.rs\tsrc/b.rs").unwrap();
        assert_eq!(copied.path, "src/b.rs");
        assert_eq!(copied.old_path.as_deref(), Some("src/a.rs"));
        assert_eq!(copied.status, "copied");
    }

    #[test]
    fn rejects_malformed_name_status_lines() {
        assert!(parse_name_status_line("").is_none());
        assert!(parse_name_status_line("R100\told.rs").is_none());
    }

    #[tokio::test]
    async fn returns_diff_for_untracked_nested_file() {
        let repo_path = unique_temp_repo_path();
        fs::create_dir_all(repo_path.join("src")).unwrap();

        let init = Command::new("git")
            .arg("init")
            .current_dir(&repo_path)
            .output()
            .await
            .unwrap();
        assert!(init.status.success());

        fs::write(repo_path.join("src/new.txt"), "hello\n").unwrap();

        let diff = file_diff(
            repo_path.to_string_lossy().to_string(),
            "src/new.txt".to_string(),
            None,
        )
        .await
        .unwrap();

        assert!(diff.contains("src/new.txt"));
        assert!(diff.contains("+hello"));

        let _ = fs::remove_dir_all(repo_path);
    }

    fn unique_temp_repo_path() -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!(
            "gitflow-plus-diff-test-{}-{}",
            std::process::id(),
            nanos
        ))
    }
}

#[tauri::command]
pub async fn staged_diff(
    path: String,
    file_path: Option<String>,
    context: Option<u32>,
) -> Result<String, String> {
    let context_arg = format!("-U{}", context.unwrap_or(3));
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "diff".to_string(),
        context_arg,
        "--cached".to_string(),
        "--no-color".to_string(),
    ];

    if let Some(fp) = file_path {
        args.push("--".to_string());
        args.push(fp);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn apply_diff_hunk(
    path: String,
    patch: String,
    action: String,
) -> Result<String, String> {
    let mut args = vec![
        "--no-pager",
        "-C",
        &path,
        "apply",
        "--recount",
        "--whitespace=nowarn",
    ];

    match action.as_str() {
        "stage" => {
            args.push("--cached");
        }
        "unstage" => {
            args.push("--cached");
            args.push("--reverse");
        }
        "discard" => {
            args.push("--reverse");
        }
        _ => return Err(format!("Unsupported hunk action: {}", action)),
    }

    let mut child = Command::new("git")
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to run git apply: {}", e))?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(patch.as_bytes())
            .await
            .map_err(|e| format!("Failed to write patch: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .await
        .map_err(|e| format!("Failed to wait for git apply: {}", e))?;

    if output.status.success() {
        Ok(format!("Applied hunk action '{}'", action))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Apply hunk failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn write_file_content(
    path: String,
    file_path: String,
    content: String,
) -> Result<String, String> {
    let full_path = std::path::Path::new(&path).join(&file_path);
    tokio::fs::write(&full_path, &content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(format!("Wrote {} bytes to {}", content.len(), file_path))
}
