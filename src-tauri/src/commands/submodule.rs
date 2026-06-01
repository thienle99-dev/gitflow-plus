use serde::Serialize;
use tokio::process::Command;

#[derive(Serialize, Clone, Debug)]
pub struct SubmoduleInfo {
    pub name: String,
    pub path: String,
    pub commit_hash: String,
    pub status: String, // "ok", "not_initialized", "modified", "conflict"
    pub desc: String,
}

#[tauri::command]
pub async fn submodule_list(path: String) -> Result<Vec<SubmoduleInfo>, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "submodule", "status"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // If git submodule status fails with a non-zero code, it usually means no submodules are configured.
        if stderr.contains("No submodules registered") || stderr.contains("no submodules") {
            return Ok(vec![]);
        }
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut list = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }

        // git submodule status output format is:
        // [<prefix_char>]<commit_hash> <path_to_submodule> (<description>)
        // prefix_char can be:
        // '-' if the submodule is not initialized
        // '+' if the checked out submodule commit doesn't match the SHA-1 in the index
        // ' ' if it matches
        // 'U' if there are merge conflicts
        let mut chars = line.chars();
        let prefix = chars.next().unwrap_or(' ');

        let status = match prefix {
            '-' => "not_initialized".to_string(),
            '+' => "modified".to_string(),
            'U' => "conflict".to_string(),
            _ => "ok".to_string(),
        };

        // Reconstruct remaining string
        let remaining: String = if prefix == ' ' || prefix == '+' || prefix == '-' || prefix == 'U'
        {
            chars.collect()
        } else {
            line.to_string()
        };

        let trimmed = remaining.trim();
        let parts: Vec<&str> = trimmed.splitn(2, ' ').collect();
        if parts.len() < 2 {
            continue;
        }

        let commit_hash = parts[0].to_string();
        let path_and_desc = parts[1].trim();

        let (sub_path, desc) = if path_and_desc.contains('(') && path_and_desc.ends_with(')') {
            let p_parts: Vec<&str> = path_and_desc.splitn(2, '(').collect();
            let p = p_parts[0].trim().to_string();
            let d = p_parts[1].trim_end_matches(')').trim().to_string();
            (p, d)
        } else {
            (path_and_desc.to_string(), "".to_string())
        };

        // Extract folder name as display name
        let name = sub_path
            .split('/')
            .filter(|s| !s.is_empty())
            .last()
            .unwrap_or(&sub_path)
            .to_string();

        list.push(SubmoduleInfo {
            name,
            path: sub_path,
            commit_hash,
            status,
            desc,
        });
    }

    Ok(list)
}

#[tauri::command]
pub async fn submodule_init(path: String, submodule_path: Option<String>) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "submodule".to_string(),
        "init".to_string(),
    ];
    if let Some(sub_path) = submodule_path {
        args.push(sub_path);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok("Submodule initialized successfully".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to initialize submodule: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn submodule_update(path: String, submodule_path: Option<String>) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "submodule".to_string(),
        "update".to_string(),
        "--init".to_string(),
        "--recursive".to_string(),
    ];
    if let Some(sub_path) = submodule_path {
        args.push(sub_path);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok("Submodule updated successfully".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to update submodule: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn submodule_remove(path: String, submodule_path: String) -> Result<String, String> {
    let args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "submodule".to_string(),
        "deinit".to_string(),
        "-f".to_string(),
        submodule_path,
    ];

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok("Submodule removed successfully".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to remove submodule: {}", stderr.trim()))
    }
}
