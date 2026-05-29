use std::process::Command;

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

#[tauri::command]
pub fn git_log(
    path: String,
    page: Option<usize>,
    per_page: Option<usize>,
) -> Result<Vec<Commit>, String> {
    let limit = per_page.unwrap_or(200);
    let skip = page.unwrap_or(0) * limit;

    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.clone(),
        "log".to_string(),
        format!("--max-count={}", limit),
        "--all".to_string(),
        // %D = ref names (same as --decorate but inline, empty if none)
        "--pretty=format:%H|%P|%an|%ae|%ai|%D|%s".to_string(),
    ];
    if skip > 0 {
        args.push(format!("--skip={}", skip));
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits: Vec<Commit> = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }
        // Split into 7 parts: hash|parents|author|email|date|refs|message
        let parts: Vec<&str> = line.splitn(7, '|').collect();
        if parts.len() < 7 {
            continue;
        }

        let hash = parts[0].to_string();
        let parent_str = parts[1];
        let parents: Vec<String> = if parent_str.is_empty() {
            vec![]
        } else {
            parent_str.split(' ').map(|s| s.to_string()).collect()
        };
        let author = parts[2].to_string();
        let email = parts[3].to_string();
        let date = parts[4].to_string();
        let refs_str = parts[5];
        let message = parts[6].to_string();

        let refs = parse_refs(refs_str);

        commits.push(Commit {
            hash,
            parents,
            author,
            email,
            date,
            message,
            refs,
        });
    }

    Ok(commits)
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
