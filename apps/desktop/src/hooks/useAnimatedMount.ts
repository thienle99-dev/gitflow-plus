import { useState, useEffect, useRef } from "react";

/**
 * Keeps a component mounted during its exit animation.
 *
 * Returns `[shouldRender, animating]`:
 * - `shouldRender` — whether the component should be in the DOM
 * - `animating` — whether the exit animation is currently playing
 *
 * Usage:
 * ```tsx
 * const [shouldRender, animating] = useAnimatedMount(open, 200);
 * if (!shouldRender) return null;
 * return <div className={animating ? "animate-out" : "animate-in"}>...</div>;
 * ```
 */
export function useAnimatedMount(
  active: boolean,
  durationMs: number = 150,
): [shouldRender: boolean, phase: "enter" | "exit" | "idle"] {
  const [state, setState] = useState<{
    shouldRender: boolean;
    phase: "enter" | "exit" | "idle";
  }>(() => ({
    shouldRender: active,
    phase: active ? "enter" : "idle",
  }));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (active) {
      setState({ shouldRender: true, phase: "enter" });
    } else if (state.shouldRender) {
      setState((prev) => ({ ...prev, phase: "exit" }));
      timerRef.current = setTimeout(() => {
        setState({ shouldRender: false, phase: "idle" });
        timerRef.current = null;
      }, durationMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, durationMs]);

  return [state.shouldRender, state.phase];
}
