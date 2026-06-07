/**
 * AI Status Store — lightweight module-level state for tracking AI request errors.
 *
 * This is consumed by:
 *  - `ai.ts` (records errors on failed requests, clears on success)
 *  - `useAIStatus.ts` hook (subscribes to updates for the status chip)
 *
 * Separated into its own module to avoid circular imports between React hooks and lib code.
 */

let lastAIError: string | null = null;
let listeners: Array<() => void> = [];

function notify() {
  for (const fn of listeners) fn();
}

/** Subscribe to error state changes. Returns an unsubscribe function. */
export function subscribeToAIError(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((fn) => fn !== callback);
  };
}

/** Get the current error snapshot (for useSyncExternalStore). */
export function getAIErrorSnapshot(): string | null {
  return lastAIError;
}

/** Record that an AI request failed. */
export function recordAIError(message: string) {
  lastAIError = message;
  notify();
}

/** Clear the last AI error (e.g. on successful request). */
export function clearAIError() {
  lastAIError = null;
  notify();
}
