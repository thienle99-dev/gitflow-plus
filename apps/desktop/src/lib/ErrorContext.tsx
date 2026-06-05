import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { classifyGitError, formatShortError, type ClassifiedError, type ErrorCategory } from "@/lib/error-types";
import { ErrorToast } from "@/components/ui/feedback/ErrorNotification";
import CredentialPrompt from "@/components/features/dialogs/CredentialPrompt";
import { api } from "@/api/tauri";

interface ToastEntry {
  key: number;
  title: string;
  detail: string;
  category: ErrorCategory;
  retryable: boolean;
  retryFn?: () => void;
}

interface CredentialPromptState {
  open: boolean;
  error: string;
  retryFn?: () => void;
  repoPath?: string;
}

interface ErrorContextValue {
  errors: ToastEntry[];
  reportError: (error: unknown, context?: string, retryFn?: () => void, repoPath?: string) => ClassifiedError;
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
  const [credPrompt, setCredPrompt] = useState<CredentialPromptState>({ open: false, error: "" });
  const counterRef = useRef(0);

  const reportError = useCallback(
    (error: unknown, context?: string, retryFn?: () => void, repoPath?: string) => {
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

      // Show credential prompt for auth errors when a retry function is available
      if (classified.category === "auth" && retryFn) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        setCredPrompt({ open: true, error: rawMessage, retryFn, repoPath });
      }

      return classified;
    },
    [],
  );

  const dismissError = useCallback((key: number) => {
    setErrors((prev) => prev.filter((e) => e.key !== key));
  }, []);

  const handleCredClose = useCallback(() => {
    setCredPrompt({ open: false, error: "" });
  }, []);

  const handleCredSubmit = useCallback(
    async (username: string, password: string) => {
      const { retryFn, repoPath } = credPrompt;
      handleCredClose();

      if (retryFn && repoPath) {
        // Set temporary credentials in the remote URL
        let originalUrl: string | null = null;
        try {
          originalUrl = await api.remote.setTempCredentials(repoPath, username, password);
        } catch {
          // If credential setting fails, just retry without credentials
          setTimeout(() => retryFn(), 100);
          return;
        }

        // Retry the operation with credentials
        setTimeout(async () => {
          try {
            await retryFn();
          } finally {
            // Always restore the original URL (strip credentials)
            if (originalUrl) {
              await api.remote.restoreRemoteUrl(repoPath, originalUrl).catch(() => {});
            }
          }
        }, 100);
      } else if (retryFn) {
        // No repoPath available, just retry
        setTimeout(() => retryFn(), 100);
      }
    },
    [credPrompt, handleCredClose],
  );

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
      {/* Credential prompt for auth errors */}
      <CredentialPrompt
        open={credPrompt.open}
        error={credPrompt.error}
        onCredentials={handleCredSubmit}
        onClose={handleCredClose}
      />
    </ErrorContext.Provider>
  );
}
