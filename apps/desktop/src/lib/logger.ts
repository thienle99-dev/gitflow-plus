import {
  debug as logDebug,
  error as logError,
  info as logInfo,
  warn as logWarn,
} from "@tauri-apps/plugin-log";

type ConsoleLevel = "log" | "debug" | "info" | "warn" | "error";
type PluginLogger = (message: string) => Promise<void>;

let initialized = false;

function serializeLogArg(arg: unknown): string {
  if (arg instanceof Error) {
    return [arg.name, arg.message, arg.stack].filter(Boolean).join("\n");
  }
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean" || arg == null) {
    return String(arg);
  }
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return Object.prototype.toString.call(arg);
  }
}

function serializeLogArgs(args: unknown[]) {
  return args.map(serializeLogArg).join(" ");
}

function forwardConsole(level: ConsoleLevel, logger: PluginLogger) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    const message = serializeLogArgs(args);
    logger(message).catch(() => {
      // Avoid recursive logging if the logging plugin is unavailable.
    });
  };
}

export function initFileBackedConsoleLogger() {
  if (initialized) return;
  initialized = true;

  forwardConsole("log", logInfo);
  forwardConsole("debug", logDebug);
  forwardConsole("info", logInfo);
  forwardConsole("warn", logWarn);
  forwardConsole("error", logError);

  logInfo("Frontend console logger initialized").catch(() => {});
}
