import { useState, useCallback, type ReactNode } from "react";
import { useRepoStore } from "@/stores/repo";
import { api, type PreflightResult } from "@/api/tauri";
import ConfirmDialog, { type ImpactItem } from "@/components/ui/overlay/ConfirmDialog";
import { hasBlockingCondition, hasAdvisoryWarnings } from "@/queries/usePreflight";

function buildImpactItems(result: PreflightResult): ImpactItem[] {
  const items: ImpactItem[] = [];

  if (result.detached_head) {
    items.push({ label: "HEAD is detached — not on any branch", severity: "warning" });
  }
  if (result.merge_in_progress) {
    items.push({ label: "A merge is already in progress", severity: "warning" });
  }
  if (result.rebase_in_progress) {
    items.push({ label: "A rebase is already in progress", severity: "warning" });
  }
  if (result.cherry_pick_in_progress) {
    items.push({ label: "A cherry-pick is already in progress", severity: "warning" });
  }
  if (result.has_conflicts) {
    items.push({
      label: result.conflicted_files.length + " unresolved conflict(s)",
      severity: "irreversible",
      details: result.conflicted_files.slice(0, 5),
    });
  }
  if (result.dirty_worktree) {
    items.push({
      label: result.dirty_file_count + " uncommitted change(s) in the working tree",
      severity: "warning",
    });
  }
  if (result.has_untracked_files) {
    items.push({
      label: result.untracked_file_count + " untracked file(s) present",
      severity: "info",
    });
  }
  return items;
}

/**
 * Runs `preflight_check` before a Git operation and shows a confirmation dialog
 * when blocking conditions or advisory warnings are detected.
 *
 * Usage:
 * ```
 * const { runPreflight, preflightDialog } = usePreflightGate("push", () => doPush());
 * // In handler:
 * const ok = await runPreflight();
 * if (ok) doPush();
 * ```
 */
export function usePreflightGate(actionLabel: string, options?: { skip?: boolean }) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    result: PreflightResult | null;
    blocking: boolean;
    resolve: ((val: boolean) => void) | null;
  }>({ open: false, result: null, blocking: false, resolve: null });

  const runPreflight = useCallback(async (): Promise<boolean> => {
    if (options?.skip || !repoPath) return true;

    try {
      const result = await api.preflight.check(repoPath);
      const blocking = hasBlockingCondition(result);
      const advisory = hasAdvisoryWarnings(result);

      if (!blocking && !advisory) return true;

      return new Promise<boolean>((resolve) => {
        setDialogState({ open: true, result, blocking, resolve });
      });
    } catch {
      return true;
    }
  }, [repoPath, options?.skip]);

  const handleConfirm = useCallback(() => {
    const { blocking, resolve } = dialogState;
    setDialogState((s) => ({ ...s, open: false, resolve: null }));
    if (resolve) resolve(!blocking); // blocking => "Understood" just closes
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    const { resolve } = dialogState;
    setDialogState((s) => ({ ...s, open: false, resolve: null }));
    if (resolve) resolve(false);
  }, [dialogState]);

  const { result, blocking, open } = dialogState;

  const impactItems = result ? buildImpactItems(result) : [];
  const blockingCount = result
    ? [result.detached_head, result.merge_in_progress, result.rebase_in_progress, result.cherry_pick_in_progress, result.has_conflicts].filter(Boolean).length
    : 0;

  const preflightDialog: ReactNode = result ? (
    <ConfirmDialog
      open={open}
      title={blocking ? "Cannot " + actionLabel : actionLabel + " — Safety Check"}
      message={
        blocking
          ? "This repository has " + blockingCount + " blocking condition(s) that must be resolved before you can " + actionLabel + "."
          : "This repository has some conditions you should review before " + actionLabel + "."
      }
      impactItems={impactItems}
      confirmLabel={blocking ? "Understood" : "Proceed Anyway"}
      cancelLabel="Cancel"
      variant={blocking ? "default" : "destructive"}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { runPreflight, preflightDialog };
}
