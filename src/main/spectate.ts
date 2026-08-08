import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getConfig, saveConfig } from "./config";
import { getLaunchOptions, setLaunchOptions } from "./launch";
import { isCs2Running, asyncExecFile } from "./controls";
import { shell } from "electron";
import { GSI_PORT } from "./gsi";
import type { SpectateLaunchResult } from "../shared/types";

export const OFFICIAL_MAPS = [
  "de_mirage",
  "de_inferno",
  "de_nuke",
  "de_dust2",
  "de_ancient",
  "de_anubis",
  "de_vertigo",
  "de_train",
  "de_overpass",
  "de_cache",
  "de_office",
  "de_italy",
  "de_anubis",
];

const GSI_CFG = `"cbic"
{
    "uri" "http://127.0.0.1:${GSI_PORT}"
    "timeout" "5.0"
    "buffer" "0.1"
    "throttle" "0.1"
    "heartbeat" "10.0"
    "data"
    {
        "provider"                 "1"
        "map"                      "1"
        "round"                    "1"
        "phase_countdowns"         "1"
        "player_id"                "1"
        "player_state"             "1"
        "player_weapons"           "1"
        "player_match_stats"       "1"
        "allplayers_id"            "1"
        "allplayers_state"         "1"
        "allplayers_weapons"       "1"
        "allplayers_match_stats"   "1"
        "allplayers_position"      "1"
        "allplayers_spectators"    "1"
        "allplayers_info_spectators" "1"
    }
}
`;

export function writeSpectateFiles(csgo: string, autoDirector = true): void {
  const cfgDir = join(csgo, "cfg");
  mkdirSync(cfgDir, { recursive: true });
  writeFileSync(join(cfgDir, "gamestate_integration_cbic.cfg"), GSI_CFG, "utf-8");
  const director = autoDirector
    ? `// CBIC 导播观战 — 自动导播已启用（游戏内可用控制台 spec_autodirector 0/1 实时切换）\nspec_autodirector 1\nspec_autodirector_speed 1.05\nspec_autodirector_lookahead 2.2\nspec_smooth_mouse_scale 1.4\n`
    : `// CBIC 导播观战 — 自动导播已关闭（游戏内可用控制台 spec_autodirector 1 开启）\nspec_autodirector 0\n`;
  const cfg =
    `// CBIC 导播观战模式 — 自动加入观战席\njointeam 1\nspec_show_xray 1\nmp_warmuptime 3\n` +
    director;
  writeFileSync(join(cfgDir, "cbic_spectate.cfg"), cfg, "utf-8");
}

/** Temporarily add the map+exec args to Steam launch options, launch, then restore. */
export async function launchSpectate(csgo: string, map: string): Promise<SpectateLaunchResult> {
  if (isCs2Running()) {
    return { launched: false, map, error: "cs2 already running" };
  }
  const autoDirector = getConfig().spectate?.autoDirector ?? true;
  writeSpectateFiles(csgo, autoDirector);
  saveConfig({ spectate: { ...getConfig().spectate, lastMap: map } });

  const prev = await getLaunchOptions(true);
  const base = prev.options.split(/\s+/).filter(Boolean);
  // Spectating bot matches always needs -insecure (plugins + bot control).
  const merged = [...new Set([...base, "-insecure", "+map", map, "+exec", "cbic_spectate"])];
  await setLaunchOptionsWith(merged);

  try {
    await shell.openExternal("steam://rungameid/730");
    return { launched: true, map };
  } catch (e) {
    return { launched: false, map, error: e instanceof Error ? e.message : String(e) };
  } finally {
    // Restore the user's stored options shortly after Steam picks up the launch.
    setTimeout(async () => {
      try {
        await setLaunchOptionsWith(base);
      } catch {
        /* ignore */
      }
    }, 4000);
  }
}

async function setLaunchOptionsWith(parts: string[]): Promise<void> {
  if (parts.length > 0) {
    await asyncExecFile("reg.exe", [
      "add",
      "HKCU\\Software\\Valve\\Steam\\LaunchOptions",
      "/v",
      "730",
      "/d",
      parts.join(" "),
      "/f",
    ]);
  } else {
    try {
      await asyncExecFile("reg.exe", [
        "delete",
        "HKCU\\Software\\Valve\\Steam\\LaunchOptions",
        "/v",
        "730",
        "/f",
      ]);
    } catch {
      /* absent */
    }
  }
}
