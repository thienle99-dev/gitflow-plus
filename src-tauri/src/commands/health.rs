use serde::Serialize;
use std::path::Path;
use tokio::process::Command;

// ─── Health Check ───────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct HealthFinding {
    pub category: String,    // "large_file" | "sensitive_data" | "broken_symlink" | "untracked_secret"
    pub severity: String,    // "warning" | "critical"
    pub path: String,
    pub message: String,
    pub detail: Option<String>,
}

#[derive(Serialize)]
pub struct HealthReport {
    pub findings: Vec<HealthFinding>,
    pub scanned_files: usize,
    pub large_file_threshold_bytes: u64,
}

#[tauri::command]
pub async fn repo_health_check(path: String) -> Result<HealthReport, String> {
    let repo_root = Path::new(&path);
    if !repo_root.join(".git").exists() {
        return Err("Not a git repository".to_string());
    }

    let mut findings = Vec::new();
    let mut scanned = 0usize;
    let large_threshold: u64 = 10 * 1024 * 1024; // 10 MB

    // Collect tracked files via git ls-files
    let tracked_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "ls-files", "-z"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git ls-files: {}", e))?;

    let tracked_files: Vec<String> = String::from_utf8_lossy(&tracked_output.stdout)
        .split('\0')
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();

    // Check LFS tracked patterns
    let lfs_patterns = get_lfs_patterns(&path).await;

    // Scan tracked files
    for rel_path in &tracked_files {
        scanned += 1;
        let full_path = repo_root.join(rel_path);

        // Large file check (not LFS tracked)
        if let Ok(meta) = tokio::fs::metadata(&full_path).await {
            let size = meta.len();
            if size >= large_threshold && !is_lfs_tracked(rel_path, &lfs_patterns) {
                findings.push(HealthFinding {
                    category: "large_file".to_string(),
                    severity: "warning".to_string(),
                    path: rel_path.clone(),
                    message: format!("Large file ({}) not tracked by LFS", human_size(size)),
                    detail: Some("Consider using `git lfs track` for this file type.".to_string()),
                });
            }
        }

        // Sensitive data pattern scan (only text files under 1MB)
        if let Ok(meta) = tokio::fs::metadata(&full_path).await {
            if meta.len() < 1_000_000 {
                if let Ok(content) = tokio::fs::read_to_string(&full_path).await {
                    findings.extend(scan_sensitive_patterns(rel_path, &content));
                }
            }
        }
    }

    // Check for broken symlinks in the worktree (untracked + tracked)
    let symlink_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "ls-files", "-s"])
        .output()
        .await
        .map_err(|e| format!("Failed to check symlinks: {}", e))?;

    for line in String::from_utf8_lossy(&symlink_output.stdout).lines() {
        // Symlinks show mode 120000
        if line.starts_with("120000") {
            let parts: Vec<&str> = line.split('\t').collect();
            if let Some(file_path) = parts.last() {
                let full = repo_root.join(file_path);
                if !full.exists() {
                    findings.push(HealthFinding {
                        category: "broken_symlink".to_string(),
                        severity: "warning".to_string(),
                        path: file_path.to_string(),
                        message: "Broken symlink detected".to_string(),
                        detail: Some("The symlink target does not exist in the working tree.".to_string()),
                    });
                }
            }
        }
    }

    // Check .env and similar secret files that are tracked
    let secret_files = [".env", ".env.local", ".env.production", ".pem", ".key", "id_rsa", "id_ed25519"];
    for name in &secret_files {
        if tracked_files.iter().any(|f| f.ends_with(name)) {
            let matching: Vec<&String> = tracked_files.iter().filter(|f| f.ends_with(name)).collect();
            for mf in matching {
                if !findings.iter().any(|f| f.path == *mf && f.category == "untracked_secret") {
                    findings.push(HealthFinding {
                        category: "untracked_secret".to_string(),
                        severity: "critical".to_string(),
                        path: mf.to_string(),
                        message: format!("Secret file '{}' is tracked in git", name),
                        detail: Some("Add this file to .gitignore and remove from tracking with `git rm --cached`.".to_string()),
                    });
                }
            }
        }
    }

    Ok(HealthReport {
        findings,
        scanned_files: scanned,
        large_file_threshold_bytes: large_threshold,
    })
}

fn scan_sensitive_patterns(path: &str, content: &str) -> Vec<HealthFinding> {
    let mut findings = Vec::new();

    // Skip binary-like files and common non-secret patterns
    let skip_extensions = [
        ".lock", ".sum", ".svg", ".png", ".jpg", ".gif", ".woff", ".woff2",
        ".ttf", ".eot", ".ico", ".pdf", ".zip", ".tar", ".gz",
    ];
    if skip_extensions.iter().any(|ext| path.ends_with(ext)) {
        return findings;
    }

    let patterns: &[(&str, &str, &str)] = &[
        ("AWS Access Key", r"(?i)(AKIA[0-9A-Z]{16})", "critical"),
        ("AWS Secret Key", r"(?i)(aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{40})", "critical"),
        ("GitHub Token", r"(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})", "critical"),
        ("GitLab Token", r"(glpat-[A-Za-z0-9\-_]{20,})", "critical"),
        ("Generic API Key", r#"(?i)(api[_-]?key\s*[=:]\s*['\"][A-Za-z0-9_\-]{20,}['\"])"#, "warning"),
        ("Private Key Header", r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "critical"),
        ("Slack Token", r"(xox[bporas]-[A-Za-z0-9\-]{10,})", "critical"),
        ("Password Assignment", r#"(?i)(password|passwd|pwd)\s*[=:]\s*['\"][^'"]{8,}['\"])"#, "warning"),
    ];

    for (label, pattern, severity) in patterns {
        if let Ok(re) = regex_lite::Regex::new(pattern) {
            if re.is_match(content) {
                findings.push(HealthFinding {
                    category: "sensitive_data".to_string(),
                    severity: severity.to_string(),
                    path: path.to_string(),
                    message: format!("Possible {} detected", label),
                    detail: Some("Review this file for hardcoded secrets. Use environment variables or a secrets manager instead.".to_string()),
                });
            }
        }
    }

    findings
}

async fn get_lfs_patterns(path: &str) -> Vec<String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "lfs", "track"])
        .output()
        .await;

    match output {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout)
            .lines()
            .filter_map(|line| {
                let trimmed = line.trim();
                // Lines look like: "Listing tracked patterns\n    *.psd (*.psd)"
                // or just "*.psd"
                if trimmed.starts_with("Listing") || trimmed.is_empty() {
                    None
                } else {
                    // Extract the pattern between quotes or the raw pattern
                    let pattern = if let Some(start) = trimmed.find('(') {
                        if let Some(end) = trimmed[start..].find(')') {
                            &trimmed[start + 1..start + end]
                        } else {
                            trimmed
                        }
                    } else {
                        trimmed
                    };
                    Some(pattern.trim().to_string())
                }
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn is_lfs_tracked(path: &str, patterns: &[String]) -> bool {
    let ext = Path::new(path)
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();

    patterns.iter().any(|p| {
        let clean = p.trim_start_matches('*');
        path.ends_with(clean) || ext == clean
    })
}

fn human_size(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.1} GB", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.1} MB", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}

// ─── Diagnostic Bundle ──────────────────────────────────────────

#[derive(Serialize)]
pub struct DiagnosticBundle {
    pub app_version: String,
    pub git_version: String,
    pub os_info: String,
    pub repo_path: String,
    pub current_branch: String,
    pub remote_url: Option<String>,
    pub head_commit: String,
    pub branch_count: usize,
    pub tag_count: usize,
    pub total_commits: usize,
    pub staged_files: usize,
    pub unstaged_files: usize,
    pub untracked_files: usize,
    pub lfs_enabled: bool,
    pub conflict_state: bool,
    pub rebase_in_progress: bool,
    pub merge_in_progress: bool,
    pub recent_errors: Vec<String>,
}

#[tauri::command]
pub async fn diagnostic_bundle(path: String) -> Result<DiagnosticBundle, String> {
    let repo_root = Path::new(&path);
    if !repo_root.join(".git").exists() {
        return Err("Not a git repository".to_string());
    }

    // Git version
    let git_version = Command::new("git")
        .args(["--version"])
        .output()
        .await
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // OS info
    let os_info = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);

    // Current branch
    let branch = Command::new("git")
        .args(["--no-pager", "-C", &path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .await
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Remote URL
    let remote_url = Command::new("git")
        .args(["--no-pager", "-C", &path, "remote", "get-url", "origin"])
        .output()
        .await
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        });

    // HEAD commit
    let head_commit = Command::new("git")
        .args(["--no-pager", "-C", &path, "rev-parse", "--short", "HEAD"])
        .output()
        .await
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Branch count
    let branch_count = Command::new("git")
        .args(["--no-pager", "-C", &path, "branch", "-a"])
        .output()
        .await
        .ok()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .filter(|l| !l.trim().is_empty())
                .count()
        })
        .unwrap_or(0);

    // Tag count
    let tag_count = Command::new("git")
        .args(["--no-pager", "-C", &path, "tag"])
        .output()
        .await
        .ok()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .filter(|l| !l.trim().is_empty())
                .count()
        })
        .unwrap_or(0);

    // Total commits (approximate)
    let total_commits = Command::new("git")
        .args(["--no-pager", "-C", &path, "rev-list", "--count", "HEAD"])
        .output()
        .await
        .ok()
        .and_then(|o| {
            String::from_utf8_lossy(&o.stdout)
                .trim()
                .parse::<usize>()
                .ok()
        })
        .unwrap_or(0);

    // Status counts
    let status_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "status", "--porcelain"])
        .output()
        .await
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default();

    let mut staged = 0usize;
    let mut unstaged = 0usize;
    let mut untracked = 0usize;
    for line in status_output.lines() {
        if line.len() < 3 { continue; }
        let x = line.chars().nth(0).unwrap_or(' ');
        let y = line.chars().nth(1).unwrap_or(' ');
        if x == '?' && y == '?' {
            untracked += 1;
        } else {
            if x != ' ' && x != '?' { staged += 1; }
            if y != ' ' && y != '?' { unstaged += 1; }
        }
    }

    // LFS enabled
    let lfs_enabled = repo_root.join(".gitattributes").exists()
        && tokio::fs::read_to_string(repo_root.join(".gitattributes"))
            .await
            .map(|c| c.contains("filter=lfs"))
            .unwrap_or(false);

    // Conflict state
    let conflict_state = Command::new("git")
        .args(["--no-pager", "-C", &path, "ls-files", "-u"])
        .output()
        .await
        .ok()
        .map(|o| !o.stdout.is_empty())
        .unwrap_or(false);

    // Rebase in progress
    let rebase_in_progress = repo_root.join(".git").join("rebase-merge").exists()
        || repo_root.join(".git").join("rebase-apply").exists();

    // Merge in progress
    let merge_in_progress = repo_root.join(".git").join("MERGE_HEAD").exists();

    // Recent errors from reflog (last 5 errors)
    let recent_errors: Vec<String> = Command::new("git")
        .args(["--no-pager", "-C", &path, "reflog", "--no-abbrev", "-20"])
        .output()
        .await
        .ok()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .filter(|l| l.contains("error") || l.contains("failed") || l.contains("conflict"))
                .take(5)
                .map(|l| l.trim().to_string())
                .collect()
        })
        .unwrap_or_default();

    Ok(DiagnosticBundle {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        git_version,
        os_info,
        repo_path: path,
        current_branch: branch,
        remote_url,
        head_commit,
        branch_count,
        tag_count,
        total_commits,
        staged_files: staged,
        unstaged_files: unstaged,
        untracked_files: untracked,
        lfs_enabled,
        conflict_state,
        rebase_in_progress,
        merge_in_progress,
        recent_errors,
    })
}

// ─── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_aws_key_in_content() {
        let findings = scan_sensitive_patterns(
            "config.yml",
            "aws_access_key_id = AKIAIOSFODNN7EXAMPLE",
        );
        assert!(findings.iter().any(|f| f.category == "sensitive_data"));
    }

    #[test]
    fn detects_github_token_in_content() {
        let findings = scan_sensitive_patterns(
            ".env",
            "GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop",
        );
        assert!(findings.iter().any(|f| f.message.contains("GitHub Token")));
    }

    #[test]
    fn detects_private_key_header() {
        let findings = scan_sensitive_patterns(
            "server.pem",
            "-----BEGIN RSA PRIVATE KEY-----\nMIIE...",
        );
        assert!(findings.iter().any(|f| f.message.contains("Private Key")));
    }

    #[test]
    fn skips_binary_extensions() {
        let findings = scan_sensitive_patterns(
            "image.png",
            "AKIAIOSFODNN7EXAMPLE",
        );
        assert!(findings.is_empty());
    }

    #[test]
    fn no_findings_for_clean_content() {
        let findings = scan_sensitive_patterns(
            "app.ts",
            "const greeting = 'hello world';",
        );
        assert!(findings.is_empty());
    }

    #[test]
    fn human_size_formats_correctly() {
        assert_eq!(human_size(500), "500 B");
        assert_eq!(human_size(2048), "2.0 KB");
        assert_eq!(human_size(5_242_880), "5.0 MB");
        assert_eq!(human_size(2_147_483_648), "2.0 GB");
    }

    #[test]
    fn lfs_pattern_matching() {
        let patterns = vec!["*.psd".to_string(), "*.zip".to_string()];
        assert!(is_lfs_tracked("assets/design.psd", &patterns));
        assert!(is_lfs_tracked("data/archive.zip", &patterns));
        assert!(!is_lfs_tracked("src/main.rs", &patterns));
    }
}
