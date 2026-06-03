use std::path::Path;
use tokio::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LintDiagnostic {
    pub file: String,
    pub line: Option<u32>,
    pub column: Option<u32>,
    pub rule: Option<String>,
    pub severity: String, // "error" | "warning" | "info"
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LintResponse {
    pub diagnostics: Vec<LintDiagnostic>,
    pub linters_run: Vec<String>,
}

// ESLint structures
#[derive(Deserialize)]
struct EslintFile {
    #[serde(rename = "filePath")]
    file_path: String,
    messages: Vec<EslintMessage>,
}

#[derive(Deserialize)]
struct EslintMessage {
    line: Option<u32>,
    column: Option<u32>,
    #[serde(rename = "ruleId")]
    rule_id: Option<String>,
    severity: u32, // 1 = warning, 2 = error
    message: String,
}

// Biome structures
#[derive(Deserialize)]
struct BiomeOutput {
    diagnostics: Option<Vec<BiomeDiagnostic>>,
}

#[derive(Deserialize)]
struct BiomeDiagnostic {
    category: Option<String>,
    severity: String, // "error" | "warning" | "info" | "hint"
    description: String,
    location: Option<BiomeLocation>,
}

#[derive(Deserialize)]
struct BiomeLocation {
    path: Option<BiomePath>,
}

#[derive(Deserialize)]
struct BiomePath {
    file: String,
}

// Ruff structures
#[derive(Deserialize)]
struct RuffMessage {
    code: String,
    message: String,
    filename: String,
    location: RuffLocation,
}

#[derive(Deserialize)]
struct RuffLocation {
    row: u32,
    column: u32,
}

// golangci-lint structures
#[derive(Deserialize)]
struct GolangciOutput {
    #[serde(rename = "Issues")]
    issues: Option<Vec<GolangciIssue>>,
}

#[derive(Deserialize)]
struct GolangciIssue {
    #[serde(rename = "FromLinter")]
    from_linter: Option<String>,
    #[serde(rename = "Text")]
    text: String,
    #[serde(rename = "Pos")]
    pos: GolangciPos,
}

#[derive(Deserialize)]
struct GolangciPos {
    #[serde(rename = "Filename")]
    filename: String,
    #[serde(rename = "Line")]
    line: u32,
    #[serde(rename = "Column")]
    column: u32,
}

// Cargo clippy structures
#[derive(Deserialize)]
struct CargoMessageLine {
    reason: String,
    message: Option<CargoDiagnostic>,
}

#[derive(Deserialize)]
struct CargoDiagnostic {
    message: String,
    code: Option<CargoCode>,
    level: String,
    spans: Vec<CargoSpan>,
}

#[derive(Deserialize)]
struct CargoCode {
    code: String,
}

#[derive(Deserialize)]
struct CargoSpan {
    file_name: String,
    line_start: u32,
    column_start: u32,
    is_primary: bool,
}

// Helper: Get staged files
async fn get_staged_files(repo_path: &str) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .args([
            "-C",
            repo_path,
            "diff",
            "--name-only",
            "--cached",
            "--diff-filter=d",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let files = stdout
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    Ok(files)
}

// Helper: Detect configuration files
fn detect_linters(repo_path: &str) -> Vec<String> {
    let mut detected = Vec::new();
    let path = Path::new(repo_path);

    // ESLint
    let eslint_files = [
        ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yaml", ".eslintrc.yml",
        ".eslintrc.json", "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs"
    ];
    let has_eslint = eslint_files.iter().any(|f| path.join(f).exists()) || {
        if let Ok(pkg_json) = std::fs::read_to_string(path.join("package.json")) {
            pkg_json.contains("\"eslintConfig\"")
        } else {
            false
        }
    };
    if has_eslint {
        detected.push("eslint".to_string());
    }

    // Biome
    if path.join("biome.json").exists() {
        detected.push("biome".to_string());
    }

    // Ruff
    if path.join("ruff.toml").exists() || path.join(".ruff.toml").exists() || {
        if let Ok(pyproj) = std::fs::read_to_string(path.join("pyproject.toml")) {
            pyproj.contains("[tool.ruff]")
        } else {
            false
        }
    } {
        detected.push("ruff".to_string());
    }

    // golangci-lint
    let golangci_files = [
        ".golangci.yml", ".golangci.yaml", ".golangci.toml", ".golangci.json"
    ];
    if golangci_files.iter().any(|f| path.join(f).exists()) {
        detected.push("golangci-lint".to_string());
    }

    // Clippy
    if path.join("Cargo.toml").exists() {
        detected.push("clippy".to_string());
    }

    detected
}

#[tauri::command]
pub async fn run_project_linters(repo_path: String) -> Result<LintResponse, String> {
    let staged_files = get_staged_files(&repo_path).await?;
    if staged_files.is_empty() {
        return Ok(LintResponse {
            diagnostics: Vec::new(),
            linters_run: Vec::new(),
        });
    }

    let detected = detect_linters(&repo_path);
    let mut diagnostics = Vec::new();
    let mut linters_run = Vec::new();

    // 1. Run ESLint
    if detected.contains(&"eslint".to_string()) {
        let eslint_extensions = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs"];
        let target_files: Vec<&String> = staged_files
            .iter()
            .filter(|f| eslint_extensions.iter().any(|ext| f.ends_with(ext)))
            .collect();

        if !target_files.is_empty() {
            linters_run.push("eslint".to_string());
            let mut cmd = Command::new("npx");
            cmd.current_dir(&repo_path)
                .args(["eslint", "--format=json"]);
            for f in &target_files {
                cmd.arg(f);
            }

            if let Ok(output) = cmd.output().await {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Ok(eslint_files) = serde_json::from_str::<Vec<EslintFile>>(&stdout) {
                    for f in eslint_files {
                        // Make file path relative to repo
                        let relative_file = Path::new(&f.file_path)
                            .strip_prefix(Path::new(&repo_path))
                            .unwrap_or(Path::new(&f.file_path))
                            .to_string_lossy()
                            .to_string();

                        for msg in f.messages {
                            diagnostics.push(LintDiagnostic {
                                file: relative_file.clone(),
                                line: msg.line,
                                column: msg.column,
                                rule: msg.rule_id,
                                severity: if msg.severity == 2 { "error".to_string() } else { "warning".to_string() },
                                message: msg.message,
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Run Biome
    if detected.contains(&"biome".to_string()) {
        let biome_extensions = [".js", ".jsx", ".ts", ".tsx", ".json", ".css"];
        let target_files: Vec<&String> = staged_files
            .iter()
            .filter(|f| biome_extensions.iter().any(|ext| f.ends_with(ext)))
            .collect();

        if !target_files.is_empty() {
            linters_run.push("biome".to_string());
            let mut cmd = Command::new("npx");
            cmd.current_dir(&repo_path)
                .args(["@biomejs/biome", "lint", "--reporter=json"]);
            for f in &target_files {
                cmd.arg(f);
            }

            if let Ok(output) = cmd.output().await {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Ok(biome_out) = serde_json::from_str::<BiomeOutput>(&stdout) {
                    if let Some(biome_diagnostics) = biome_out.diagnostics {
                        for d in biome_diagnostics {
                            let file_name = d.location
                                .as_ref()
                                .and_then(|loc| loc.path.as_ref())
                                .map(|p| p.file.clone())
                                .unwrap_or_default();

                            let severity = match d.severity.as_str() {
                                "error" => "error",
                                "warning" => "warning",
                                _ => "info",
                            };

                            diagnostics.push(LintDiagnostic {
                                file: file_name,
                                line: None, // Biome JSON details span offsets instead of line/col directly
                                column: None,
                                rule: d.category,
                                severity: severity.to_string(),
                                message: d.description,
                            });
                        }
                    }
                }
            }
        }
    }

    // 3. Run Ruff
    if detected.contains(&"ruff".to_string()) {
        let python_extensions = [".py"];
        let target_files: Vec<&String> = staged_files
            .iter()
            .filter(|f| python_extensions.iter().any(|ext| f.ends_with(ext)))
            .collect();

        if !target_files.is_empty() {
            linters_run.push("ruff".to_string());
            let mut cmd = Command::new("ruff");
            cmd.current_dir(&repo_path)
                .args(["check", "--format=json"]);
            for f in &target_files {
                cmd.arg(f);
            }

            if let Ok(output) = cmd.output().await {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Ok(ruff_messages) = serde_json::from_str::<Vec<RuffMessage>>(&stdout) {
                    for msg in ruff_messages {
                        diagnostics.push(LintDiagnostic {
                            file: msg.filename,
                            line: Some(msg.location.row),
                            column: Some(msg.location.column),
                            rule: Some(msg.code),
                            severity: "error".to_string(), // Ruff checks are usually errors
                            message: msg.message,
                        });
                    }
                }
            }
        }
    }

    // 4. Run golangci-lint
    if detected.contains(&"golangci-lint".to_string()) {
        let go_extensions = [".go"];
        let has_go = staged_files.iter().any(|f| go_extensions.iter().any(|ext| f.ends_with(ext)));

        if has_go {
            linters_run.push("golangci-lint".to_string());
            let mut cmd = Command::new("golangci-lint");
            cmd.current_dir(&repo_path)
                .args(["run", "--out-format=json"]);

            if let Ok(output) = cmd.output().await {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Ok(golang_out) = serde_json::from_str::<GolangciOutput>(&stdout) {
                    if let Some(issues) = golang_out.issues {
                        for issue in issues {
                            // Filter issues so we only report them if they are in our staged files list
                            if staged_files.contains(&issue.pos.filename) {
                                diagnostics.push(LintDiagnostic {
                                    file: issue.pos.filename.clone(),
                                    line: Some(issue.pos.line),
                                    column: Some(issue.pos.column),
                                    rule: issue.from_linter,
                                    severity: "error".to_string(),
                                    message: issue.text,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // 5. Run Clippy
    if detected.contains(&"clippy".to_string()) {
        let rust_extensions = [".rs"];
        let has_rust = staged_files.iter().any(|f| rust_extensions.iter().any(|ext| f.ends_with(ext)));

        if has_rust {
            linters_run.push("clippy".to_string());
            let mut cmd = Command::new("cargo");
            cmd.current_dir(&repo_path)
                .args(["clippy", "--message-format=json"]);

            if let Ok(output) = cmd.output().await {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if let Ok(cargo_line) = serde_json::from_str::<CargoMessageLine>(line) {
                        if cargo_line.reason == "compiler-message" {
                            if let Some(diag) = cargo_line.message {
                                // Find primary span matching staged files
                                let primary_span = diag.spans.iter().find(|s| s.is_primary);
                                if let Some(span) = primary_span {
                                    if staged_files.contains(&span.file_name) {
                                        let severity = match diag.level.as_str() {
                                            "error" => "error",
                                            "warning" => "warning",
                                            _ => "info",
                                        };

                                        diagnostics.push(LintDiagnostic {
                                            file: span.file_name.clone(),
                                            line: Some(span.line_start),
                                            column: Some(span.column_start),
                                            rule: diag.code.map(|c| c.code),
                                            severity: severity.to_string(),
                                            message: diag.message,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(LintResponse {
        diagnostics,
        linters_run,
    })
}
