import { useState, useCallback, useRef } from "react";
import { classifyGitError, formatShortError, type ClassifiedError, type ErrorCategory } from "@/lib/error-types";

/**
 * Per-category config for error display styling and icons.
 */
export const ERROR_STYLES: Record<ErrorCategory, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  label: string;
}> = {
  network: {
    bg: "bg-[#64d2ff]/10",
    border: "border-[#64d2ff]/30",
    text: "text-[#64d2ff]",
    icon: "Wifi",
    label: "Network Error",
  },
  auth: {
    bg: "bg-[#ff9f0a]/10",
    border: "border-[#ff9f0a]/30",
    text: "text-[#ff9f0a]",
    icon: "Lock",
    label: "Auth Error",
  },
  conflict: {
    bg: "bg-[#ff375f]/10",
    border: "border-[#ff375f]/30",
    text: "text-[#ff375f]",
    icon: "AlertTriangle",
    label: "Conflict",
  },
  validation: {
    bg: "bg-[#ff9f0a]/10",
    border: "border-[#ff9f0a]/30",
    text: "text-[#ff9f0a]",
    icon: "FileX",
    label: "Validation",
  },
  system: {
    bg: "bg-[#ff375f]/10",
    border: "border-[#ff375f]/30",
    text: "text-[#ff375f]",
    icon: "Zap",
    label: "System Error",
  },
  unknown: {
    bg: "bg-surface-2",
    border: "border-border",
    text: "text-text-secondary",
    icon: "AlertCircle",
    label: "Error",
  },
};

export interface ErrorToastState {
  key: number;
  title: string;
  detail: string;
  category: ErrorCategory;
  retryable: boolean;
  retryFn?: () => void;
}

/**
 * Hook that wraps any async operation with error classification + toast state.
 */
export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorToastState[]>([]);
  const counterRef = useRef(0);

  const handleError = useCallback(
    (error: unknown, context?: string, retryFn?: () => void) => {
      const classified: ClassifiedError = classifyGitError(error);
      const key = ++counterRef.current;
      const prefix = context ? `[${context}] ` : "";
      const entry: ErrorToastState = {
        key,
        title: `${prefix}${ERROR_STYLES[classified.category].label}: ${formatShortError(classified.message)}`,
        detail: classified.detail,
        category: classified.category,
        retryable: classified.retryable && !!retryFn,
        retryFn: classified.retryable ? retryFn : undefined,
      };
      setErrors((prev) => [...prev.slice(-4), entry]);

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.key !== key));
      }, 6000);

      return classified;
    },
    [],
  );

  const dismissError = useCallback((key: number) => {
    setErrors((prev) => prev.filter((e) => e.key !== key));
  }, []);

  return { errors, handleError, dismissError };
}

/**
 * Async action wrapper: run fn, catch + classify any errors.
 * Returns [result, classifiedError | null].
 */
export async function tryAction<T>(
  fn: () => Promise<T>,
): Promise<[T | null, ClassifiedError | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, classifyGitError(error)];
  }
}
