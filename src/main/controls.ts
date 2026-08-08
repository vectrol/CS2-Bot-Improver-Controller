import { execFileSync } from "node:child_process";
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  BotItemsState,
  BotItemKey,
  DifficultyInfo,
  DifficultyLevel,
  DropKnivesState,
  FilesReport,
  GameMode,
  ModeInfo,
  NadesValue,
  PresetsState,
  AimValue,
} from "../shared/types";

const PLUGINS = "addons/counterstrikesharp/plugins";
const METAMOD_ADDONS = "addons";

const REQUIRED: string[] = [
  "gameinfo.gi",
  "addons/counterstrikesharp/bin/win64/counterstrikesharp.dll",
  "addons/metamod/bin/win64/metamod.2.cs2.dll",
  "addons/metamod.vdf",
  "addons/metamod_x64.vdf",
  "backup/Online/gameinfo.gi",
  "backup/WithBots/gameinfo.gi",
  "overrides/Medium/botprofile.vpk",
];

const CS2_CACHE_MS = 3000;
let cs2Cache = { at: 0, running: false };

export function isCs2Running(force = false): boolean {
  const now = Date.now();
  if (!force && now - cs2Cache.at < CS2_CACHE_MS) return cs2Cache.running;
  let running = false;
  try {
    const out = execFileSync("tasklist.exe", ["/FI", "IMAGENAME eq cs2.exe"], {
      encoding: "utf8",
      windowsHide: true,
    });
    running = out.includes("cs2.exe");
  } catch {
    running = false;
  }
  cs2Cache = { at: now, running };
  return running;
}

function fileSize(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return -1;
  }
}

export function validateFiles(csgo: string): FilesReport {
  const present: string[] = [];
  const missing: string[] = [];
  for (const rel of REQUIRED) {
    if (existsSync(join(csgo, rel))) present.push(rel);
    else missing.push(rel);
  }
  const pluginsOk = existsSync(join(csgo, PLUGINS));
  const total = REQUIRED.length;
  return {
    ok: missing.length === 0 && pluginsOk,
    total,
    present: present.length,
    missing,
    packageFound: pluginsOk,
    driftMissing: 0,
  };
}

// ---- Mode (gameinfo.gi swap) ----

function gameinfoContainsBots(csgo: string): boolean {
  try {
    const text = readFileSync(join(csgo, "gameinfo.gi"), "utf-8");
    return text.includes("csgo/overrides/botprofile.vpk") || text.includes("csgo/addons/metamod");
  } catch {
    return false;
  }
}

export function getMode(csgo: string): ModeInfo {
  const onlinePresent = existsSync(join(csgo, "backup", "Online", "gameinfo.gi"));
  const botsPresent = existsSync(join(csgo, "backup", "WithBots", "gameinfo.gi"));
  const isBots = gameinfoContainsBots(csgo);
  const running = isCs2Running();
  return {
    current: isBots ? "bots" : "online",
    onlinePresent,
    botsPresent,
    insecure: false,
    cs2Running: running,
    pending: false,
  };
}

export function setMode(csgo: string, mode: GameMode): ModeInfo {
  if (mode === "bots") {
    const src = join(csgo, "backup", "WithBots", "gameinfo.gi");
    if (existsSync(src)) copyFileSync(src, join(csgo, "gameinfo.gi"));
  } else {
    const src = join(csgo, "backup", "Online", "gameinfo.gi");
    if (existsSync(src)) copyFileSync(src, join(csgo, "gameinfo.gi"));
  }
  return getMode(csgo);
}

// ---- Difficulty (botprofile.vpk) ----

export function getDifficulty(csgo: string): DifficultyInfo {
  const available = (["Low", "Medium", "High"] as DifficultyLevel[]).filter((l) =>
    fileSize(join(csgo, "overrides", l, "botprofile.vpk")) >= 0
  );
  const active = join(csgo, "overrides", "botprofile.vpk");
  const activeSize = fileSize(active);
  let current: DifficultyLevel | null = null;
  if (activeSize >= 0) {
    for (const l of available) {
      if (fileSize(join(csgo, "overrides", l, "botprofile.vpk")) === activeSize) {
        current = l;
        break;
      }
    }
  }
  return {
    current,
    available,
    activePresent: activeSize >= 0,
    cs2Running: isCs2Running(),
  };
}

export function setDifficulty(csgo: string, level: DifficultyLevel): DifficultyInfo {
  const src = join(csgo, "overrides", level, "botprofile.vpk");
  if (existsSync(src)) {
    copyFileSync(src, join(csgo, "overrides", "botprofile.vpk"));
  }
  return getDifficulty(csgo);
}

// ---- Bot items (folder renames + core.json) ----

function renameIfExists(dir: string, from: string, to: string): void {
  if (existsSync(join(dir, from))) {
    renameSync(join(dir, from), join(dir, to));
  }
}

function setCoreGuidelines(csgo: string, follow: boolean): void {
  const core = join(csgo, "addons", "counterstrikesharp", "configs", "core.json");
  if (!existsSync(core)) return;
  try {
    const json = JSON.parse(readFileSync(core, "utf-8")) as Record<string, unknown>;
    json.FollowCS2ServerGuidelines = follow;
    writeFileSync(core, JSON.stringify(json, null, 4) + "\n", "utf-8");
  } catch {
    /* ignore */
  }
}

export function getBotItems(csgo: string): BotItemsState {
  const plugins = join(csgo, PLUGINS);
  const randomizerOn = existsSync(join(plugins, "BotRandomizer"));
  const hiderOn = existsSync(join(csgo, METAMOD_ADDONS, "BotHider"));
  return { skins: randomizerOn, profiles: hiderOn, cs2Running: isCs2Running() };
}

export function setBotItem(csgo: string, item: BotItemKey, on: boolean): BotItemsState {
  const plugins = join(csgo, PLUGINS);
  if (item === "skins") {
    if (on) {
      renameIfExists(plugins, "BotRandomizer_disabled", "BotRandomizer");
      setCoreGuidelines(csgo, false);
    } else {
      renameIfExists(plugins, "BotRandomizer", "BotRandomizer_disabled");
      setCoreGuidelines(csgo, true);
    }
  } else if (item === "profiles") {
    if (on) renameIfExists(csgo, "addons/BotHider_disabled", "addons/BotHider");
    else renameIfExists(csgo, "addons/BotHider", "addons/BotHider_disabled");
  }
  return getBotItems(csgo);
}

// ---- Presets (bot_aim / bot_nades in cfg) ----

const PRESET_CFGS = ["cfg/my_bot_normal_config.cfg", "cfg/my_bot_ffa_config.cfg"];

function setCfgLine(csgo: string, rel: string, key: string, value: string): void {
  const file = join(csgo, rel);
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf-8").split(/\r?\n/);
  const pattern = new RegExp(`^\\s*${key}\\s+`);
  const idx = lines.findIndex((l) => pattern.test(l));
  if (idx >= 0) lines[idx] = `${key} ${value}`;
  else lines.push(`${key} ${value}`);
  writeFileSync(file, lines.join("\n").replace(/\n+$/, "") + "\n", "utf-8");
}

function readCfgValue(csgo: string, key: string): string | null {
  for (const rel of PRESET_CFGS) {
    try {
      const lines = readFileSync(join(csgo, rel), "utf-8").split(/\r?\n/);
      const line = lines.find((l) => new RegExp(`^\\s*${key}\\s+`).test(l));
      if (line) return line.trim().split(/\s+/)[1] ?? null;
    } catch {
      /* skip */
    }
  }
  return null;
}

export function getPresets(csgo: string): PresetsState {
  return {
    aim: readCfgValue(csgo, "bot_aim") as AimValue | null,
    nades: readCfgValue(csgo, "bot_nades") as NadesValue | null,
    cs2Running: isCs2Running(),
  };
}

export function setAim(csgo: string, value: AimValue): PresetsState {
  for (const rel of PRESET_CFGS) setCfgLine(csgo, rel, "bot_aim", value);
  return getPresets(csgo);
}

export function setNades(csgo: string, value: NadesValue): PresetsState {
  for (const rel of PRESET_CFGS) setCfgLine(csgo, rel, "bot_nades", value);
  return getPresets(csgo);
}

// ---- Drop knives (bind line in cfg) ----

export function getDropKnives(csgo: string): DropKnivesState {
  let bindKey = "\\";
  let selected: number[] = [];
  for (const rel of PRESET_CFGS) {
    try {
      const lines = readFileSync(join(csgo, rel), "utf-8").split(/\r?\n/);
      const line = lines.find((l) => /^\s*bind\s+/.test(l) && l.includes("subclass_create"));
      if (line) {
        const m = line.match(/^bind\s+(.+?)\s+"/);
        if (m) bindKey = m[1];
        selected = [...line.matchAll(/subclass_create\s+(\d+)/g)].map((x) => Number(x[1]));
        break;
      }
    } catch {
      /* skip */
    }
  }
  return { bindKey, selected, cs2Running: isCs2Running() };
}

export function setDropKnives(
  csgo: string,
  bindKey: string,
  selected: number[]
): DropKnivesState {
  const bindCmd = `bind ${bindKey} "${selected.map((n) => `subclass_create ${n}`).join(";")}"`;
  for (const rel of PRESET_CFGS) {
    const file = join(csgo, rel);
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf-8").split(/\r?\n/);
    const idx = lines.findIndex((l) => /^\s*bind\s+/.test(l) && l.includes("subclass_create"));
    if (idx >= 0) lines[idx] = bindCmd;
    else lines.push(bindCmd);
    writeFileSync(file, lines.join("\n").replace(/\n+$/, "") + "\n", "utf-8");
  }
  return getDropKnives(csgo);
}

// ---- helpers ----

export function asyncExecFile(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}
