use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct StashEntry {
    pub index: u32,
    pub message: String,
    pub branch: String,
}

pub fn git_stash_list(path: &str) -> Result<Vec<StashEntry>, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            path,
            "stash",
            "list",
            "--pretty=format:%gd|%gs|%an",
        ])
        .output()
        .map_err(|e| format!("Failed to list stashes: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // "no stash found" is not an error
        if stderr.contains("no stash found") {
            return Ok(vec![]);
        }
        return Err(stderr.to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let entries = stdout
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(3, '|').collect();
            if parts.len() >= 2 {
                let ref_name = parts[0].trim();
                let index = ref_name
                    .trim_start_matches("stash@{")
                    .trim_end_matches('}')
                    .parse::<u32>()
                    .unwrap_or(0);
                Some(StashEntry {
                    index,
                    message: parts[1].trim().to_string(),
                    branch: parts.get(2).unwrap_or(&"").trim().to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(entries)
}

pub fn git_stash_push(
    path: &str,
    message: Option<&str>,
    include_untracked: bool,
) -> Result<String, String> {
    let mut args = vec!["--no-pager", "-C", path, "stash", "push"];
    if include_untracked {
        args.push("--include-untracked");
    }
    if let Some(msg) = message {
        args.push("-m");
        args.push(msg);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to stash: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_stash_pop(path: &str, index: Option<u32>) -> Result<String, String> {
    let stash_ref = index.map(|idx| format!("stash@{{{}}}", idx));
    let mut args = vec!["--no-pager", "-C", path, "stash", "pop"];
    if let Some(ref s) = stash_ref {
        args.push(s);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to pop stash: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_stash_apply(path: &str, index: Option<u32>) -> Result<String, String> {
    let stash_ref = index.map(|idx| format!("stash@{{{}}}", idx));
    let mut args = vec!["--no-pager", "-C", path, "stash", "apply"];
    if let Some(ref s) = stash_ref {
        args.push(s);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to apply stash: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_stash_drop(path: &str, index: Option<u32>) -> Result<String, String> {
    let stash_ref = index.map(|idx| format!("stash@{{{}}}", idx));
    let mut args = vec!["--no-pager", "-C", path, "stash", "drop"];
    if let Some(ref s) = stash_ref {
        args.push(s);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to drop stash: {}", e))?;

    if output.status.success() {
        Ok(format!("Dropped stash@{{{}}}", index.unwrap_or(0)))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Tauri commands
#[tauri::command]
pub fn stash_list(path: String) -> Result<Vec<StashEntry>, String> {
    git_stash_list(&path)
}

#[tauri::command]
pub fn stash_push(
    path: String,
    message: Option<String>,
    include_untracked: Option<bool>,
) -> Result<String, String> {
    git_stash_push(
        &path,
        message.as_deref(),
        include_untracked.unwrap_or(false),
    )
}

#[tauri::command]
pub fn stash_pop(path: String, index: Option<u32>) -> Result<String, String> {
    git_stash_pop(&path, index)
}

#[tauri::command]
pub fn stash_apply(path: String, index: Option<u32>) -> Result<String, String> {
    git_stash_apply(&path, index)
}

#[tauri::command]
pub fn stash_drop(path: String, index: Option<u32>) -> Result<String, String> {
    git_stash_drop(&path, index)
}
