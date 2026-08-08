import { app } from "electron";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type LogEntry = {
  time: number;
  action: string;
  detail?: string;
};

const MAX = 100;
let cache: LogEntry[] | null = null;

function file(): string {
  return join(app.getPath("userData"), "log.json");
}

export function getLog(): LogEntry[] {
  if (cache) return cache;
  try {
    if (existsSync(file())) {
      const raw = JSON.parse(readFileSync(file(), "utf-8")) as LogEntry[];
      cache = Array.isArray(raw) ? raw.slice(-MAX) : [];
      return cache;
    }
  } catch {
    /* corrupted — reset */
  }
  cache = [];
  return cache;
}

export function logAction(action: string, detail?: string): void {
  const entries = getLog();
  entries.push({ time: Date.now(), action, detail });
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  try {
    mkdirSync(app.getPath("userData"), { recursive: true });
    writeFileSync(file(), JSON.stringify(entries), "utf-8");
  } catch {
    /* best-effort */
  }
}

export function clearLog(): void {
  cache = [];
  try {
    writeFileSync(file(), "[]", "utf-8");
  } catch {
    /* ignore */
  }
}
