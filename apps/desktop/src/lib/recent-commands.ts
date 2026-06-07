/**
 * Recent commands tracker — persists to localStorage.
 */
const LS_KEY = "gitflowRecentCommands";
const MAX = 10;

export interface RecentCommand {
  id: string;
  label: string;
  icon?: string;
  ts: number;
}

export function getRecentCommands(): RecentCommand[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentCommand(id: string, label: string, icon?: string): void {
  try {
    const list = getRecentCommands().filter((c) => c.id !== id);
    list.unshift({ id, label, icon, ts: Date.now() });
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore */ }
}

export function clearRecentCommands(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}
