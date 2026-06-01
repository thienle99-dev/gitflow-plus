import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { classifyGitError, formatShortError, type ClassifiedError, type ErrorCategory } from "@/lib/error-types";
import { ErrorToast } from "@/components/ui/feedback/ErrorNotification";

interface ToastEntry {
  key: number;
  title: string;
  detail: string;
  category: ErrorCategory;
  retryable: boolean;
  retryFn?: () => void;
}

interface ErrorContextValue {
  errors: ToastEntry[];
  reportError: (error: unknown, context?: string, retryFn?: () => void) => ClassifiedError;
  dismissError: (key: number) => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function useErrorReporter() {
  const ctx = useContext(ErrorContext);
  if (!ctx) {
    // Fallback for components used outside provider — just log
    return {
      errors: [] as ToastEntry[],
      reportError: (error: unknown) => classifyGitError(error),
      dismissError: () => {},
    };
  }
  return ctx;
}

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ToastEntry[]>([]);
  const counterRef = useRef(0);

  const reportError = useCallback(
    (error: unknown, context?: string, retryFn?: () => void) => {
      const classified = classifyGitError(error);
      const key = ++counterRef.current;
      const prefix = context ? `[${context}] ` : "";
      const entry: ToastEntry = {
        key,
        title: `${prefix}${formatShortError(classified.message)}`,
        detail: classified.detail,
        category: classified.category,
        retryable: classified.retryable && !!retryFn,
        retryFn: classified.retryable ? retryFn : undefined,
      };
      setErrors((prev) => [...prev.slice(-4), entry]);
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.key !== key));
      }, 7000);
      return classified;
    },
    [],
  );

  const dismissError = useCallback((key: number) => {
    setErrors((prev) => prev.filter((e) => e.key !== key));
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, reportError, dismissError }}>
      {children}
      {/* Error toast stack */}
      {errors.map((err) => (
        <ErrorToast
          key={err.key}
          error={err}
          onDismiss={dismissError}
          onRetry={err.retryFn ? () => err.retryFn!() : undefined}
        />
      ))}
    </ErrorContext.Provider>
  );
}
