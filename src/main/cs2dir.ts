import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getConfig } from "./config";
import type { DirectoryInfo } from "../shared/types";

const APP_DIR_NAME = "Counter-Strike Global Offensive";

function readRegistry(): string | null {
  try {
    const out = execFileSync(
      "reg.exe",
      ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"],
      { encoding: "utf8", windowsHide: true }
    );
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)\r?$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function readLibraryFolders(steamPath: string): string[] {
  const libs: string[] = [];
  const file = join(steamPath, "steamapps", "libraryfolders.vdf");
  try {
    const content = readFileSync(file, "utf-8");
    const re = /"path"\s+"(.+?)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const p = m[1].replace(/\\\\/g, "\\");
      if (p) libs.push(p);
    }
  } catch {
    /* ignore */
  }
  return libs;
}

function candidateDirs(): string[] {
  const out: string[] = [];
  const steamPath = readRegistry();
  if (steamPath) {
    out.push(join(steamPath, "steamapps", "common", APP_DIR_NAME, "game", "csgo"));
    for (const lib of readLibraryFolders(steamPath)) {
      out.push(join(lib, "steamapps", "common", APP_DIR_NAME, "game", "csgo"));
    }
  }
  return [...new Set(out)];
}

export function detectDirectories(): DirectoryInfo {
  const candidates = candidateDirs().filter(existsSync);
  const remembered = getConfig().csgoPath;
  let selected: string | null = null;
  if (remembered && existsSync(remembered)) {
    selected = remembered;
  } else if (candidates.length > 0) {
    selected = candidates[0];
  }
  return {
    candidates,
    selected,
    valid: selected !== null && existsSync(selected),
  };
}

export function selectDirectory(path: string): DirectoryInfo {
  return {
    candidates: candidateDirs(),
    selected: path,
    valid: existsSync(path),
  };
}
