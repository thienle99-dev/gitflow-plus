use crate::commands::log::Commit;
use serde::Serialize;
use std::process::Command;

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

pub fn git_log_search(path: &str, opts: &SearchOptions) -> Result<Vec<Commit>, String> {
    let mut args = vec![
        "--no-pager",
        "-C",
        path,
        "log",
        "--all",
        "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s",
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
        .map_err(|e| format!("Failed to search git log: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits = stdout
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(7, '|').collect();
            if parts.len() < 7 {
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
            })
        })
        .collect();

    Ok(commits)
}

#[tauri::command]
pub fn search_commits(
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
    git_log_search(&path, &opts)
}
