/**
 * Firebase Analytics tracking helpers.
 *
 * All functions are safe to call even if Firebase is not initialized —
 * they silently no-op in that case.
 */

import { logEvent, setAnalyticsCollectionEnabled, type Analytics } from "firebase/analytics";
import { getFirebaseAnalytics } from "./firebase";

function getA(): Analytics | null {
  return getFirebaseAnalytics();
}

// ─── User & Session ─────────────────────────────────────────────────────────

export function trackAppOpen() {
  const a = getA();
  if (a) logEvent(a, "app_open", { platform: "desktop" });
}

export function trackAppError(message: string, source?: string) {
  const a = getA();
  if (a) logEvent(a, "app_error", { message: message.slice(0, 200), source: source ?? "unknown" });
}

// ─── Repository ─────────────────────────────────────────────────────────────

export function trackRepoOpen(method: "recent" | "browse" | "clone" | "cli") {
  const a = getA();
  if (a) logEvent(a, "repo_open", { method });
}

export function trackRepoClose() {
  const a = getA();
  if (a) logEvent(a, "repo_close");
}

// ─── Git Operations ─────────────────────────────────────────────────────────

export function trackCommit(fileCount = 1, commitCount = 1) {
  const a = getA();
  if (a) logEvent(a, "git_commit", { file_count: fileCount, commit_count: commitCount });
}

export function trackBranchCreate(method: "manual" | "gitflow" | "from_commit") {
  const a = getA();
  if (a) logEvent(a, "git_branch_create", { method });
}

export function trackBranchSwitch() {
  const a = getA();
  if (a) logEvent(a, "git_branch_switch");
}

export function trackMerge(strategy: "merge" | "rebase" | "squash" | "fast-forward") {
  const a = getA();
  if (a) logEvent(a, "git_merge", { strategy });
}

export function trackCherryPick(count = 1) {
  const a = getA();
  if (a) logEvent(a, "git_cherry_pick", { count });
}

export function trackRebase(type: "interactive" | "standard") {
  const a = getA();
  if (a) logEvent(a, "git_rebase", { type });
}

export function trackStash(action: "push" | "pop" | "drop") {
  const a = getA();
  if (a) logEvent(a, "git_stash", { action });
}

export function trackTagCreated() {
  const a = getA();
  if (a) logEvent(a, "git_tag_created");
}

// ─── AI Features ────────────────────────────────────────────────────────────

export function trackAICommitMessage(model?: string) {
  const a = getA();
  if (a) logEvent(a, "ai_commit_message", { model: model ?? "unknown" });
}

export function trackAIReview(mode?: string) {
  const a = getA();
  if (a) logEvent(a, "ai_review", { mode: mode ?? "all" });
}

export function trackAIInlineComments(count = 0) {
  const a = getA();
  if (a) logEvent(a, "ai_inline_comments", { comment_count: count });
}

export function trackAICommitScope(fileCount = 0) {
  const a = getA();
  if (a) logEvent(a, "ai_commit_scope", { file_count: fileCount });
}

export function trackAICommitSplit(groupCount = 0) {
  const a = getA();
  if (a) logEvent(a, "ai_commit_split", { group_count: groupCount });
}

export function trackAIConflictExplain() {
  const a = getA();
  if (a) logEvent(a, "ai_conflict_explain");
}

export function trackAIConflictResolve() {
  const a = getA();
  if (a) logEvent(a, "ai_conflict_resolve");
}

export function trackAICommitExplain() {
  const a = getA();
  if (a) logEvent(a, "ai_commit_explain");
}

export function trackAIGuardrail(fileCount = 0) {
  const a = getA();
  if (a) logEvent(a, "ai_guardrail", { file_count: fileCount });
}

export function trackAIReadiness() {
  const a = getA();
  if (a) logEvent(a, "ai_readiness");
}

export function trackAIImproveMessage() {
  const a = getA();
  if (a) logEvent(a, "ai_improve_message");
}

export function trackAIAddBody() {
  const a = getA();
  if (a) logEvent(a, "ai_add_body");
}

export function trackAILintReview() {
  const a = getA();
  if (a) logEvent(a, "ai_lint_review");
}

export function trackAIMergeStrategy() {
  const a = getA();
  if (a) logEvent(a, "ai_merge_strategy");
}

export function trackAICommitSummary() {
  const a = getA();
  if (a) logEvent(a, "ai_commit_summary");
}

export function trackAITagDescription() {
  const a = getA();
  if (a) logEvent(a, "ai_tag_description");
}

export function trackAIFixPlan(itemCount = 0) {
  const a = getA();
  if (a) logEvent(a, "ai_fix_plan", { itemCount });
}

export function trackAICommitCoach(tipCount = 0) {
  const a = getA();
  if (a) logEvent(a, "ai_commit_coach", { tipCount });
}

export function trackAIBranchCompareSummary(riskLevel = "safe") {
  const a = getA();
  if (a) logEvent(a, "ai_branch_compare_summary", { riskLevel });
}

export function trackAIPRDraft() {
  const a = getA();
  if (a) logEvent(a, "ai_pr_draft");
}

export function trackAIBranchSuggestion() {
  const a = getA();
  if (a) logEvent(a, "ai_branch_suggestion");
}

// ─── Diff & Review ──────────────────────────────────────────────────────────

export function trackDiffOpen(mode: "split" | "unified") {
  const a = getA();
  if (a) logEvent(a, "diff_open", { mode });
}

export function trackDiffHunkAction(action: "stage" | "unstage" | "discard") {
  const a = getA();
  if (a) logEvent(a, "diff_hunk_action", { action });
}

// ─── Bug Report ─────────────────────────────────────────────────────────────

export function trackBugReport(hasScreenshot = false) {
  const a = getA();
  if (a) logEvent(a, "bug_report", { has_screenshot: hasScreenshot });
}

// ─── Settings ───────────────────────────────────────────────────────────────

export function trackSettingsChange(setting: string, value: string) {
  const a = getA();
  if (a) logEvent(a, "settings_change", { setting, value });
}

// ─── Collection Control ─────────────────────────────────────────────────────

export function setAnalyticsEnabled(enabled: boolean) {
  const a = getA();
  if (a) setAnalyticsCollectionEnabled(a, enabled);
}
