/**
 * Centralized logger — routes all console output through a single module.
 * In production, only errors and warnings are logged.
 * In development, all levels are logged.
 */

const isDev = import.meta.env.DEV;

/**
 * Initialize file-backed console logger.
 * This hooks console.error/warn to also write to the Tauri log file.
 */
export function initFileBackedConsoleLogger() {
  if (typeof window === "undefined") return;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    originalError(...args);
    try {
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      const log = (window as any).__TAURI__?.log;
      if (log?.error) log.error(msg);
    } catch { /* ignore */ }
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    try {
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      const log = (window as any).__TAURI__?.log;
      if (log?.warn) log.warn(msg);
    } catch { /* ignore */ }
  };
}

export const logger = {
  error(message: string, ...args: unknown[]) {
    console.error(`[GitFlow] ${message}`, ...args);
  },

  warn(message: string, ...args: unknown[]) {
    console.warn(`[GitFlow] ${message}`, ...args);
  },

  info(message: string, ...args: unknown[]) {
    if (isDev) {
      console.info(`[GitFlow] ${message}`, ...args);
    }
  },

  debug(message: string, ...args: unknown[]) {
    if (isDev) {
      console.debug(`[GitFlow] ${message}`, ...args);
    }
  },

  log(message: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[GitFlow] ${message}`, ...args);
    }
  },
};
