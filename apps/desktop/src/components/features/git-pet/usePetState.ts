import { useState, useEffect, useRef, useCallback } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useOperationsStore } from "@/stores/operations";
import { useMergeStatus } from "@/queries/useGitMerge";
import { useRepoStore } from "@/stores/repo";

export type PetState =
  | "idle"
  | "blink"
  | "sleeping"
  | "loading"
  | "success"
  | "error"
  | "alarmed"
  | "excited"
  | "waving";

// Priority: alarmed > error > success > loading > excited > waving > idle > blink > sleeping
const PRIORITY: PetState[] = [
  "alarmed",
  "error",
  "success",
  "loading",
  "excited",
  "waving",
  "idle",
  "blink",
  "sleeping",
];

function pickHigher(a: PetState, b: PetState): PetState {
  return PRIORITY.indexOf(a) <= PRIORITY.indexOf(b) ? a : b;
}

const IDLE_TIMEOUT_MS = 60_000;
const BLINK_MIN_MS = 3_000;
const BLINK_MAX_MS = 8_000;

export function usePetState(): PetState {
  const repoPath = useRepoStore((s) => s.repoPath);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isLoading = isFetching > 0 || isMutating > 0;

  const { data: mergeStatus } = useMergeStatus(repoPath);
  const hasConflicts = !!mergeStatus?.conflicts?.length;

  const lastOperation = useOperationsStore((s) =>
    s.operations.find((op) => op.status === "completed" || op.status === "failed"),
  );
  const opsStore = useOperationsStore;

  // Internal state driven by timers
  const [timerState, setTimerState] = useState<PetState>("idle");
  const lastActivityRef = useRef(Date.now());
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Track activity timestamps
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [isLoading, hasConflicts]);

  // Blink scheduler: random interval while idle
  const scheduleBlink = useCallback(() => {
    clearTimeout(blinkTimerRef.current);
    const delay = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
    blinkTimerRef.current = setTimeout(() => {
      setTimerState((prev) => {
        if (prev === "idle") return "blink";
        return prev;
      });
      // blink → back to idle after animation
      setTimeout(() => {
        setTimerState((prev) => (prev === "blink" ? "idle" : prev));
        scheduleBlink();
      }, 400);
    }, delay);
  }, []);

  // Sleep scheduler: if no activity for 60s
  useEffect(() => {
    const check = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        setTimerState((prev) => (prev === "idle" || prev === "blink" ? "sleeping" : prev));
      }
    };
    sleepTimerRef.current = setInterval(check, 5_000);
    return () => clearInterval(sleepTimerRef.current);
  }, []);

  // Wake up from sleep on any activity
  useEffect(() => {
    if (isLoading || hasConflicts) {
      setTimerState((prev) => (prev === "sleeping" ? "idle" : prev));
      lastActivityRef.current = Date.now();
    }
  }, [isLoading, hasConflicts]);

  // Start blink schedule when idle
  useEffect(() => {
    if (timerState === "idle") {
      scheduleBlink();
    }
    return () => clearTimeout(blinkTimerRef.current);
  }, [timerState === "idle", scheduleBlink]);

  // Track operation completion → success/error/excited
  const lastOpIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastOperation) return;
    if (lastOperation.id === lastOpIdRef.current) return;
    lastOpIdRef.current = lastOperation.id;

    if (lastOperation.status === "failed") {
      setTimerState("error");
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setTimerState("idle"), 1000);
    } else if (lastOperation.status === "completed") {
      if (lastOperation.type === "git" && lastOperation.label.toLowerCase().includes("push")) {
        setTimerState("excited");
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => setTimerState("idle"), 600);
      } else {
        setTimerState("success");
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => setTimerState("idle"), 1200);
      }
    }
  }, [lastOperation]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearTimeout(blinkTimerRef.current);
      clearTimeout(resetTimerRef.current);
      clearInterval(sleepTimerRef.current);
    };
  }, []);

  // Compute derived state with priority
  let derived: PetState = timerState;

  if (hasConflicts) derived = pickHigher("alarmed", derived);
  if (isLoading) derived = pickHigher("loading", derived);

  return derived;
}

/** Allow parent to inject "waving" state on hover */
export function usePetHover(
  baseState: PetState,
): { state: PetState; onHoverStart: () => void; onHoverEnd: () => void } {
  const [hovering, setHovering] = useState(false);

  return {
    state: hovering ? pickHigher("waving", baseState) : baseState,
    onHoverStart: () => setHovering(true),
    onHoverEnd: () => setHovering(false),
  };
}
