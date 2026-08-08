import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AppConfig } from "../shared/types";

const DEFAULTS: AppConfig = {
  language: "zh-CN",
  csgoPath: null,
  mode: null,
  difficulty: null,
  aim: null,
  nades: null,
  botSkins: true,
  botProfiles: true,
  dropKnifeBind: "\\",
  dropKnifeSubclasses: [
    500, 503, 505, 506, 507, 508, 509, 512, 514, 515, 516, 517, 518, 519, 520,
    521, 522, 523, 525, 526,
  ],
  launchOptions: "",
  appearance: { accent: "#f2a33c", compact: false },
  spectate: {
    overlayEnabled: false,
    autoDirector: true,
    x: 80,
    y: 80,
    width: 420,
    height: 260,
    opacity: 0.92,
    fontScale: 1,
    clickThrough: false,
    showScore: true,
    showTimer: true,
    showPlayers: true,
    position: "top-left",
    lastMap: "de_mirage",
  },
};

let cache: AppConfig | null = null;

function file(): string {
  return join(app.getPath("userData"), "config.json");
}

export function getConfig(): AppConfig {
  if (cache) return cache;
  try {
    if (existsSync(file())) {
      const raw = JSON.parse(readFileSync(file(), "utf-8")) as Partial<AppConfig>;
      cache = { ...DEFAULTS, ...raw };
      return cache;
    }
  } catch {
    /* corrupted config — fall back to defaults */
  }
  cache = { ...DEFAULTS };
  return cache;
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...getConfig(), ...patch };
  cache = next;
  try {
    mkdirSync(app.getPath("userData"), { recursive: true });
    writeFileSync(file(), JSON.stringify(next, null, 2), "utf-8");
  } catch {
    /* best-effort persistence */
  }
  return next;
}
