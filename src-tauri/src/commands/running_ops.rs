use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Serialize, Clone, Debug)]
pub struct GitProgress {
    pub phase: String,
    pub percent: f64,
    pub message: String,
}

struct Slot {
    pid: u32,
    child: Arc<Mutex<Option<tokio::process::Child>>>,
}

/// Tracks running child processes by operation ID so they can be cancelled.
pub struct RunningOps {
    slots: Arc<Mutex<HashMap<String, Slot>>>,
}

impl RunningOps {
    pub fn new() -> Self {
        Self {
            slots: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawn a git command and register it for cancellation.
    /// Returns a receiver that resolves to the command output when the process finishes.
    pub fn spawn(
        &self,
        id: String,
        mut cmd: tokio::process::Command,
    ) -> Result<tokio::sync::oneshot::Receiver<Result<String, String>>, String> {
        let child = cmd
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("Failed to spawn: {}", e))?;

        let pid = child.id().unwrap_or(0);
        let child_slot = Arc::new(Mutex::new(Some(child)));

        self.slots.lock().unwrap().insert(
            id.clone(),
            Slot { pid, child: child_slot.clone() },
        );

        let (tx, rx) = tokio::sync::oneshot::channel();
        let slots = self.slots.clone();
        let id2 = id.clone();

        tokio::spawn(async move {
            // Take child out of slot before awaiting (can't hold lock across await)
            let child = child_slot.lock().unwrap().take();
            let output = match child {
                Some(c) => c.wait_with_output().await,
                None => return, // already cancelled
            };
            let result = match output {
                Ok(o) if o.status.success() => {
                    Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
                }
                Ok(o) => Err(String::from_utf8_lossy(&o.stderr).trim().to_string()),
                Err(e) => Err(format!("Git process error: {}", e)),
            };
            let _ = tx.send(result);
            slots.lock().unwrap().remove(&id2);
        });

        Ok(rx)
    }

    /// Spawn a git command with stderr progress streaming and cancellation.
    /// Reads stderr line-by-line in a background task and emits `event_name` Tauri events.
    pub fn spawn_with_progress(
        &self,
        id: String,
        mut cmd: tokio::process::Command,
        app: tauri::AppHandle,
        event_name: String,
    ) -> Result<tokio::sync::oneshot::Receiver<Result<String, String>>, String> {
        use tauri::Emitter;

        let mut child = cmd
            .kill_on_drop(true)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn: {}", e))?;

        let pid = child.id().unwrap_or(0);
        let stderr = child.stderr.take();

        let child_slot = Arc::new(Mutex::new(Some(child)));
        self.slots.lock().unwrap().insert(
            id.clone(),
            Slot { pid, child: child_slot.clone() },
        );

        // Read stderr in a background tokio task and emit progress events
        let op_id = id.clone();
        let stderr_handle = tokio::spawn(async move {
            if let Some(reader) = stderr {
                use tokio::io::{AsyncBufReadExt, BufReader};
                let mut lines = BufReader::new(reader).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    if let Some(progress) = parse_remote_progress(&line) {
                        let _ = app.emit(&event_name, RemoteProgress {
                            operation_id: op_id.clone(),
                            phase: progress.phase,
                            percent: progress.percent,
                            message: progress.message,
                        });
                    }
                }
            }
        });

        let (tx, rx) = tokio::sync::oneshot::channel();
        let slots = self.slots.clone();
        let id2 = id.clone();

        tokio::spawn(async move {
            let child = child_slot.lock().unwrap().take();
            let output = match child {
                Some(c) => c.wait_with_output().await,
                None => return,
            };
            let _ = stderr_handle.await;
            let result = match output {
                Ok(o) if o.status.success() => {
                    Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
                }
                Ok(o) => Err(String::from_utf8_lossy(&o.stderr).trim().to_string()),
                Err(e) => Err(format!("Git process error: {}", e)),
            };
            let _ = tx.send(result);
            slots.lock().unwrap().remove(&id2);
        });

        Ok(rx)
    }

    /// Cancel a running operation by killing its child process.
    pub fn cancel(&self, id: &str) -> Result<bool, String> {
        let slot = self.slots.lock().unwrap().remove(id);
        match slot {
            Some(slot) => {
                // Try to kill via the Child handle first
                let killed = {
                    let mut guard = slot.child.lock().unwrap();
                    if let Some(child) = guard.as_mut() {
                #[cfg(unix)]
                {
                    if let Some(pid) = child.id() {
                        unsafe { libc::kill(-(pid as i32), libc::SIGTERM); }
                    }
                }
                        #[cfg(not(unix))]
                        { let _ = child.kill(); }
                        true
                    } else {
                        false
                    }
                };
                if !killed && slot.pid > 0 {
                    // Fallback: kill by PID
                    #[cfg(unix)]
                    unsafe { libc::kill(-(slot.pid as i32), libc::SIGTERM); }
                }
                Ok(true)
            }
            None => Ok(false),
        }
    }
}

#[tauri::command]
pub fn cancel_git_op(
    running_ops: tauri::State<'_, RunningOps>,
    operation_id: String,
) -> Result<bool, String> {
    running_ops.cancel(&operation_id)
}

#[derive(Serialize, Clone, Debug)]
pub struct RemoteProgress {
    pub operation_id: String,
    pub phase: String,
    pub percent: f64,
    pub message: String,
}

fn parse_remote_progress(line: &str) -> Option<GitProgress> {
    let line = line.trim();

    // "Receiving objects: 45% (90/200)"
    if let Some(pos) = line.find("Receiving objects:") {
        let rest = &line[pos + 18..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(GitProgress { phase: "receiving".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(GitProgress { phase: "receiving".into(), percent: 0.0, message: line.to_string() });
    }

    // "Resolving deltas: 45%"
    if let Some(pos) = line.find("Resolving deltas:") {
        let rest = &line[pos + 17..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(GitProgress { phase: "resolving".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(GitProgress { phase: "resolving".into(), percent: 0.0, message: line.to_string() });
    }

    // "remote: Counting objects: 45%"
    if line.contains("Counting objects:") {
        let pos = line.find("Counting objects:").unwrap();
        let rest = &line[pos + 17..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(GitProgress { phase: "counting".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(GitProgress { phase: "counting".into(), percent: 0.0, message: line.to_string() });
    }

    // "remote: Compressing objects: 45%"
    if line.contains("Compressing objects:") {
        let pos = line.find("Compressing objects:").unwrap();
        let rest = &line[pos + 20..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(GitProgress { phase: "compressing".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(GitProgress { phase: "compressing".into(), percent: 0.0, message: line.to_string() });
    }

    // "Unpacking objects: 45%"
    if line.contains("Unpacking objects:") {
        let pos = line.find("Unpacking objects:").unwrap();
        let rest = &line[pos + 18..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(GitProgress { phase: "unpacking".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(GitProgress { phase: "unpacking".into(), percent: 0.0, message: line.to_string() });
    }

    // "Writing objects: 45%" (push)
    if line.contains("Writing objects:") {
        let pos = line.find("Writing objects:").unwrap();
        let rest = &line[pos + 16..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(GitProgress { phase: "writing".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(GitProgress { phase: "writing".into(), percent: 0.0, message: line.to_string() });
    }

    // "Enumerating objects:" (indeterminate)
    if line.contains("Enumerating objects:") {
        return Some(GitProgress { phase: "enumerating".into(), percent: 0.0, message: line.to_string() });
    }

    // "From <url>" (fetch source)
    if line.starts_with("From ") || line.starts_with("from ") {
        return Some(GitProgress { phase: "info".into(), percent: 0.0, message: line.to_string() });
    }

    // "Updating files: 45%" (checkout during pull)
    if line.contains("Updating files:") || line.contains("Checking out files:") {
        let pos = line.find(": ").map(|p| p + 2).unwrap_or(0);
        let rest = &line[pos..];
        if let Some(pct_end) = rest.find('%') {
            if let Ok(pct) = rest[..pct_end].trim().parse::<f64>() {
                return Some(GitProgress { phase: "checkout".into(), percent: pct, message: line.to_string() });
            }
        }
        return Some(GitProgress { phase: "checkout".into(), percent: 0.0, message: line.to_string() });
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_receiving_objects() {
        let p = parse_remote_progress("Receiving objects: 45% (90/200)").unwrap();
        assert_eq!(p.phase, "receiving");
        assert_eq!(p.percent, 45.0);
    }

    #[test]
    fn parses_resolving_deltas() {
        let p = parse_remote_progress("Resolving deltas: 100% (200/200)").unwrap();
        assert_eq!(p.phase, "resolving");
        assert_eq!(p.percent, 100.0);
    }

    #[test]
    fn parses_writing_objects() {
        let p = parse_remote_progress("Writing objects: 75%").unwrap();
        assert_eq!(p.phase, "writing");
        assert_eq!(p.percent, 75.0);
    }

    #[test]
    fn parses_remote_counting() {
        let p = parse_remote_progress("remote: Counting objects: 10%").unwrap();
        assert_eq!(p.phase, "counting");
        assert_eq!(p.percent, 10.0);
    }

    #[test]
    fn parses_enumerating() {
        let p = parse_remote_progress("Enumerating objects: 50").unwrap();
        assert_eq!(p.phase, "enumerating");
        assert_eq!(p.percent, 0.0);
    }

    #[test]
    fn ignores_unrelated_lines() {
        assert!(parse_remote_progress("Everything up-to-date").is_none());
        assert!(parse_remote_progress("Already up to date.").is_none());
    }
}
