use std::collections::HashMap;
use std::sync::{Arc, Mutex};

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
