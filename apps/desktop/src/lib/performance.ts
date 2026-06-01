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
const PERF_SUMMARY_INTERVAL = 25;
const PERF_SLOW_THRESHOLD_MS = 50;

const samples = new Map<
  string,
  {
    count: number;
    total: number;
    max: number;
    last: number;
  }
>();
let totalSamples = 0;

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
  recordPerformanceSample(name, durationMs);

  if (durationMs >= PERF_SLOW_THRESHOLD_MS) {
    console.debug(`[perf:slow] ${name} ${rounded}ms`, details);
  }
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

export function getPerformanceProfile() {
  return Array.from(samples.entries())
    .map(([name, sample]) => ({
      name,
      count: sample.count,
      avgMs: Math.round((sample.total / sample.count) * 10) / 10,
      maxMs: Math.round(sample.max * 10) / 10,
      lastMs: Math.round(sample.last * 10) / 10,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

function recordPerformanceSample(name: string, durationMs: number) {
  const sample = samples.get(name) ?? {
    count: 0,
    total: 0,
    max: 0,
    last: 0,
  };
  sample.count += 1;
  sample.total += durationMs;
  sample.max = Math.max(sample.max, durationMs);
  sample.last = durationMs;
  samples.set(name, sample);
  totalSamples += 1;

  if (totalSamples % PERF_SUMMARY_INTERVAL === 0) {
    console.table(getPerformanceProfile().slice(0, 8));
  }
}

if (typeof window !== "undefined") {
  (window as typeof window & { gitflowPerfProfile?: typeof getPerformanceProfile }).gitflowPerfProfile =
    getPerformanceProfile;
}
