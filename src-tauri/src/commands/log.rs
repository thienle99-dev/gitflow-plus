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
pub fn git_log(path: String, page: Option<usize>, per_page: Option<usize>) -> Result<Vec<Commit>, String> {
    let limit = per_page.unwrap_or(200);
    let skip = page.unwrap_or(0) * limit;

    let skip_arg = if skip > 0 {
        format!("--skip={}", skip)
    } else {
        String::new()
    };

    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path.clone(),
        "log".to_string(),
        format!("--max-count={}", limit),
        "--all".to_string(),
        format!("--pretty=format:%H|%P|%an|%ae|%ai|%s"),
        "--decorate=short".to_string(),
    ];
    if !skip_arg.is_empty() {
        args.push(skip_arg);
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
        let parts: Vec<&str> = line.splitn(6, '|').collect();
        if parts.len() < 6 {
            continue;
        }

        let hash = parts[0].to_string();
        let parent_str = parts[1].to_string();
        let parents: Vec<String> = if parent_str.is_empty() {
            vec![]
        } else {
            parent_str.split(' ').map(|s| s.to_string()).collect()
        };
        let author = parts[2].to_string();
        let email = parts[3].to_string();
        let date = parts[4].to_string();
        let message = parts[5].to_string();

        commits.push(Commit {
            hash,
            parents,
            author,
            email,
            date,
            message,
            refs: vec![],
        });
    }

    Ok(commits)
}
