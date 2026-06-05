use serde::Serialize;
use std::path::PathBuf;
use tokio::fs;
use tokio::process::Command;

/// GitFlow configuration stored in `.git/config` under `[gitflow]` section.
#[derive(Serialize, Clone, Debug)]
pub struct GitFlowConfig {
    /// Whether GitFlow is initialized for this repo
    pub initialized: bool,
    /// Main branch name (default: "main")
    pub master: String,
    /// Develop branch name (default: "develop")
    pub develop: String,
    /// Feature branch prefix (default: "feature/")
    pub feature_prefix: String,
    /// Release branch prefix (default: "release/")
    pub release_prefix: String,
    /// Hotfix branch prefix (default: "hotfix/")
    pub hotfix_prefix: String,
    /// Version tag prefix (default: "v")
    pub versiontag_prefix: String,
}

impl Default for GitFlowConfig {
    fn default() -> Self {
        Self {
            initialized: false,
            master: "main".to_string(),
            develop: "develop".to_string(),
            feature_prefix: "feature/".to_string(),
            release_prefix: "release/".to_string(),
            hotfix_prefix: "hotfix/".to_string(),
            versiontag_prefix: "v".to_string(),
        }
    }
}

async fn git_config_path(path: &str) -> Result<PathBuf, String> {
    let git_dir_output = Command::new("git")
        .args(["--no-pager", "-C", path, "rev-parse", "--git-dir"])
        .output()
        .await
        .map_err(|e| format!("Failed to find git dir: {}", e))?;

    if !git_dir_output.status.success() {
        return Err("Not a git repository".to_string());
    }

    let git_dir = String::from_utf8_lossy(&git_dir_output.stdout).trim().to_string();
    let config_path = if git_dir.starts_with('/') {
        PathBuf::from(&git_dir).join("config")
    } else {
        PathBuf::from(path).join(&git_dir).join("config")
    };
    Ok(config_path)
}

fn validate_gitflow_config(config: &GitFlowConfig) -> Result<(), String> {
    let branch_names = [
        ("master branch", config.master.as_str()),
        ("develop branch", config.develop.as_str()),
    ];
    for (label, value) in branch_names {
        if value.trim().is_empty() {
            return Err(format!("{} cannot be empty", label));
        }
        if value.trim() != value {
            return Err(format!("{} cannot start or end with whitespace", label));
        }
    }

    let prefixes = [
        ("feature prefix", config.feature_prefix.as_str()),
        ("release prefix", config.release_prefix.as_str()),
        ("hotfix prefix", config.hotfix_prefix.as_str()),
    ];
    for (label, value) in prefixes {
        if value.trim().is_empty() {
            return Err(format!("{} cannot be empty", label));
        }
        if value.trim() != value {
            return Err(format!("{} cannot start or end with whitespace", label));
        }
    }

    if config.versiontag_prefix.trim() != config.versiontag_prefix {
        return Err("version tag prefix cannot start or end with whitespace".to_string());
    }

    Ok(())
}

async fn write_gitflow_config(path: &str, config: &GitFlowConfig) -> Result<(), String> {
    validate_gitflow_config(config)?;
    let git_config_path = git_config_path(path).await?;
    let mut config_content = fs::read_to_string(&git_config_path)
        .await
        .map_err(|e| format!("Failed to read .git/config: {}", e))?;

    if let Some(start) = config_content.find("[gitflow]") {
        let after_section = &config_content[start..];
        let end = after_section[1..]
            .find('[')
            .map(|i| i + 1)
            .unwrap_or(after_section.len());
        config_content.replace_range(start..start + end, "");
    }

    let gitflow_section = format!(
        "\n[gitflow]\n\tmaster = {}\n\tdevelop = {}\n\tfeature = {}\n\trelease = {}\n\thotfix = {}\n\tversiontag = {}\n",
        config.master,
        config.develop,
        config.feature_prefix,
        config.release_prefix,
        config.hotfix_prefix,
        config.versiontag_prefix
    );
    config_content.push_str(&gitflow_section);

    fs::write(&git_config_path, &config_content)
        .await
        .map_err(|e| format!("Failed to write .git/config: {}", e))
}

/// Detect whether GitFlow is initialized by reading `.git/config`.
#[tauri::command]
pub async fn gitflow_detect(path: String) -> Result<GitFlowConfig, String> {
    let git_config_path = git_config_path(&path).await?;
    let config_content = match fs::read_to_string(&git_config_path).await {
        Ok(c) => c,
        Err(_) => return Ok(GitFlowConfig::default()),
    };

    // Look for [gitflow] section
    if let Some(section_start) = config_content.find("[gitflow]") {
        let section = &config_content[section_start..];
        // Find the end of the section (next [ or end of file)
        let section_end = section[1..]
            .find('[')
            .map(|i| i + 1)
            .unwrap_or(section.len());
        let section_body = &section[10..section_end]; // skip "[gitflow]"

        let mut config = GitFlowConfig::default();
        config.initialized = true;

        for line in section_body.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
                continue;
            }
            if let Some((key, value)) = line.split_once('=') {
                let key = key.trim();
                let value = value.trim();
                match key {
                    "master" => config.master = value.to_string(),
                    "develop" => config.develop = value.to_string(),
                    "feature" => config.feature_prefix = value.to_string(),
                    "release" => config.release_prefix = value.to_string(),
                    "hotfix" => config.hotfix_prefix = value.to_string(),
                    "versiontag" => config.versiontag_prefix = value.to_string(),
                    _ => {}
                }
            }
        }

        Ok(config)
    } else {
        Ok(GitFlowConfig::default())
    }
}

/// Initialize GitFlow by writing `[gitflow]` section to `.git/config`
/// and creating the develop branch from main if it doesn't exist.
#[tauri::command]
pub async fn gitflow_init(
    path: String,
    master: String,
    develop: String,
    feature_prefix: String,
    release_prefix: String,
    hotfix_prefix: String,
    versiontag_prefix: String,
) -> Result<GitFlowConfig, String> {
    let config = GitFlowConfig {
        initialized: true,
        master,
        develop,
        feature_prefix,
        release_prefix,
        hotfix_prefix,
        versiontag_prefix,
    };
    validate_gitflow_config(&config)?;

    // Check if develop branch exists
    let check_output = Command::new("git")
        .args(["--no-pager", "-C", &path, "branch", "--list", &config.develop])
        .output()
        .await
        .map_err(|e| format!("Failed to check branches: {}", e))?;

    let develop_exists = String::from_utf8_lossy(&check_output.stdout)
        .lines()
        .any(|l| l.trim().replace("* ", "") == config.develop);

    // Create develop from main if it doesn't exist
    if !develop_exists {
        let create_output = Command::new("git")
            .args(["-C", &path, "branch", &config.develop, &config.master])
            .output()
            .await
            .map_err(|e| format!("Failed to create develop branch: {}", e))?;

        if !create_output.status.success() {
            let stderr = String::from_utf8_lossy(&create_output.stderr);
            return Err(format!("Failed to create develop branch: {}", stderr));
        }
    }

    write_gitflow_config(&path, &config).await?;
    Ok(config)
}

/// Update GitFlow metadata in `.git/config` without creating branches.
#[tauri::command]
pub async fn gitflow_update_config(
    path: String,
    master: String,
    develop: String,
    feature_prefix: String,
    release_prefix: String,
    hotfix_prefix: String,
    versiontag_prefix: String,
) -> Result<GitFlowConfig, String> {
    let config = GitFlowConfig {
        initialized: true,
        master,
        develop,
        feature_prefix,
        release_prefix,
        hotfix_prefix,
        versiontag_prefix,
    };
    write_gitflow_config(&path, &config).await?;
    Ok(config)
}
