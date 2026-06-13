use serde::Serialize;
use std::sync::Mutex;
use tauri::Emitter;

#[derive(Serialize, Clone, Debug)]
pub struct CloneProgress {
    pub phase: String,
    pub percent: f64,
    pub message: String,
}

static CLONE_PID: Mutex<Option<u32>> = Mutex::new(None);

fn parse_clone_progress(line: &str) -> Option<CloneProgress> {
    let line = line.trim();

    if let Some(pos) = line.find("Receiving objects:") {
        let rest = &line[pos + 18..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(CloneProgress { phase: "receiving".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(CloneProgress { phase: "receiving".into(), percent: 0.0, message: line.to_string() });
    }

    if let Some(pos) = line.find("Resolving deltas:") {
        let rest = &line[pos + 17..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(CloneProgress { phase: "resolving".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(CloneProgress { phase: "resolving".into(), percent: 0.0, message: line.to_string() });
    }

    if let Some(pos) = line.find("Counting objects:") {
        let rest = &line[pos + 17..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(CloneProgress { phase: "counting".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(CloneProgress { phase: "counting".into(), percent: 0.0, message: line.to_string() });
    }

    if line.starts_with("remote:") {
        return Some(CloneProgress { phase: "remote".into(), percent: 0.0, message: line.to_string() });
    }

    if line.contains("done.") || line.contains(", done") {
        return Some(CloneProgress { phase: "done".into(), percent: 100.0, message: line.to_string() });
    }

    None
}

#[tauri::command]
pub async fn git_clone(
    app: tauri::AppHandle,
    url: String,
    destination: String,
) -> Result<String, String> {
    cancel_clone_inner();

    let mut child = std::process::Command::new("git")
        .args(["clone", "--progress", &url, &destination])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start git clone: {}", e))?;

    {
        let mut pid = CLONE_PID.lock().map_err(|e| e.to_string())?;
        *pid = Some(child.id());
    }

    let stderr = child.stderr.take();
    let stdout = child.stdout.take();

    let app_clone = app.clone();
    let stderr_handle = std::thread::spawn(move || {
        if let Some(reader) = stderr {
            use std::io::{BufRead, BufReader};
            let lines = BufReader::new(reader).lines();
            for line in lines.flatten() {
                if let Some(progress) = parse_clone_progress(&line) {
                    let _ = app_clone.emit("clone-progress", progress);
                }
            }
        }
    });

    let stdout_handle = std::thread::spawn(move || {
        if let Some(reader) = stdout {
            use std::io::{BufRead, BufReader};
            let lines = BufReader::new(reader).lines();
            for _ in lines.flatten() {}
        }
    });

    let status = tokio::task::spawn_blocking(move || child.wait())
        .await
        .map_err(|e| format!("Clone task error: {}", e))?
        .map_err(|e| format!("Clone process error: {}", e))?;

    let _ = stderr_handle.join();
    let _ = stdout_handle.join();

    {
        let mut pid = CLONE_PID.lock().map_err(|e| e.to_string())?;
        *pid = None;
    }

    if status.success() {
        let _ = app.emit("clone-progress", CloneProgress {
            phase: "complete".into(),
            percent: 100.0,
            message: format!("Cloned {} to {}", url, destination),
        });
        Ok(format!("Cloned {} to {}", url, destination))
    } else {
        Err(format!("Clone failed with exit code: {}", status))
    }
}

#[tauri::command]
pub async fn cancel_clone() -> Result<String, String> {
    cancel_clone_inner();
    Ok("Clone cancelled".to_string())
}

fn cancel_clone_inner() {
    if let Ok(mut pid) = CLONE_PID.lock() {
        if let Some(id) = pid.take() {
            unsafe {
                libc::kill(id as i32, libc::SIGTERM);
            }
        }
    }
}
