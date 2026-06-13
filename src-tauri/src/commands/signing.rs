use std::process::Command;

/// Get signing configuration for a repo
#[derive(Debug, Clone, serde::Serialize)]
pub struct SigningConfig {
    #[serde(rename = "signingKey")]
    pub signing_key: String,
    #[serde(rename = "commitGpgsign")]
    pub commit_gpgsign: bool,
    #[serde(rename = "gpgFormat")]
    pub gpg_format: String,
    #[serde(rename = "allowedSignersFile")]
    pub allowed_signers_file: String,
}

#[tauri::command]
pub async fn get_signing_config(repo_path: String) -> SigningConfig {
    let signing_key = Command::new("git")
        .args(["-C", &repo_path, "config", "user.signingkey"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8_lossy(&o.stdout).trim().to_string().into()
            } else {
                None
            }
        })
        .unwrap_or_default();

    let commit_gpgsign = Command::new("git")
        .args(["-C", &repo_path, "config", "--bool", "commit.gpgsign"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim() == "true")
            } else {
                Some(false)
            }
        })
        .unwrap_or(false);

    let gpg_format = Command::new("git")
        .args(["-C", &repo_path, "config", "gpg.format"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8_lossy(&o.stdout).trim().to_string().into()
            } else {
                None
            }
        })
        .unwrap_or_else(|| "openpgp".to_string());

    let allowed_signers_file = Command::new("git")
        .args(["-C", &repo_path, "config", "gpg.ssh.allowedSignersFile"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8_lossy(&o.stdout).trim().to_string().into()
            } else {
                None
            }
        })
        .unwrap_or_default();

    SigningConfig {
        signing_key,
        commit_gpgsign,
        gpg_format,
        allowed_signers_file,
    }
}

/// Verify GPG/SSH commit signature
#[tauri::command]
pub async fn verify_signature(repo_path: String, commit_hash: String) -> Result<SignatureVerification, String> {
    // First try GPG signature
    let output = Command::new("git")
        .args(["-C", &repo_path, "verify-commit", &commit_hash])
        .output()
        .map_err(|e| format!("Failed to run git verify-commit: {}", e))?;

    if output.status.success() {
        // GPG signature is good - get signer info
        let signer = get_commit_signer(&repo_path, &commit_hash)?;
        return Ok(SignatureVerification {
            commit_hash,
            signature_type: "gpg".to_string(),
            status: "valid".to_string(),
            signer_name: signer.name,
            signer_email: signer.email,
            key_fingerprint: signer.fingerprint,
        });
    }

    // Try SSH signature
    let output = Command::new("git")
        .args(["-C", &repo_path, "verify-commit", "--format=%G?", &commit_hash])
        .output()
        .map_err(|e| format!("Failed to run git verify-commit: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let status_char = stdout.chars().next().unwrap_or('U');

    match status_char {
        'G' => {
            // Good SSH signature
            let signer = get_commit_signer(&repo_path, &commit_hash)?;
            Ok(SignatureVerification {
                commit_hash,
                signature_type: "ssh".to_string(),
                status: "valid".to_string(),
                signer_name: signer.name,
                signer_email: signer.email,
                key_fingerprint: signer.fingerprint,
            })
        }
        'B' => Ok(SignatureVerification {
            commit_hash,
            signature_type: "ssh".to_string(),
            status: "bad".to_string(),
            signer_name: "".to_string(),
            signer_email: "".to_string(),
            key_fingerprint: "".to_string(),
        }),
        _ => Ok(SignatureVerification {
            commit_hash,
            signature_type: "none".to_string(),
            status: "unverified".to_string(),
            signer_name: "".to_string(),
            signer_email: "".to_string(),
            key_fingerprint: "".to_string(),
        }),
    }
}

fn get_commit_signer(repo_path: &str, commit_hash: &str) -> Result<CommitSigner, String> {
    let output = Command::new("git")
        .args([
            "-C", repo_path,
            "show",
            &format!("--format=%GN/%GE/%GF"),
            "--quiet",
            commit_hash,
        ])
        .output()
        .map_err(|e| format!("Failed to get commit signer: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stdout.trim().splitn(3, '/').collect();

    let name = parts.get(0).map(|s| s.to_string()).unwrap_or_default();
    let email = parts.get(1).map(|s| s.to_string()).unwrap_or_default();
    let fingerprint = parts.get(2).map(|s| s.to_string()).unwrap_or_default();

    Ok(CommitSigner {
        name,
        email,
        fingerprint,
    })
}

/// Check if a commit is signed (without verification)
#[tauri::command]
pub async fn has_signature(repo_path: String, commit_hash: String) -> Result<bool, String> {
    let output = Command::new("git")
        .args([
            "-C", &repo_path,
            "show",
            "--format=%G?",
            "--quiet",
            &commit_hash,
        ])
        .output()
        .map_err(|e| format!("Failed to check signature: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let status = stdout.trim();
    Ok(status != "N" && !status.is_empty())
}

/// List signing keys available
#[tauri::command]
pub async fn list_signing_keys() -> Result<Vec<SigningKeyInfo>, String> {
    let mut keys = Vec::new();

    // GPG keys
    if let Ok(output) = Command::new("gpg")
        .args(["--list-secret-keys", "--with-colons"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.get(0) == Some(&"sec") || parts.get(0) == Some(&"ssb") {
                let fingerprint = parts.get(4).unwrap_or(&"").to_string();
                let name = parts
                    .get(9)
                    .map(|s| {
                        let parts: Vec<&str> = s.splitn(2, '(').collect();
                        parts.first().unwrap_or(&"").trim().to_string()
                    })
                    .unwrap_or_default();

                keys.push(SigningKeyInfo {
                    key_type: if parts.get(0) == Some(&"sec") {
                        "gpg".to_string()
                    } else {
                        "ssh".to_string()
                    },
                    key_id: fingerprint,
                    name,
                    email: "".to_string(),
                });
            }
        }
    }

    // SSH keys (from ~/.ssh)
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok();
    if let Some(home_dir) = home {
        let ssh_dir = std::path::Path::new(&home_dir).join(".ssh");
        if ssh_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&ssh_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map(|e| e == "pub").unwrap_or(false) {
                        if let Some(name) = path.file_stem() {
                            keys.push(SigningKeyInfo {
                                key_type: "ssh".to_string(),
                                key_id: name.to_string_lossy().to_string(),
                                name: name.to_string_lossy().to_string(),
                                email: "".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(keys)
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SignatureVerification {
    pub commit_hash: String,
    pub signature_type: String,
    pub status: String,
    #[serde(rename = "signerName")]
    pub signer_name: String,
    #[serde(rename = "signerEmail")]
    pub signer_email: String,
    #[serde(rename = "keyFingerprint")]
    pub key_fingerprint: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CommitSigner {
    pub name: String,
    pub email: String,
    pub fingerprint: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SigningKeyInfo {
    #[serde(rename = "keyType")]
    pub key_type: String,
    #[serde(rename = "keyId")]
    pub key_id: String,
    pub name: String,
    pub email: String,
}