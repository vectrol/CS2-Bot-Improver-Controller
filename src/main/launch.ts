import { shell } from "electron";
import { execFileSync } from "node:child_process";
import { getConfig } from "./config";
import { isCs2Running, asyncExecFile } from "./controls";
import type { LaunchResult } from "../shared/types";

const APP_ID = "730";
const REG_BASE = "HKCU\\Software\\Valve\\Steam\\LaunchOptions";
const LO_CACHE_MS = 10000;

let loCache: { at: number; options: string; insecure: boolean } | null = null;

async function regSet(name: string, value: string): Promise<void> {
  await asyncExecFile("reg.exe", ["add", REG_BASE, "/v", name, "/d", value, "/f"]);
}

async function regDelete(name: string): Promise<void> {
  try {
    await asyncExecFile("reg.exe", ["delete", REG_BASE, "/v", name, "/f"]);
  } catch {
    /* key absent */
  }
}

export async function getLaunchOptions(force = false): Promise<{ options: string; insecure: boolean }> {
  const now = Date.now();
  if (!force && loCache && now - loCache.at < LO_CACHE_MS) {
    return { options: loCache.options, insecure: loCache.insecure };
  }
  try {
    const out = await asyncExecFile("reg.exe", ["query", REG_BASE, "/v", APP_ID]);
    const m = out.match(/\bREG_(?:SZ|MULTI_SZ|EXPAND_SZ)\s+(.+)\r?$/m);
    const options = m ? m[1].trim() : "";
    const info = { options, insecure: options.split(/\s+/).includes("-insecure") };
    loCache = { at: now, options, insecure: info.insecure };
    return info;
  } catch {
    const info = { options: "", insecure: false };
    loCache = { at: now, options: "", insecure: false };
    return info;
  }
}

/** Merge user's custom launch options with the -insecure flag and write to Steam. */
export async function setLaunchOptions(enableInsecure: boolean): Promise<void> {
  const custom = (getConfig().launchOptions ?? "").split(/\s+/).filter(Boolean);
  const parts = [...custom];
  if (enableInsecure && !parts.includes("-insecure")) parts.push("-insecure");
  if (!enableInsecure) {
    const without = parts.filter((p) => p !== "-insecure");
    parts.length = 0;
    parts.push(...without);
  }
  if (parts.length > 0) await regSet(APP_ID, parts.join(" "));
  else await regDelete(APP_ID);
  loCache = null;
}

/** Enforce: disk launch options follow the remembered mode on every boot. */
export async function reconcileLaunchOptions(): Promise<void> {
  const cfg = getConfig();
  if (cfg.mode === "bots") await setLaunchOptions(true);
  else if (cfg.mode === "online") await setLaunchOptions(false);
}

export async function launchCs2(): Promise<LaunchResult> {
  if (isCs2Running()) {
    return {
      options: "",
      insecure: false,
      launched: false,
      error: "cs2 already running",
    };
  }
  if (!steamRunning()) {
    return {
      options: "",
      insecure: false,
      launched: false,
      error: "steam not running",
    };
  }
  const cfg = getConfig();
  const insecure = cfg.mode === "bots";
  await setLaunchOptions(insecure);
  const { options } = await getLaunchOptions(true);
  try {
    await shell.openExternal("steam://rungameid/" + APP_ID);
    return { options, insecure, launched: true };
  } catch (e) {
    return {
      options,
      insecure,
      launched: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function steamRunning(): boolean {
  try {
    const out = execFileSync("tasklist.exe", ["/FI", "IMAGENAME eq steam.exe"], {
      encoding: "utf8",
      windowsHide: true,
    });
    return out.includes("steam.exe");
  } catch {
    return false;
  }
}
