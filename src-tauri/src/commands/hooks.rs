use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHook {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub executable: bool,
    pub content: Option<String>,
}

#[tauri::command]
pub async fn list_hooks(repo_path: String) -> Result<Vec<GitHook>, String> {
    let hooks_dir = Path::new(&repo_path).join(".git").join("hooks");
    let mut hooks = Vec::new();

    let hook_names = vec![
        "pre-commit", "prepare-commit-msg", "commit-msg",
        "post-commit", "pre-rebase", "post-checkout",
        "post-merge", "pre-push", "pre-auto-gc",
        "post-rewrite", "sendemail-validate", "fsmonitor-watchman",
        "p4-changelist", "p4-prepare-changelist", "p4-post-changelist",
        "p4-pre-submit", "post-index-change",
    ];

    for name in hook_names {
        let hook_path = hooks_dir.join(name);
        let exists = hook_path.exists();
        let executable = if exists {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                hook_path.metadata()
                    .map(|m| m.permissions().mode() & 0o111 != 0)
                    .unwrap_or(false)
            }
            #[cfg(not(unix))]
            {
                true
            }
        } else {
            false
        };

        let content = if exists {
            std::fs::read_to_string(&hook_path).ok()
        } else {
            None
        };

        hooks.push(GitHook {
            name: name.to_string(),
            path: hook_path.to_string_lossy().to_string(),
            exists,
            executable,
            content,
        });
    }

    Ok(hooks)
}

#[tauri::command]
pub async fn enable_hook(repo_path: String, hook_name: String) -> Result<(), String> {
    let hooks_dir = Path::new(&repo_path).join(".git").join("hooks");
    let hook_path = hooks_dir.join(&hook_name);

    if !hook_path.exists() {
        return Err(format!("Hook {} does not exist", hook_name));
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = hook_path.metadata()
            .map_err(|e| format!("Failed to read permissions: {}", e))?
            .permissions();
        perms.set_mode(perms.mode() | 0o111);
        std::fs::set_permissions(&hook_path, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn disable_hook(repo_path: String, hook_name: String) -> Result<(), String> {
    let hooks_dir = Path::new(&repo_path).join(".git").join("hooks");
    let hook_path = hooks_dir.join(&hook_name);

    if !hook_path.exists() {
        return Err(format!("Hook {} does not exist", hook_name));
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = hook_path.metadata()
            .map_err(|e| format!("Failed to read permissions: {}", e))?
            .permissions();
        perms.set_mode(perms.mode() & !0o111);
        std::fs::set_permissions(&hook_path, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn save_hook(repo_path: String, hook_name: String, content: String) -> Result<(), String> {
    let hooks_dir = Path::new(&repo_path).join(".git").join("hooks");
    let hook_path = hooks_dir.join(&hook_name);

    std::fs::write(&hook_path, &content)
        .map_err(|e| format!("Failed to write hook: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = hook_path.metadata()
            .map_err(|e| format!("Failed to read permissions: {}", e))?
            .permissions();
        perms.set_mode(perms.mode() | 0o111);
        std::fs::set_permissions(&hook_path, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_hook(repo_path: String, hook_name: String) -> Result<(), String> {
    let hooks_dir = Path::new(&repo_path).join(".git").join("hooks");
    let hook_path = hooks_dir.join(&hook_name);

    if !hook_path.exists() {
        return Err(format!("Hook {} does not exist", hook_name));
    }

    std::fs::remove_file(&hook_path)
        .map_err(|e| format!("Failed to delete hook: {}", e))?;

    Ok(())
}