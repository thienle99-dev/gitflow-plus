use std::collections::HashMap;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Commit {
    pub hash: String,
    pub parents: Vec<String>,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
    pub refs: Vec<Ref>,
    pub signature: String,
    pub additions: u32,
    pub deletions: u32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Ref {
    pub name: String,
    pub ref_type: String,
}

use tauri::{AppHandle, Emitter};
use tokio::io::AsyncBufReadExt;
use tokio::process::Command;

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
        "--numstat".to_string(),
        format!("--skip={}", skip),
        format!("--max-count={}", limit),
        "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s|%G?".to_string(),
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

#[tauri::command]
pub async fn git_log_since(
    path: String,
    known_hash: String,
    max_count: Option<usize>,
    ref_name: Option<String>,
) -> Result<Vec<Commit>, String> {
    let limit = max_count.unwrap_or(200).clamp(1, 500);
    let range = if let Some(ref_name) = ref_name.filter(|name| !name.trim().is_empty()) {
        format!("{}..{}", known_hash, ref_name)
    } else {
        format!("{}..HEAD", known_hash)
    };

    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "log",
            "--topo-order",
            "--numstat",
            &format!("--max-count={}", limit),
            "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s|%G?",
            &range,
        ])
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
        "--numstat".to_string(),
        format!("--skip={}", skip),
        format!("--max-count={}", limit),
        "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s|%G?".to_string(),
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

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;

    let reader = tokio::io::BufReader::new(stdout);
    let mut lines = reader.lines();
    let mut batch = Vec::with_capacity(CHUNK_SIZE);
    let mut total = 0usize;

    while let Ok(Some(line)) = lines.next_line().await {
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(8, '|').collect();
        if parts.len() < 8 {
            continue;
        }

        let commit = Commit {
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
            signature: parts[7].to_string(),
            additions: 0,
            deletions: 0,
        };
        batch.push(commit);
        total += 1;

        if batch.len() >= CHUNK_SIZE {
            let chunk = LogChunk {
                commits: batch.drain(..).collect(),
                total_so_far: total,
                is_last: false,
            };
            app.emit("git:log-chunk", chunk)
                .map_err(|e| format!("Emit error: {}", e))?;
        }
    }

    // Send remaining + final marker
    let last = LogChunk {
        commits: batch,
        total_so_far: total,
        is_last: true,
    };
    app.emit("git:log-chunk", last)
        .map_err(|e| format!("Emit error: {}", e))?;

    // Wait for child to finish
    child
        .wait()
        .await
        .map_err(|e| format!("Wait error: {}", e))?;

    Ok(format!("Streamed {} commits", total))
}

#[tauri::command]
pub async fn file_history(
    path: String,
    file_path: String,
    max_count: Option<usize>,
) -> Result<Vec<Commit>, String> {
    let limit = max_count.unwrap_or(100).clamp(1, 500);

    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "log",
            "--oneline",
            "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s|%G?",
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

/// Returns commit counts keyed by date (YYYY-MM-DD) for the last year.
/// Efficient: only extracts dates via `--format='%aI'`, not full commit data.
#[tauri::command]
pub async fn git_activity(
    path: String,
    days: Option<u32>,
) -> Result<HashMap<String, u32>, String> {
    let days = days.unwrap_or(365).clamp(30, 730);
    let since = chrono::Utc::now() - chrono::Duration::days(days as i64);
    let since_str = since.format("%Y-%m-%d").to_string();

    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "log",
            "--all",
            "--format=%aI",
            &format!("--since={}", since_str),
            "--max-count=50000",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git log: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut activity: HashMap<String, u32> = HashMap::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // ISO 8601 format: "2026-06-01T09:00:00+07:00" → extract first 10 chars
        if line.len() >= 10 {
            let date_key = &line[..10];
            *activity.entry(date_key.to_string()).or_insert(0) += 1;
        }
    }

    Ok(activity)
}

fn parse_log_output(stdout: &str) -> Vec<Commit> {
    let mut commits: Vec<Commit> = Vec::new();
    let mut current_additions: u32 = 0;
    let mut current_deletions: u32 = 0;

    fn save_stats(commits: &mut Vec<Commit>, add: u32, del: u32) {
        if let Some(last) = commits.last_mut() {
            last.additions = add;
            last.deletions = del;
        }
    }

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }

        // Commit header line — pipe-delimited
        if line.contains('|') {
            save_stats(&mut commits, current_additions, current_deletions);
            current_additions = 0;
            current_deletions = 0;

            let parts: Vec<&str> = line.splitn(8, '|').collect();
            if parts.len() < 8 {
                continue;
            }

            commits.push(Commit {
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
                signature: parts[7].to_string(),
                additions: 0,
                deletions: 0,
            });
            continue;
        }

        // Numstat line: "additions\tdeletions\tpath"
        if let Some((rest, _path)) = line.rsplit_once('\t') {
            if let Some((add_str, del_str)) = rest.split_once('\t') {
                if let (Ok(add), Ok(del)) = (add_str.parse::<u32>(), del_str.parse::<u32>()) {
                    current_additions += add;
                    current_deletions += del;
                }
            }
        }
    }

    save_stats(&mut commits, current_additions, current_deletions);
    commits
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
            let (s, is_head_ref) = if let Some(stripped) = s.strip_prefix("HEAD -> ") {
                (stripped, true)
            } else {
                (s, s == "HEAD")
            };

            let ref_type = if is_head_ref {
                "head"
            } else if s.starts_with("tag: ") {
                "tag"
            } else if s.starts_with("origin/")
                || s.starts_with("upstream/")
                || s.starts_with("remotes/")
            {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_git_log_output_with_parents_refs_and_subject() {
        let commits = parse_log_output(
            "abc123|parent1 parent2|Alice|alice@example.com|2026-06-01 09:00:00 +0700|HEAD -> main, origin/main|feat: add parser tests|\n2\t1\tsrc/main.rs\ndef456||Bob|bob@example.com|2026-05-31 08:00:00 +0700|tag: v1.0.0|initial commit|\n1\t0\tsrc/lib.rs\n",
        );

        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].hash, "abc123");
        assert_eq!(commits[0].parents, vec!["parent1", "parent2"]);
        assert_eq!(commits[0].author, "Alice");
        assert_eq!(commits[0].email, "alice@example.com");
        assert_eq!(commits[0].date, "2026-06-01 09:00:00 +0700");
        assert_eq!(commits[0].message, "feat: add parser tests");
        assert_eq!(commits[0].refs.len(), 2);
        assert_eq!(commits[0].additions, 2);
        assert_eq!(commits[0].deletions, 1);
        assert_eq!(commits[1].parents.len(), 0);
        assert_eq!(commits[1].refs[0].ref_type, "tag");
        assert_eq!(commits[1].additions, 1);
        assert_eq!(commits[1].deletions, 0);
    }

    #[test]
    fn parses_numstat_multiple_files() {
        let commits = parse_log_output(
            "aaa||Alice|a@e|2026-06-01||msg|\n5\t3\tsrc/a.rs\n2\t4\tsrc/b.rs\n\nbbb||Bob|b@e|2026-06-02||msg2|\n0\t1\tsrc/c.rs\n",
        );
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].additions, 7);
        assert_eq!(commits[0].deletions, 7);
        assert_eq!(commits[1].additions, 0);
        assert_eq!(commits[1].deletions, 1);
    }

    #[test]
    fn handles_empty_numstat() {
        let commits = parse_log_output(
            "aaa||Alice|a@e|2026-06-01||empty diff commit|\n\nbbb||Bob|b@e|2026-06-02||msg|\n1\t1\tsrc/f.rs\n",
        );
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].additions, 0);
        assert_eq!(commits[0].deletions, 0);
        assert_eq!(commits[1].additions, 1);
        assert_eq!(commits[1].deletions, 1);
    }

    #[test]
    fn skips_malformed_log_lines() {
        let commits = parse_log_output(
            "too|few|fields\nabc123||Alice|alice@example.com|2026-06-01 09:00:00 +0700||valid subject|\n",
        );

        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].message, "valid subject");
    }

    #[test]
    fn parses_ref_types() {
        let refs = parse_refs("HEAD -> main, origin/main, tag: v1.0.0, feature/demo");

        assert_eq!(refs.len(), 4);
        assert_eq!(refs[0].name, "main");
        assert_eq!(refs[0].ref_type, "head");
        assert_eq!(refs[1].name, "origin/main");
        assert_eq!(refs[1].ref_type, "remote");
        assert_eq!(refs[2].name, "v1.0.0");
        assert_eq!(refs[2].ref_type, "tag");
        assert_eq!(refs[3].ref_type, "branch");
    }
}
