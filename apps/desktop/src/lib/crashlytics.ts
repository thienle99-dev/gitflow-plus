/**
 * Crash reporting module.
 *
 * Since Firebase Crashlytics doesn't have a native web SDK,
 * we implement crash reporting by:
 * 1. Logging errors to Firebase Analytics as structured events
 * 2. Storing crash reports in localStorage for the bug report feature
 * 3. Providing a `recordCrash()` function that the ErrorBoundary calls
 *
 * For native Tauri crash reporting, we also write to the Tauri log plugin.
 */

import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "./firebase";

export interface CrashReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  componentStack?: string;
  context?: string;
  userAgent: string;
  appVersion?: string;
}

const CRASH_STORAGE_KEY = "gitflow_crash_reports";
const MAX_CRASH_REPORTS = 20;

/**
 * Record a crash / unhandled error.
 * Sends to Firebase Analytics and persists locally for the bug report dialog.
 */
export function recordCrash(
  error: Error,
  componentStack?: string,
  context?: string,
): CrashReport {
  const report: CrashReport = {
    id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    message: error.message,
    stack: error.stack,
    componentStack,
    context,
    userAgent: navigator.userAgent,
    appVersion: getAppVersion(),
  };

  // Send to Firebase Analytics as a crash event
  try {
    const analytics = getFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, "app_crash", {
        error_message: error.message.slice(0, 200),
        error_source: context ?? "unknown",
        has_stack: !!error.stack,
      });
    }
  } catch {
    // Analytics send failure is non-critical
  }

  // Persist locally for bug report dialog
  try {
    const existing = getCrashReports();
    const updated = [report, ...existing].slice(0, MAX_CRASH_REPORTS);
    localStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage failure is non-critical
  }

  return report;
}

/**
 * Get all stored crash reports.
 */
export function getCrashReports(): CrashReport[] {
  try {
    const raw = localStorage.getItem(CRASH_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CrashReport[];
  } catch {
    return [];
  }
}

/**
 * Clear all stored crash reports.
 */
export function clearCrashReports(): void {
  localStorage.removeItem(CRASH_STORAGE_KEY);
}

/**
 * Record a manual bug report (user-initiated).
 * This is separate from automatic crash reports.
 */
export interface BugReport {
  id: string;
  timestamp: number;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  includeCrashLogs: boolean;
  attachedCrashIds: string[];
  userAgent: string;
  appVersion?: string;
}

export function recordBugReport(report: Omit<BugReport, "id" | "timestamp" | "userAgent" | "appVersion">): BugReport {
  const fullReport: BugReport = {
    ...report,
    id: `bug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    appVersion: getAppVersion(),
  };

  // Send to Firebase Analytics
  try {
    const analytics = getFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, "bug_report_submitted", {
        has_crash_logs: report.includeCrashLogs,
        crash_log_count: report.attachedCrashIds.length,
        description_length: report.description.length,
      });
    }
  } catch {
    // Non-critical
  }

  return fullReport;
}

function getAppVersion(): string | undefined {
  try {
    // Try to get version from package.json via meta tag or window
    return document.querySelector('meta[name="app-version"]')?.getAttribute("content") ?? undefined;
  } catch {
    return undefined;
  }
}
