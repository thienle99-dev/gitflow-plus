type PerfMetadata = Record<string, string | number | boolean | null | undefined>;

const repoOpenMilestones = new Map<
  string,
  {
    startedAt: number;
    done: Set<string>;
    logged: boolean;
  }
>();

const REPO_OPEN_REQUIRED = ["log", "status", "branches"];

export function isPerformanceLoggingEnabled() {
  if (typeof localStorage === "undefined") return import.meta.env.DEV;
  return import.meta.env.DEV || localStorage.getItem("gitflowPerfLogging") !== "false";
}

export function logPerformance(name: string, durationMs: number, metadata: PerfMetadata = {}) {
  if (!isPerformanceLoggingEnabled()) return;

  const rounded = Math.round(durationMs * 10) / 10;
  const details = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null),
  );
  console.debug(`[perf] ${name} ${rounded}ms`, details);
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata: PerfMetadata = {},
) {
  const startedAt = performance.now();
  try {
    const result = await fn();
    logPerformance(name, performance.now() - startedAt, metadata);
    return result;
  } catch (error) {
    logPerformance(name, performance.now() - startedAt, { ...metadata, failed: true });
    throw error;
  }
}

export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata: PerfMetadata = {},
) {
  const startedAt = performance.now();
  try {
    const result = fn();
    logPerformance(name, performance.now() - startedAt, metadata);
    return result;
  } catch (error) {
    logPerformance(name, performance.now() - startedAt, { ...metadata, failed: true });
    throw error;
  }
}

export function startRepoOpenMeasurement(path: string) {
  if (!isPerformanceLoggingEnabled()) return;

  repoOpenMilestones.set(path, {
    startedAt: performance.now(),
    done: new Set(),
    logged: false,
  });
}

export function markRepoOpenMilestone(path: string, milestone: "log" | "status" | "branches") {
  const measurement = repoOpenMilestones.get(path);
  if (!measurement || measurement.logged) return;

  measurement.done.add(milestone);
  if (REPO_OPEN_REQUIRED.every((required) => measurement.done.has(required))) {
    measurement.logged = true;
    logPerformance("open_repo_ready", performance.now() - measurement.startedAt, {
      repo: repoName(path),
      milestones: Array.from(measurement.done).join(","),
    });
    repoOpenMilestones.delete(path);
  }
}

export function repoName(path: string | null | undefined) {
  if (!path) return "";
  return path.split(/[/\\]/).filter(Boolean).pop() || path;
}
