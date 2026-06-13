use tokio::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitConfigEntry {
    pub key: String,
    pub value: String,
    pub scope: String,
}

#[tauri::command]
pub async fn list_git_config(path: String, scope: Option<String>) -> Result<Vec<GitConfigEntry>, String> {
    let scope_flag = scope.unwrap_or_else(|| "local".to_string());
    let valid = ["local", "global", "system"];
    if !valid.contains(&scope_flag.as_str()) {
        return Err(format!("Invalid scope: {}. Use local, global, or system", scope_flag));
    }

    let output = if scope_flag == "local" {
        Command::new("git")
            .args(["-C", &path, "config", "--list", "--parseable"])
            .output()
            .await
    } else {
        let flag = format!("--{}", scope_flag);
        Command::new("git")
            .args(["config", &flag, "--list", "--parseable"])
            .output()
            .await
    }.map_err(|e| format!("git config --list failed: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut entries = Vec::new();

    for line in stdout.lines() {
        if let Some((key, value)) = line.split_once('=') {
            entries.push(GitConfigEntry {
                key: key.to_string(),
                value: value.to_string(),
                scope: scope_flag.clone(),
            });
        }
    }

    Ok(entries)
}

#[tauri::command]
pub async fn get_git_config(path: String, key: String, scope: Option<String>) -> Result<String, String> {
    let scope_flag = scope.unwrap_or_else(|| "local".to_string());

    let output = if scope_flag == "local" {
        Command::new("git")
            .args(["-C", &path, "config", &key])
            .output()
            .await
    } else {
        let flag = format!("--{}", scope_flag);
        Command::new("git")
            .args(["config", &flag, &key])
            .output()
            .await
    }.map_err(|e| format!("git config failed: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(format!("Config '{}' not found", key))
    }
}

#[tauri::command]
pub async fn set_git_config(
    path: String,
    key: String,
    value: String,
    scope: Option<String>,
) -> Result<String, String> {
    let scope_flag = scope.unwrap_or_else(|| "local".to_string());
    let valid = ["local", "global", "system"];
    if !valid.contains(&scope_flag.as_str()) {
        return Err(format!("Invalid scope: {}", scope_flag));
    }

    let output = if scope_flag == "local" {
        Command::new("git")
            .args(["-C", &path, "config", &key, &value])
            .output()
            .await
    } else {
        let flag = format!("--{}", scope_flag);
        Command::new("git")
            .args(["config", &flag, &key, &value])
            .output()
            .await
    }.map_err(|e| format!("git config set failed: {}", e))?;

    if output.status.success() {
        Ok(format!("{}={}", key, value))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn unset_git_config(path: String, key: String, scope: Option<String>) -> Result<String, String> {
    let scope_flag = scope.unwrap_or_else(|| "local".to_string());

    let output = if scope_flag == "local" {
        Command::new("git")
            .args(["-C", &path, "config", "--unset", &key])
            .output()
            .await
    } else {
        let flag = format!("--{}", scope_flag);
        Command::new("git")
            .args(["config", "--unset", &flag, &key])
            .output()
            .await
    }.map_err(|e| format!("git config unset failed: {}", e))?;

    if output.status.success() {
        Ok(format!("Unset {}", key))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn add_git_config(
    path: String,
    key: String,
    value: String,
    scope: Option<String>,
) -> Result<String, String> {
    let scope_flag = scope.unwrap_or_else(|| "local".to_string());

    let output = if scope_flag == "local" {
        Command::new("git")
            .args(["-C", &path, "config", "--add", &key, &value])
            .output()
            .await
    } else {
        let flag = format!("--{}", scope_flag);
        Command::new("git")
            .args(["config", "--add", &flag, &key, &value])
            .output()
            .await
    }.map_err(|e| format!("git config add failed: {}", e))?;

    if output.status.success() {
        Ok(format!("Added {}={}", key, value))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}