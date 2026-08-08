import { shell } from "electron";
import { execFileSync } from "node:child_process";
import { getConfig } from "./config";
import { isCs2Running, asyncExecFile } from "./controls";
import type { LaunchResult } from "../shared/types";

const APP_ID = "730";
const REG_BASE = "HKCU\\Software\\Valve\\Steam\\LaunchOptions";

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

export async function getLaunchOptions(): Promise<{ options: string; insecure: boolean }> {
  try {
    const out = await asyncExecFile("reg.exe", ["query", REG_BASE, "/v", APP_ID]);
    const m = out.match(/\bREG_(?:SZ|MULTI_SZ|EXPAND_SZ)\s+(.+)\r?$/m);
    const options = m ? m[1].trim() : "";
    return { options, insecure: options.split(/\s+/).includes("-insecure") };
  } catch {
    return { options: "", insecure: false };
  }
}

export async function setLaunchOptions(enableInsecure: boolean): Promise<void> {
  if (enableInsecure) {
    const current = await getLaunchOptions();
    const parts = current.options.split(/\s+/).filter(Boolean);
    if (!parts.includes("-insecure")) parts.push("-insecure");
    await regSet(APP_ID, parts.join(" "));
  } else {
    const current = await getLaunchOptions();
    const parts = current.options.split(/\s+/).filter(Boolean).filter((p) => p !== "-insecure");
    if (parts.length > 0) await regSet(APP_ID, parts.join(" "));
    else await regDelete(APP_ID);
  }
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
  const { options } = await getLaunchOptions();
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
