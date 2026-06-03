use serde::Serialize;
use tokio::process::Command;
use super::op_lock::RepoLocks;

#[derive(Serialize, Clone, Debug)]
pub struct LfsFile {
    pub path: String,
    pub oid: String,
    pub state: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct LfsStatus {
    pub installed: bool,
    pub tracked_files: Vec<LfsFile>,
    pub dirty_files: Vec<String>,
}

#[tauri::command]
pub async fn lfs_status(path: String) -> Result<LfsStatus, String> {
    if !is_lfs_installed(&path).await? {
        return Ok(LfsStatus {
            installed: false,
            tracked_files: vec![],
            dirty_files: vec![],
        });
    }

    let tracked_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "lfs", "ls-files", "--long"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git lfs ls-files: {}", e))?;

    if !tracked_output.status.success() {
        let stderr = String::from_utf8_lossy(&tracked_output.stderr);
        return Err(format!("Git LFS error: {}", stderr.trim()));
    }

    let status_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "lfs", "status", "--porcelain"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git lfs status: {}", e))?;

    let tracked_stdout = String::from_utf8_lossy(&tracked_output.stdout);
    let dirty_stdout = if status_output.status.success() {
        String::from_utf8_lossy(&status_output.stdout).to_string()
    } else {
        String::new()
    };

    Ok(LfsStatus {
        installed: true,
        tracked_files: parse_lfs_ls_files_output(&tracked_stdout),
        dirty_files: parse_lfs_status_output(&dirty_stdout),
    })
}

#[tauri::command]
pub async fn lfs_pull(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    run_lfs_operation(&path, "pull").await
}

#[tauri::command]
pub async fn lfs_push(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    run_lfs_operation(&path, "push").await
}

async fn is_lfs_installed(path: &str) -> Result<bool, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "lfs", "version"])
        .output()
        .await
        .map_err(|e| format!("Failed to check Git LFS: {}", e))?;

    Ok(output.status.success())
}

async fn run_lfs_operation(path: &str, operation: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "lfs", operation])
        .output()
        .await
        .map_err(|e| format!("Failed to run git lfs {}: {}", operation, e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            Ok(format!("Git LFS {} complete", operation))
        } else {
            Ok(stdout)
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Git LFS {} failed: {}", operation, stderr.trim()))
    }
}

fn parse_lfs_ls_files_output(stdout: &str) -> Vec<LfsFile> {
    stdout
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.trim().splitn(3, ' ').collect();
            if parts.len() < 3 {
                return None;
            }

            Some(LfsFile {
                oid: parts[0].to_string(),
                state: parts[1].to_string(),
                path: parts[2].trim().to_string(),
            })
        })
        .collect()
}

fn parse_lfs_status_output(stdout: &str) -> Vec<String> {
    stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .filter_map(|line| {
            line.split_whitespace()
                .last()
                .map(|path| path.trim_matches('"').to_string())
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_lfs_ls_files_output() {
        let files = parse_lfs_ls_files_output(
            "2f9c7f8d9d1f6a3a4e5b6c7d8e9f012345678901234567890123456789abcdef * assets/demo.mov\nabcdef012345678901234567890123456789abcdef012345678901234567890 - data/model.bin\n",
        );

        assert_eq!(files.len(), 2);
        assert_eq!(files[0].path, "assets/demo.mov");
        assert_eq!(files[0].state, "*");
        assert_eq!(files[1].path, "data/model.bin");
    }

    #[test]
    fn parses_lfs_status_output_paths() {
        let files = parse_lfs_status_output(" M assets/demo.mov\nA  data/model.bin\n");

        assert_eq!(files, vec!["assets/demo.mov", "data/model.bin"]);
    }
}
