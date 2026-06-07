use serde::Serialize;
use tokio::process::Command;
use super::op_lock::RepoLocks;

#[derive(Serialize)]
pub struct BisectStatus {
    pub running: bool,
    pub current_commit: Option<String>,
    pub remaining: Option<u32>,
    pub step: Option<u32>,
    pub log: Vec<String>,
    pub first_bad: Option<String>,
}

/// Start a bisect session: `git bisect start`, then set bad/good.
#[tauri::command]
pub async fn bisect_start(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    bad: String,
    good: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;

    // Reset any existing bisect first
    Command::new("git")
        .args(["-C", &path, "bisect", "reset"])
        .output().await.ok();

    // Start
    let start = Command::new("git")
        .args(["-C", &path, "bisect", "start"])
        .output().await
        .map_err(|e| format!("Bisect start failed: {}", e))?;
    if !start.status.success() {
        return Err(String::from_utf8_lossy(&start.stderr).to_string());
    }

    // Set bad
    let bad_result = Command::new("git")
        .args(["-C", &path, "bisect", "bad", &bad])
        .output().await
        .map_err(|e| format!("Bisect bad failed: {}", e))?;
    if !bad_result.status.success() {
        return Err(String::from_utf8_lossy(&bad_result.stderr).to_string());
    }

    // Set good
    if let Some(g) = good {
        let good_result = Command::new("git")
            .args(["-C", &path, "bisect", "good", &g])
            .output().await
            .map_err(|e| format!("Bisect good failed: {}", e))?;
        if !good_result.status.success() {
            return Err(String::from_utf8_lossy(&good_result.stderr).to_string());
        }
    }

    Ok("Bisect started".to_string())
}

/// Mark current commit as good: `git bisect good`
#[tauri::command]
pub async fn bisect_good(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<BisectStatus, String> {
    let _guard = locks.acquire(&path).await;
    run_bisect_step(&path, "good").await
}

/// Mark current commit as bad: `git bisect bad`
#[tauri::command]
pub async fn bisect_bad(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<BisectStatus, String> {
    let _guard = locks.acquire(&path).await;
    run_bisect_step(&path, "bad").await
}

/// Skip current commit: `git bisect skip`
#[tauri::command]
pub async fn bisect_skip(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<BisectStatus, String> {
    let _guard = locks.acquire(&path).await;
    run_bisect_step(&path, "skip").await
}

/// Get current bisect status
#[tauri::command]
pub async fn bisect_status(path: String) -> Result<BisectStatus, String> {
    get_bisect_status(&path).await
}

/// Reset bisect
#[tauri::command]
pub async fn bisect_reset(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    let output = Command::new("git")
        .args(["-C", &path, "bisect", "reset"])
        .output().await
        .map_err(|e| format!("Bisect reset failed: {}", e))?;

    if output.status.success() {
        Ok("Bisect reset".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Get diff for the current bisect candidate (against the parent)
#[tauri::command]
pub async fn bisect_candidate_diff(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", &path, "diff", "-m", "HEAD~1", "HEAD"])
        .output().await
        .map_err(|e| format!("Failed to get candidate diff: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(if stdout.is_empty() { "No diff available".to_string() } else { stdout })
    } else {
        // Fallback: show log for current HEAD
        let log_output = Command::new("git")
            .args(["--no-pager", "-C", &path, "log", "-1", "--oneline"])
            .output().await
            .map_err(|e| format!("Failed: {}", e))?;
        Ok(String::from_utf8_lossy(&log_output.stdout).to_string())
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async fn run_bisect_step(path: &str, step: &str) -> Result<BisectStatus, String> {
    let output = Command::new("git")
        .args(["-C", path, "bisect", step])
        .output().await
        .map_err(|e| format!("Bisect {} failed: {}", step, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Check if bisect is finished
        if stderr.contains("first bad commit") || stderr.contains("is the first bad commit") {
            let first_bad = extract_first_bad(&stderr);
            return Ok(BisectStatus {
                running: false,
                current_commit: None,
                remaining: Some(0),
                step: None,
                log: vec![stderr.to_string()],
                first_bad,
            });
        }
        return Err(stderr.to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_status_output(&stdout)
}

async fn get_bisect_status(path: &str) -> Result<BisectStatus, String> {
    // Check if bisect is running by looking for BISECT_LOG
    let bisect_log_path = std::path::Path::new(path).join(".git").join("BISECT_LOG");
    if !bisect_log_path.exists() {
        return Ok(BisectStatus {
            running: false,
            current_commit: None,
            remaining: None,
            step: None,
            log: vec![],
            first_bad: None,
        });
    }

    // Run bisect visualize / bisect log to get current state
    let log_output = Command::new("git")
        .args(["-C", path, "bisect", "log"])
        .output().await
        .map_err(|e| format!("Bisect log failed: {}", e))?;
    let log_lines: Vec<String> = String::from_utf8_lossy(&log_output.stdout)
        .lines().map(|l| l.to_string()).collect();

    // Get current commit
    let head = Command::new("git")
        .args(["-C", path, "rev-parse", "--short", "HEAD"])
        .output().await
        .map_err(|e| format!("Rev-parse failed: {}", e))?;
    let current_commit = if head.status.success() {
        Some(String::from_utf8_lossy(&head.stdout).trim().to_string())
    } else {
        None
    };

    Ok(BisectStatus {
        running: true,
        current_commit,
        remaining: None,
        step: None,
        log: log_lines,
        first_bad: None,
    })
}

fn parse_status_output(stdout: &str) -> Result<BisectStatus, String> {
    let text = stdout.trim();

    // Parse: "Bisecting: X revisions left to test after this (roughly Y steps)"
    let remaining = text.split(' ').find_map(|w| w.parse::<u32>().ok());

    // Get current commit
    let current_commit = text.split(' ').next().map(|s| s.to_string());

    Ok(BisectStatus {
        running: true,
        current_commit,
        remaining,
        step: None,
        log: vec![text.to_string()],
        first_bad: None,
    })
}

fn extract_first_bad(stderr: &str) -> Option<String> {
    // "X is the first bad commit" or similar
    for line in stderr.lines() {
        if line.contains("is the first bad commit") {
            let hash = line.split(' ').next()?;
            if hash.len() >= 7 {
                return Some(hash.to_string());
            }
            return Some(hash.to_string());
        }
        if line.starts_with("first bad commit:") {
            let hash = line.split(':').nth(1)?.trim();
            if !hash.is_empty() {
                return Some(hash.to_string());
            }
        }
    }
    None
}
