use std::process::Command;

#[tauri::command]
pub fn file_diff(path: String, file_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C", &path,
            "diff",
            "--no-color",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub fn commit_diff(path: String, commit_hash: String, file_path: Option<String>) -> Result<String, String> {
    let diff_target = if commit_hash == "HEAD" {
        "HEAD~1..HEAD".to_string()
    } else {
        format!("{}~1..{}", commit_hash, commit_hash)
    };

    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "diff".to_string(),
        "--no-color".to_string(),
        diff_target,
    ];

    if let Some(fp) = file_path {
        args.push("--".to_string());
        args.push(fp);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub fn staged_diff(path: String, file_path: Option<String>) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "diff".to_string(),
        "--cached".to_string(),
        "--no-color".to_string(),
    ];

    if let Some(fp) = file_path {
        args.push("--".to_string());
        args.push(fp);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Diff failed: {}", stderr.trim()))
    }
}
