#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Commit {
    pub hash: String,
    pub parents: Vec<String>,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
    pub refs: Vec<Ref>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Ref {
    pub name: String,
    pub ref_type: String,
}

use tokio::io::AsyncBufReadExt;
use tokio::process::Command;
use tauri::{AppHandle, Emitter};

const CHUNK_SIZE: usize = 50;

#[derive(Clone, serde::Serialize)]
pub struct LogChunk {
    pub commits: Vec<Commit>,
    pub total_so_far: usize,
    pub is_last: bool,
}

#[tauri::command]
pub async fn git_log(
    path: String,
    page: Option<usize>,
    per_page: Option<usize>,
    ref_name: Option<String>,
) -> Result<Vec<Commit>, String> {
    let limit = per_page.unwrap_or(200).clamp(1, 500);
    let skip = page.unwrap_or(0) * limit;

    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "log".to_string(),
        "--topo-order".to_string(),
        format!("--skip={}", skip),
        format!("--max-count={}", limit),
        "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s".to_string(),
    ];

    if let Some(ref_name) = ref_name.filter(|name| !name.trim().is_empty()) {
        args.push(ref_name);
    } else {
        args.push("--all".to_string());
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git log: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_log_output(&stdout))
}

/// Stream git log output in chunks via Tauri events.
/// Frontend listens for "git:log-chunk" events and accumulates them.
#[tauri::command]
pub async fn git_log_stream(
    path: String,
    page: Option<usize>,
    per_page: Option<usize>,
    ref_name: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    let limit = per_page.unwrap_or(200).clamp(1, 500);
    let skip = page.unwrap_or(0) * limit;

    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.clone(),
        "log".to_string(),
        "--topo-order".to_string(),
        format!("--skip={}", skip),
        format!("--max-count={}", limit),
        "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s".to_string(),
    ];
    if let Some(ref_name) = ref_name.filter(|name| !name.trim().is_empty()) {
        args.push(ref_name);
    } else {
        args.push("--all".to_string());
    }

    let mut child = Command::new("git")
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn git log: {}", e))?;

    let stdout = child.stdout.take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;

    let reader = tokio::io::BufReader::new(stdout);
    let mut lines = reader.lines();
    let mut batch = Vec::with_capacity(CHUNK_SIZE);
    let mut total = 0usize;

    while let Ok(Some(line)) = lines.next_line().await {
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(7, '|').collect();
        if parts.len() < 7 {
            continue;
        }

        let commit = Commit {
            hash: parts[0].to_string(),
            parents: if parts[1].is_empty() { vec![] } else { parts[1].split(' ').map(|s| s.to_string()).collect() },
            author: parts[2].to_string(),
            email: parts[3].to_string(),
            date: parts[4].to_string(),
            refs: parse_refs(parts[5]),
            message: parts[6].to_string(),
        };
        batch.push(commit);
        total += 1;

        if batch.len() >= CHUNK_SIZE {
            let chunk = LogChunk {
                commits: batch.drain(..).collect(),
                total_so_far: total,
                is_last: false,
            };
            app.emit("git:log-chunk", chunk).map_err(|e| format!("Emit error: {}", e))?;
        }
    }

    // Send remaining + final marker
    let last = LogChunk {
        commits: batch,
        total_so_far: total,
        is_last: true,
    };
    app.emit("git:log-chunk", last).map_err(|e| format!("Emit error: {}", e))?;

    // Wait for child to finish
    child.wait().await.map_err(|e| format!("Wait error: {}", e))?;

    Ok(format!("Streamed {} commits", total))
} 

#[tauri::command]
pub async fn file_history(path: String, file_path: String, max_count: Option<usize>) -> Result<Vec<Commit>, String> {
    let limit = max_count.unwrap_or(100).clamp(1, 500);

    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "log",
            "--oneline",
            "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s",
            format!("--max-count={}", limit).as_str(),
            "--follow",
            "--",
            &file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_log_output(&stdout))
}

fn parse_log_output(stdout: &str) -> Vec<Commit> {
    stdout
        .lines()
        .filter(|line| !line.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(7, '|').collect();
            if parts.len() < 7 {
                return None;
            }

            Some(Commit {
                hash: parts[0].to_string(),
                parents: if parts[1].is_empty() {
                    vec![]
                } else {
                    parts[1].split(' ').map(|s| s.to_string()).collect()
                },
                author: parts[2].to_string(),
                email: parts[3].to_string(),
                date: parts[4].to_string(),
                refs: parse_refs(parts[5]),
                message: parts[6].to_string(),
            })
        })
        .collect()
}

pub fn parse_refs(refs_str: &str) -> Vec<Ref> {
    if refs_str.trim().is_empty() {
        return vec![];
    }

    refs_str
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| {
            // Strip "HEAD -> " prefix
            let s = if let Some(stripped) = s.strip_prefix("HEAD -> ") {
                stripped
            } else {
                s
            };

            let ref_type = if s == "HEAD" {
                "head"
            } else if s.starts_with("tag: ") {
                "tag"
            } else if s.starts_with("origin/") || s.contains('/') {
                "remote"
            } else {
                "branch"
            };

            let name = if let Some(stripped) = s.strip_prefix("tag: ") {
                stripped.to_string()
            } else {
                s.to_string()
            };

            Ref {
                name,
                ref_type: ref_type.to_string(),
            }
        })
        .collect()
}
