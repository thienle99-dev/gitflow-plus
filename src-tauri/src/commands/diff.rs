use std::io::Write;
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
pub async fn file_diff(path: String, file_path: String, context: Option<u32>) -> Result<String, String> {
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
        .output().await
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
        .output().await
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
        .output().await
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
        .output().await
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
pub async fn apply_diff_hunk(path: String, patch: String, action: String) -> Result<String, String> {
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