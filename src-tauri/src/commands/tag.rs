use serde::Serialize;
use tokio::process::Command;
use super::op_lock::RepoLocks;

#[derive(Serialize)]
pub struct Tag {
    pub name: String,
    pub hash: String,
    pub annotated: bool,
    pub message: String,
    pub author: String,
    pub date: String,
}

pub async fn git_tag_list(path: &str) -> Result<Vec<Tag>, String> {
    // List tags with details
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "tag", "--sort=-creatordate",
               "--format=%(refname:short)|%(objectname)|%(subject)|%(authorname)|%(creatordate:iso)|%(objecttype)"])
        .output()
        .await
        .map_err(|e| format!("Failed to list tags: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_tag_list_output(&stdout))
}

fn parse_tag_list_output(stdout: &str) -> Vec<Tag> {
    stdout
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(6, '|').collect();
            if parts.len() >= 6 {
                Some(Tag {
                    name: parts[0].to_string(),
                    hash: parts[1].to_string(),
                    message: parts[2].to_string(),
                    author: parts[3].to_string(),
                    date: parts[4].to_string(),
                    annotated: parts[5] == "tag",
                })
            } else {
                None
            }
        })
        .collect()
}

pub async fn git_tag_create(
    path: &str,
    name: &str,
    target: Option<&str>,
    message: Option<&str>,
) -> Result<String, String> {
    let mut args = vec!["--no-pager", "-C", path, "tag"];

    if let Some(msg) = message {
        // Annotated tag
        args.push("-a");
        args.push(name);
        args.push("-m");
        args.push(msg);
    } else {
        // Lightweight tag
        args.push(name);
    }

    if let Some(t) = target {
        args.push(t);
    }

    let output = Command::new("git")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to create tag: {}", e))?;

    if output.status.success() {
        Ok(format!("Created tag '{}'", name))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_annotated_and_lightweight_tags() {
        let tags = parse_tag_list_output(
            "v1.0.0|abc123|Release 1.0|Alice|2026-06-01 09:00:00 +0700|tag\nv1.0.1|def456|Patch|Bob|2026-06-01 10:00:00 +0700|commit\n",
        );

        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].name, "v1.0.0");
        assert!(tags[0].annotated);
        assert_eq!(tags[1].hash, "def456");
        assert!(!tags[1].annotated);
    }

    #[test]
    fn skips_malformed_tag_lines() {
        let tags = parse_tag_list_output("missing|fields\nv1|abc|msg|author|date|commit\n");

        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "v1");
    }
}

pub async fn git_tag_delete(path: &str, name: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "tag", "-d", name])
        .output()
        .await
        .map_err(|e| format!("Failed to delete tag: {}", e))?;

    if output.status.success() {
        Ok(format!("Deleted tag '{}'", name))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub async fn git_tag_push(path: &str, name: &str, remote: Option<&str>) -> Result<String, String> {
    let remote = remote.unwrap_or("origin");
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "push", remote, name])
        .output()
        .await
        .map_err(|e| format!("Failed to push tag: {}", e))?;

    if output.status.success() {
        Ok(format!("Pushed tag '{}' to {}", name, remote))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Tauri commands
#[tauri::command]
pub async fn tag_list(path: String) -> Result<Vec<Tag>, String> {
    git_tag_list(&path).await
}

#[tauri::command]
pub async fn tag_create(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    name: String,
    target: Option<String>,
    message: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    git_tag_create(&path, &name, target.as_deref(), message.as_deref()).await
}

#[tauri::command]
pub async fn tag_delete(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    name: String,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    git_tag_delete(&path, &name).await
}

#[tauri::command]
pub async fn tag_push(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
    name: String,
    remote: Option<String>,
) -> Result<String, String> {
    let _guard = locks.acquire(&path).await;
    git_tag_push(&path, &name, remote.as_deref()).await
}
