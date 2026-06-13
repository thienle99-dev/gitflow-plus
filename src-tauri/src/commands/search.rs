use crate::commands::log::Commit;
use serde::Serialize;
use tokio::process::Command;

#[derive(Serialize)]
pub struct SearchOptions {
    pub query: Option<String>,
    pub author: Option<String>,
    pub file: Option<String>,
    pub since: Option<String>,
    pub until: Option<String>,
    pub max_count: Option<u32>,
    pub branch: Option<String>,
}

pub async fn git_log_search(path: &str, opts: &SearchOptions) -> Result<Vec<Commit>, String> {
    let mut args = vec![
        "--no-pager",
        "-C",
        path,
        "log",
        "--all",
        "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s|%G?",
    ];

    if let Some(query) = &opts.query {
        if !query.is_empty() {
            args.push("--grep");
            args.push(query);
            args.push("-i"); // case-insensitive
        }
    }

    if let Some(author) = &opts.author {
        if !author.is_empty() {
            args.push("--author");
            args.push(author);
        }
    }

    if let Some(file) = &opts.file {
        if !file.is_empty() {
            args.push("--");
            args.push(file);
        }
    }

    if let Some(since) = &opts.since {
        if !since.is_empty() {
            args.push("--since");
            args.push(since);
        }
    }

    if let Some(until) = &opts.until {
        if !until.is_empty() {
            args.push("--until");
            args.push(until);
        }
    }

    let max_str = opts.max_count.map(|max| format!("--max-count={}", max));
    if let Some(ref s) = max_str {
        args.push(s);
    }

    if let Some(branch) = &opts.branch {
        if !branch.is_empty() {
            // Remove --all if we're filtering by branch
            args.retain(|a| *a != "--all");
            args.push(branch);
        }
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to search git log: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits = stdout
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(8, '|').collect();
            if parts.len() < 8 {
                return None;
            }
            let refs = crate::commands::log::parse_refs(parts[5]);
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
                message: parts[6].to_string(),
                refs,
                signature: parts[7].to_string(),
            })
        })
        .collect();

    Ok(commits)
}

#[tauri::command]
pub async fn search_commits(
    path: String,
    query: Option<String>,
    author: Option<String>,
    file: Option<String>,
    since: Option<String>,
    until: Option<String>,
    max_count: Option<u32>,
    branch: Option<String>,
) -> Result<Vec<Commit>, String> {
    let opts = SearchOptions {
        query,
        author,
        file,
        since,
        until,
        max_count,
        branch,
    };
    git_log_search(&path, &opts).await
}

#[derive(Serialize)]
pub struct GrepMatch {
    pub file: String,
    pub line_number: u32,
    pub line_content: String,
    pub match_column: u32,
}

/// Search file content using `git grep`
#[tauri::command]
pub async fn search_content(
    path: String,
    pattern: String,
    case_insensitive: Option<bool>,
    fixed: Option<bool>,
    file_glob: Option<String>,
    max_results: Option<u32>,
) -> Result<Vec<GrepMatch>, String> {
    let max_str = max_results.map(|m| m.to_string());
    let mut args: Vec<String> = vec![
        "--no-pager".into(),
        "-C".into(),
        path,
        "grep".into(),
        "--line-number".into(),
        "--heading".into(),
        "-I".into(),
    ];

    if case_insensitive.unwrap_or(true) {
        args.push("-i".into());
    }
    if fixed.unwrap_or(false) {
        args.push("-F".into());
    }
    if let Some(ref max) = max_str {
        args.push("--max-count".into());
        args.push(max.clone());
    }

    let pattern_lower = pattern.to_lowercase();
    args.push(pattern);

    if let Some(glob) = &file_glob {
        if !glob.is_empty() {
            args.push("--".into());
            args.push(glob.clone());
        }
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git grep: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // git grep returns exit code 1 for no matches — not an error
        if output.status.code() == Some(1) {
            return Ok(Vec::new());
        }
        return Err(format!("git grep failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();
    let mut current_file = String::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }
        // Check if this is a file header (ends with colon+number, or just a path line)
        // git grep --heading prints file:line:content or file:line:content
        if let Some(pos) = line.find(':') {
            let rest = &line[pos + 1..];
            if let Some(second_colon) = rest.find(':') {
                let line_num_str = &rest[..second_colon];
                if let Ok(line_number) = line_num_str.parse::<u32>() {
                    let line_content = &rest[second_colon + 1..];
                    // Find match column in original (lowercased) for highlight
                    let match_col = line_content.to_lowercase().find(&pattern_lower)
                        .map(|c| c as u32)
                        .unwrap_or(0);
                    results.push(GrepMatch {
                        file: line[..pos].to_string(),
                        line_number,
                        line_content: line_content.to_string(),
                        match_column: match_col,
                    });
                    continue;
                }
            }
        }
        // Fallback: treat as current file header when no pattern matched
        current_file = line.to_string();
    }

    Ok(results)
}
