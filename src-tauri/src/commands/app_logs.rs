use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const APP_LOG_FILE_NAME: &str = "gitflow-desktop.log";
const DEFAULT_MAX_LINES: usize = 300;
const MAX_LINES_LIMIT: usize = 2_000;

#[derive(Serialize)]
pub struct AppLogEntry {
    pub timestamp: String,
    pub level: String,
    pub target: String,
    pub message: String,
    pub raw: String,
}

fn log_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_log_dir()
        .map(|dir| dir.join(APP_LOG_FILE_NAME))
        .map_err(|e| format!("Failed to resolve app log directory: {}", e))
}

fn parse_log_line(raw: &str) -> AppLogEntry {
    let trimmed = raw.trim();
    let mut timestamp = String::new();
    let mut target = String::new();
    let mut level = String::new();
    let mut message = trimmed.to_string();

    if let Some(first_bracket) = trimmed.find('[') {
        timestamp = trimmed[..first_bracket].trim().to_string();
        let rest = &trimmed[first_bracket..];
        let mut parts = Vec::new();
        let mut cursor = 0usize;

        while let Some(open) = rest[cursor..].find('[') {
            let open_idx = cursor + open;
            let Some(close) = rest[open_idx + 1..].find(']') else {
                break;
            };
            let close_idx = open_idx + 1 + close;
            parts.push(rest[open_idx + 1..close_idx].trim().to_string());
            cursor = close_idx + 1;
            if parts.len() >= 2 {
                break;
            }
        }

        if parts.len() >= 2 {
            target = parts[0].clone();
            level = parts[1].to_uppercase();
            message = rest[cursor..].trim().to_string();
        } else if parts.len() == 1 {
            level = parts[0].to_uppercase();
            message = rest[cursor..].trim().to_string();
        }
    }

    if level.is_empty() {
        let upper = trimmed.to_uppercase();
        for candidate in ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"] {
            if upper.contains(candidate) {
                level = candidate.to_string();
                break;
            }
        }
    }

    AppLogEntry {
        timestamp,
        level: if level.is_empty() {
            "INFO".to_string()
        } else {
            level
        },
        target,
        message,
        raw: raw.to_string(),
    }
}

#[tauri::command]
pub async fn app_log_path(app: AppHandle) -> Result<String, String> {
    Ok(log_file_path(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn app_log_export_text(app: AppHandle) -> Result<String, String> {
    let path = log_file_path(&app)?;
    match tokio::fs::read_to_string(&path).await {
        Ok(text) => Ok(text),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(format!("Failed to read app log file: {}", e)),
    }
}

#[tauri::command]
pub async fn app_log_clear(app: AppHandle) -> Result<(), String> {
    let path = log_file_path(&app)?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create app log directory: {}", e))?;
    }
    tokio::fs::write(&path, "")
        .await
        .map_err(|e| format!("Failed to clear app log file: {}", e))
}

#[tauri::command]
pub async fn app_log_list(
    app: AppHandle,
    max_lines: Option<usize>,
    level: Option<String>,
    query: Option<String>,
) -> Result<Vec<AppLogEntry>, String> {
    let text = app_log_export_text(app).await?;
    let max_lines = max_lines
        .unwrap_or(DEFAULT_MAX_LINES)
        .clamp(1, MAX_LINES_LIMIT);
    let level_filter = level
        .map(|v| v.trim().to_uppercase())
        .filter(|v| !v.is_empty() && v != "ALL");
    let query_filter = query
        .map(|v| v.trim().to_lowercase())
        .filter(|v| !v.is_empty());

    let entries = text
        .lines()
        .rev()
        .filter(|line| !line.trim().is_empty())
        .map(parse_log_line)
        .filter(|entry| {
            level_filter
                .as_ref()
                .map_or(true, |level| entry.level.eq_ignore_ascii_case(level))
        })
        .filter(|entry| {
            query_filter
                .as_ref()
                .map_or(true, |query| entry.raw.to_lowercase().contains(query))
        })
        .take(max_lines)
        .collect();

    Ok(entries)
}
