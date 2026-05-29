use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct BlameLine {
    pub line_number: u32,
    pub commit_hash: String,
    pub author: String,
    pub date: String,
    pub content: String,
}

pub fn git_blame(path: &str, file_path: &str) -> Result<Vec<BlameLine>, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            path,
            "blame",
            "--porcelain",
            "--",
            file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to blame file: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut lines = Vec::new();
    let mut current_hash = String::new();
    let mut current_author = String::new();
    let mut current_date = String::new();
    let mut reading_header = true;

    for line in stdout.lines() {
        if reading_header {
            if line.starts_with('\t') {
                // Content line — after the header
                lines.push(BlameLine {
                    line_number: lines.len() as u32 + 1,
                    commit_hash: current_hash.clone(),
                    author: current_author.clone(),
                    date: current_date.clone(),
                    content: line[1..].to_string(), // strip leading tab
                });
                reading_header = false;
            } else if line.starts_with("author ") {
                current_author = line[6..].to_string();
            } else if line.starts_with("author-time ") {
                let ts: i64 = line[12..].trim().parse().unwrap_or(0);
                use chrono::{DateTime, Utc};
                let dt = DateTime::from_timestamp(ts, 0)
                    .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string())
                    .unwrap_or_else(|| "unknown".to_string());
                current_date = dt;
            } else if !line.starts_with('\t') && line.contains(' ') {
                // First header line: commit_hash line_number
                let parts: Vec<&str> = line.splitn(4, ' ').collect();
                if parts.len() >= 2 {
                    current_hash = parts[0].to_string();
                }
            }
        } else if line.starts_with('\t') {
            lines.push(BlameLine {
                line_number: lines.len() as u32 + 1,
                commit_hash: current_hash.clone(),
                author: current_author.clone(),
                date: current_date.clone(),
                content: line[1..].to_string(),
            });
        } else {
            reading_header = true;
            if line.contains(' ') {
                let parts: Vec<&str> = line.splitn(4, ' ').collect();
                if parts.len() >= 2 {
                    current_hash = parts[0].to_string();
                }
            }
            current_author.clear();
            current_date.clear();
        }
    }

    Ok(lines)
}

#[tauri::command]
pub fn file_blame(path: String, file_path: String) -> Result<Vec<BlameLine>, String> {
    git_blame(&path, &file_path)
}
