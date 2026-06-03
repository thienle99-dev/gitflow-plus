/**
 * Local (no API) risk scanner for git diffs and file change lists.
 * Runs instantly — detects sensitive files, migrations, config/env, auth,
 * and destructive patterns before merge/push.
 */

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export interface RiskFinding {
  severity: RiskSeverity;
  category: string;
  label: string;
  file?: string;
  detail?: string;
}

export interface RiskReport {
  overall: RiskSeverity | "safe";
  findings: RiskFinding[];
  fileCount: number;
  scannedAt: number;
}

// ─── Pattern Definitions ─────────────────────────────────────────────────

const SENSITIVE_FILE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\.env(\..+)?$/i, label: "Environment file" },
  { pattern: /\.pem$/i, label: "PEM certificate/key" },
  { pattern: /\.key$/i, label: "Private key file" },
  { pattern: /\.p12$|\.pfx$/i, label: "PKCS certificate" },
  { pattern: /id_rsa|id_ed25519|id_dsa|id_ecdsa/i, label: "SSH private key" },
  { pattern: /credentials?(\..+)?$/i, label: "Credentials file" },
  { pattern: /secrets?(\..+)?$/i, label: "Secrets file" },
  { pattern: /\.htpasswd$/i, label: "htpasswd file" },
  { pattern: /wallet(\..+)?$/i, label: "Wallet file" },
  { pattern: /keystore(\..+)?$/i, label: "Keystore file" },
  { pattern: /\.p12$/i, label: "PKCS#12 archive" },
  { pattern: /firebase.*config/i, label: "Firebase config" },
  { pattern: /service.account/i, label: "Service account" },
];

const CONFIG_FILE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /docker-compose\.ya?ml$/i, label: "Docker Compose config" },
  { pattern: /Dockerfile(\..+)?$/i, label: "Dockerfile" },
  { pattern: /\.github\/workflows\//i, label: "CI/CD workflow" },
  { pattern: /\.gitlab-ci\.ya?ml$/i, label: "GitLab CI config" },
  { pattern: /\.circleci\//i, label: "CircleCI config" },
  { pattern: /nginx\.conf$/i, label: "Nginx config" },
  { pattern: /traefik/i, label: "Traefik config" },
  { pattern: /terraform\//i, label: "Terraform config" },
  { pattern: /\.tf$/i, label: "Terraform file" },
  { pattern: /k8s|kubernetes/i, label: "Kubernetes config" },
  { pattern: /helm\//i, label: "Helm chart" },
  { pattern: /Makefile$/i, label: "Makefile" },
];

const MIGRATION_FILE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /migrations?\//i, label: "Database migration" },
  { pattern: /migrate/i, label: "Migration file" },
  { pattern: /schema\.prisma$/i, label: "Prisma schema" },
  { pattern: /schema\.(sql|rb|py)$/i, label: "Schema file" },
  { pattern: /alembic/i, label: "Alembic migration" },
  { pattern: /flyway/i, label: "Flyway migration" },
  { pattern: /knex.*migrations?\//i, label: "Knex migration" },
  { pattern: /drizzle.*migrations?\//i, label: "Drizzle migration" },
];

const AUTH_FILE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /auth/i, label: "Auth-related file" },
  { pattern: /security/i, label: "Security file" },
  { pattern: /session/i, label: "Session management" },
  { pattern: /oauth/i, label: "OAuth file" },
  { pattern: /jwt/i, label: "JWT handling" },
  { pattern: /passport/i, label: "Passport config" },
  { pattern: /permission/i, label: "Permission logic" },
  { pattern: /rbac/i, label: "RBAC logic" },
  { pattern: /acl/i, label: "ACL logic" },
];

const DESTRUCTIVE_DIFF_PATTERNS: { pattern: RegExp; label: string; category: string }[] = [
  { pattern: /^\+.*DROP\s+(TABLE|DATABASE|SCHEMA)/im, label: "DROP TABLE/DATABASE/SCHEMA", category: "Destructive SQL" },
  { pattern: /^\+.*DELETE\s+FROM\s+/im, label: "DELETE FROM", category: "Destructive SQL" },
  { pattern: /^\+.*TRUNCATE\s+/im, label: "TRUNCATE", category: "Destructive SQL" },
  { pattern: /^\+.*ALTER\s+TABLE.*DROP\s+/im, label: "ALTER TABLE ... DROP", category: "Schema change" },
  { pattern: /^\+.*rm\s+-rf?\s+/m, label: "rm -rf", category: "Destructive shell" },
  { pattern: /^\+.*force.*push/im, label: "Force push", category: "Git danger" },
  { pattern: /^\+.*--force\b/m, label: "Force flag", category: "Destructive flag" },
  { pattern: /^\+.*chmod\s+777/m, label: "chmod 777", category: "Security risk" },
  { pattern: /^\+.*TODO.*HACK|FIXME.*HACK/im, label: "HACK/FIXME marker", category: "Code quality" },
  { pattern: /^\+.*(?:password|secret|api.?key|token)\s*[:=]\s*["'][^"']+["']/im, label: "Hardcoded secret", category: "Credential leak" },
  { pattern: /^\+.*(?:AWS_ACCESS_KEY|AWS_SECRET|PRIVATE_KEY)/im, label: "Cloud credential", category: "Credential leak" },
];

// ─── Scanner Functions ───────────────────────────────────────────────────

function matchPatterns(
  value: string,
  patterns: { pattern: RegExp; label: string }[],
): { matched: boolean; label: string }[] {
  return patterns
    .filter((p) => p.pattern.test(value))
    .map((p) => ({ matched: true, label: p.label }));
}

function scanFileList(files: { path: string; status: string }[]): RiskFinding[] {
  const findings: RiskFinding[] = [];

  for (const file of files) {
    for (const { label } of matchPatterns(file.path, SENSITIVE_FILE_PATTERNS)) {
      findings.push({ severity: "critical", category: "Sensitive file", label, file: file.path });
    }
    for (const { label } of matchPatterns(file.path, MIGRATION_FILE_PATTERNS)) {
      findings.push({ severity: "high", category: "Migration", label, file: file.path });
    }
    for (const { label } of matchPatterns(file.path, CONFIG_FILE_PATTERNS)) {
      findings.push({ severity: "medium", category: "Config change", label, file: file.path });
    }
    for (const { label } of matchPatterns(file.path, AUTH_FILE_PATTERNS)) {
      findings.push({ severity: "high", category: "Auth/Security", label, file: file.path });
    }

    // Large file additions
    if (file.status === "added" && /\.(json|ya?ml|xml|sql|csv)$/i.test(file.path)) {
      findings.push({ severity: "low", category: "Large data file", label: "Data file added", file: file.path });
    }
  }

  return findings;
}

function scanDiffContent(diff: string): RiskFinding[] {
  const findings: RiskFinding[] = [];

  for (const { pattern, label, category } of DESTRUCTIVE_DIFF_PATTERNS) {
    if (pattern.test(diff)) {
      const severity: RiskSeverity = category === "Credential leak" ? "critical"
        : category === "Destructive SQL" ? "high"
        : category === "Security risk" ? "high"
        : category === "Destructive shell" ? "high"
        : "medium";
      findings.push({ severity, category, label });
    }
  }

  return findings;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Run a local risk scan on file changes and/or diff content.
 * No API call — runs instantly in the browser.
 */
export function scanForRisks(
  files: { path: string; status: string }[],
  diff?: string,
): RiskReport {
  const fileFindings = scanFileList(files);
  const diffFindings = diff ? scanDiffContent(diff) : [];
  const findings = [...fileFindings, ...diffFindings];

  // Deduplicate by category+label+file
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = `${f.category}|${f.label}|${f.file || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by severity
  const order: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  unique.sort((a, b) => order[a.severity] - order[b.severity]);

  const overall: RiskReport["overall"] = unique.some((f) => f.severity === "critical") ? "critical"
    : unique.some((f) => f.severity === "high") ? "high"
    : unique.some((f) => f.severity === "medium") ? "medium"
    : unique.some((f) => f.severity === "low") ? "low"
    : "safe";

  return { overall, findings: unique, fileCount: files.length, scannedAt: Date.now() };
}
