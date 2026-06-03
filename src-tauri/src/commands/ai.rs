use serde::{Deserialize, Serialize};
use std::{env, fs};

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequestData {
    pub url: String,
    pub method: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponseData {
    pub status: u16,
    pub body: String,
}

#[derive(Debug, Clone)]
struct NetrcCredential {
    login: String,
    password: String,
}

fn read_netrc_for_host(host: &str) -> Option<NetrcCredential> {
    let home = env::var("HOME").ok()?;
    let netrc = fs::read_to_string(format!("{}/.netrc", home)).ok()?;
    parse_netrc_for_host(&netrc, host)
}

fn parse_netrc_for_host(contents: &str, host: &str) -> Option<NetrcCredential> {
    let tokens: Vec<&str> = contents
        .split_whitespace()
        .filter(|token| !token.starts_with('#'))
        .collect();

    let mut index = 0;
    let mut default_credential: Option<NetrcCredential> = None;

    while index < tokens.len() {
        let marker = tokens[index];
        if marker != "machine" && marker != "default" {
            index += 1;
            continue;
        }

        let machine = if marker == "machine" {
            index += 1;
            tokens.get(index).copied()
        } else {
            Some("default")
        };

        index += 1;
        let mut login: Option<String> = None;
        let mut password: Option<String> = None;

        while index < tokens.len() && tokens[index] != "machine" && tokens[index] != "default" {
            match tokens[index] {
                "login" => {
                    index += 1;
                    login = tokens.get(index).map(|value| value.to_string());
                }
                "password" => {
                    index += 1;
                    password = tokens.get(index).map(|value| value.to_string());
                }
                _ => {}
            }
            index += 1;
        }

        if let (Some(machine), Some(login), Some(password)) = (machine, login, password) {
            let credential = NetrcCredential { login, password };
            if machine == host {
                return Some(credential);
            }
            if machine == "default" {
                default_credential = Some(credential);
            }
        }
    }

    default_credential
}

#[tauri::command]
pub async fn ai_http_request(request: HttpRequestData) -> Result<HttpResponseData, String> {
    let client = reqwest::Client::new();
    let has_auth_header = request.headers.keys().any(|key| {
        key.eq_ignore_ascii_case("authorization") || key.eq_ignore_ascii_case("private-token")
    });
    let mut req_builder = match request.method.to_uppercase().as_str() {
        "POST" => client.post(&request.url),
        "GET" => client.get(&request.url),
        _ => return Err(format!("Unsupported method: {}", request.method)),
    };

    for (k, v) in request.headers {
        req_builder = req_builder.header(k, v);
    }

    if !has_auth_header {
        if let Ok(parsed_url) = reqwest::Url::parse(&request.url) {
            if let Some(host) = parsed_url.host_str() {
                if let Some(credential) = read_netrc_for_host(host) {
                    if host.to_lowercase().contains("gitlab") {
                        req_builder = req_builder.header("PRIVATE-TOKEN", credential.password);
                    } else if host.eq_ignore_ascii_case("github.com") {
                        req_builder = req_builder.header("Authorization", format!("Bearer {}", credential.password));
                    } else {
                        req_builder = req_builder.basic_auth(credential.login, Some(credential.password));
                    }
                }
            }
        }
    }

    if let Some(body_str) = request.body {
        req_builder = req_builder.body(body_str);
    }

    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(HttpResponseData { status, body })
}

#[derive(Serialize)]
pub struct ConventionFile {
    pub name: String,
    pub content: String,
}

/// Reads well-known project convention files (CLAUDE.md, .cursorrules, etc.) from a repo.
/// Returns a list of found files with their content, capped at ~4KB total.
#[tauri::command]
pub async fn read_convention_files(path: String) -> Result<Vec<ConventionFile>, String> {
    let repo = std::path::Path::new(&path);

    // Convention files to search for, in priority order
    let candidates: &[&str] = &[
        "CLAUDE.md",
        ".cursorrules",
        ".cursor/rules",
        ".cursorrules.md",
        ".github/copilot-instructions.md",
        ".windsurfrules",
        ".clinerules",
        "AGENTS.md",
        ".agents.md",
    ];

    let mut found = Vec::new();
    let mut total_bytes: usize = 0;
    let max_total: usize = 4096;

    for &name in candidates {
        let file_path = repo.join(name);
        if file_path.is_file() {
            match fs::read_to_string(&file_path) {
                Ok(content) => {
                    let trimmed = content.trim().to_string();
                    if !trimmed.is_empty() {
                        let remaining = max_total.saturating_sub(total_bytes);
                        if remaining == 0 {
                            break;
                        }
                        let truncated = if trimmed.len() > remaining {
                            format!("{}...(truncated)", &trimmed[..remaining])
                        } else {
                            trimmed
                        };
                        total_bytes += truncated.len();
                        found.push(ConventionFile {
                            name: name.to_string(),
                            content: truncated,
                        });
                    }
                }
                Err(_) => continue,
            }
        }
    }

    Ok(found)
}
