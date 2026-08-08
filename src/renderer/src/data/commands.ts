import { Crosshair, Bomb, Users, Gamepad2, Plug, ShieldHalf, type LucideIcon } from "lucide-react";
import type { Lang } from "../i18n";

export type SectionMeta = {
  icon: LucideIcon;
  zh: string;
  en: string;
};

export const SECTION_META: Record<string, SectionMeta> = {
  "GAME MODE": { icon: Gamepad2, zh: "游戏模式", en: "Game mode" },
  "CONNECTION": { icon: Plug, zh: "连接", en: "Connection" },
  "BOT AIM STYLE": { icon: Crosshair, zh: "瞄准风格", en: "Aim style" },
  "BOT NADE THROWING": { icon: Bomb, zh: "投掷物", en: "Nade throwing" },
  "BOT MANAGEMENT": { icon: Users, zh: "机器人管理", en: "Bot management" },
  "ADD TEAMS": { icon: ShieldHalf, zh: "添加战队", en: "Add teams" },
};

export const COMMAND_DESCS: Record<string, { zh: string; en: string }> = {
  "scouts_on": { zh: "开启飞碟狙击模式（低重力 + 连发 AWP）", en: "Enable Flying Scoutsman (low gravity, auto AWP)" },
  "scouts_off": { zh: "关闭飞碟狙击模式", en: "Disable Flying Scoutsman" },
  "status": { zh: "显示服务器信息与 steamid，供好友 connect 加入", en: "Show server info & steamid for friends to join" },
  "bot_aim head": { zh: "优先瞄准头部", en: "Prioritize aiming at the head" },
  "bot_aim body": { zh: "优先瞄准躯干", en: "Prioritize aiming at the torso" },
  "bot_aim mixed": { zh: "按情况动态选择瞄准点（默认）", en: "Pick aim spots dynamically (default)" },
  "bot_nades off": { zh: "关闭机器人投掷物", en: "Disable bot grenades" },
  "bot_nades less": { zh: "较少投掷物", en: "Lower grenade count" },
  "bot_nades normal": { zh: "接近人类玩家的投掷频率（默认）", en: "Human-like grenade frequency (default)" },
  "bot_nades more": { zh: "更多投掷物", en: "Higher grenade count" },
  "bot_nades max": { zh: "几乎不限制投掷物", en: "Minimal grenade limits" },
  "bot_kick": { zh: "踢出所有机器人", en: "Kick all bots" },
  "bot_kick t": { zh: "踢出 T 队机器人", en: "Kick T-side bots" },
  "bot_kick ct": { zh: "踢出 CT 队机器人", en: "Kick CT-side bots" },
  "bot_add": { zh: "添加机器人（自动分配队伍）", en: "Add a bot (auto team)" },
  "bot_add_t": { zh: "添加 T 队机器人", en: "Add a T-side bot" },
  "bot_add_ct": { zh: "添加 CT 队机器人", en: "Add a CT-side bot" },
  "bot_quota": { zh: "查看当前机器人数量上限", en: "Show bot quota" },
  "br_reroll": { zh: "重新随机所有机器人的皮肤/道具", en: "Re-roll every bot's cosmetics" },
  "mp_restartgame 1": { zh: "立即重启当前对局", en: "Restart the match now" },
};

export function sectionLabel(meta: SectionMeta | undefined, section: string, lang: Lang): string {
  if (!meta) return section;
  return lang === "zh-CN" ? meta.zh : meta.en;
}

/** Look up a description for a command block (exact line first, then first-line prefix). */
export function descFor(lines: string[], lang: Lang): string | null {
  const probe = lines[0]?.trim();
  if (!probe) return null;
  const exact = COMMAND_DESCS[probe];
  if (exact) return lang === "zh-CN" ? exact.zh : exact.en;
  if (lines.length === 2) {
    const ct = lines[0].includes("bot_add_ct") && lines[1].includes("bot_add_t");
    if (ct) {
      return lang === "zh-CN"
        ? "CT 与 T 侧阵容各一行，一键复制即可在控制台粘贴"
        : "One line per side (CT/T) — copy and paste into the console";
    }
  }
  const prefix = probe.split(" ")[0];
  if (prefix === "bot_aim" && lines.length > 1) {
    return lang === "zh-CN" ? "选择瞄准风格" : "Pick an aim style";
  }
  if (prefix === "bot_nades" && lines.length > 1) {
    return lang === "zh-CN" ? "选择投掷物频率" : "Pick nade frequency";
  }
  return null;
}
