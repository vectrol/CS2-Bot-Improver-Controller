export const PLUGIN_VERSION = "1.4.3";

export type GameMode = "bots" | "online";

export type DifficultyLevel = "Low" | "Medium" | "High";

export type BotItemKey = "skins" | "profiles";

export type AimValue = "head" | "mixed" | "body";

export type NadesValue = "max" | "more" | "normal" | "less" | "off";

export type AppearanceConfig = {
  accent: string;
  compact: boolean;
};

export type AppConfig = {
  language: string;
  csgoPath: string | null;
  mode: GameMode | null;
  difficulty: DifficultyLevel | null;
  aim: AimValue | null;
  nades: NadesValue | null;
  botSkins: boolean;
  botProfiles: boolean;
  dropKnifeBind: string;
  dropKnifeSubclasses: number[];
  launchOptions: string;
  appearance: AppearanceConfig;
  spectate: SpectateConfig;
  windowBounds?: { x?: number; y?: number; width?: number; height?: number };
};

export type DirectoryInfo = {
  candidates: string[];
  selected: string | null;
  valid: boolean;
};

export type FilesReport = {
  ok: boolean;
  total: number;
  present: number;
  missing: string[];
  packageFound: boolean;
  /** Bundle files that exist in the bundled zip but are missing on disk. */
  driftMissing: number;
};

export type UninstallResult = {
  ok: boolean;
  removed: number;
  message?: string;
};

export type InstallPhase = "prepare" | "extract" | "finalize" | "done" | "error";

export type InstallEvent = {
  phase: InstallPhase;
  current: number;
  total: number;
  file: string;
  message?: string;
};

export type InstallResult = {
  ok: boolean;
  filesWritten: number;
  message?: string;
};

export type DifficultyInfo = {
  current: DifficultyLevel | null;
  available: DifficultyLevel[];
  activePresent: boolean;
  cs2Running: boolean;
};

export type ModeInfo = {
  current: GameMode | null;
  onlinePresent: boolean;
  botsPresent: boolean;
  insecure: boolean;
  cs2Running: boolean;
  pending: boolean;
};

export type BotItemsState = {
  skins: boolean;
  profiles: boolean;
  cs2Running: boolean;
};

export type PresetsState = {
  aim: AimValue | null;
  nades: NadesValue | null;
  cs2Running: boolean;
};

export type DropKnivesState = {
  bindKey: string;
  selected: number[];
  cs2Running: boolean;
};

export type LaunchResult = {
  options: string;
  insecure: boolean;
  launched: boolean;
  error?: string;
};

export type AppState = {
  config: AppConfig;
  directory: DirectoryInfo;
  files: FilesReport | null;
  difficulty: DifficultyInfo | null;
  mode: ModeInfo | null;
  botItems: BotItemsState | null;
  presets: PresetsState | null;
  dropKnives: DropKnivesState | null;
  cs2Running: boolean;
};

export type CommandBlock = {
  section: string;
  title: string;
  commands: string[];
};

// ---- Spectate / GSI ----

export type GsiPlayerWeapon = {
  name: string;
  paintkit?: string;
  type?: string;
  ammo_clip?: number;
  ammo_reserve?: number;
  state?: string;
};

export type GsiPlayer = {
  name: string;
  observer_slot?: number;
  team: "T" | "CT";
  state: {
    health: number;
    armor?: number;
    helmet?: boolean;
    money?: number;
    round_kills?: number;
    round_killhs?: number;
    defusekit?: boolean;
    burning?: number;
    equip_value?: number;
  };
  weapons?: Record<string, GsiPlayerWeapon>;
  match_stats?: { kills: number; assists: number; deaths: number; mvps: number; score: number };
  position?: string;
};

export type GsiState = {
  provider?: { name: string; map: string; steamid: string; timestamp: number };
  map?: {
    name: string;
    mode?: string;
    phase?: string;
    round?: number;
    team_ct: { score: number };
    team_t: { score: number };
  };
  round?: {
    phase?: string;
    round_number?: number;
    bomb?: string;
    team_ct?: { score: number };
    team_t?: { score: number };
  };
  phase_countdowns?: { phase?: string; phase_ends_in?: string };
  allplayers?: Record<string, GsiPlayer>;
};

export type SpectateConfig = {
  overlayEnabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number; // 0.3 - 1
  fontScale: number; // 0.75 - 1.5
  clickThrough: boolean;
  showScore: boolean;
  showTimer: boolean;
  showPlayers: boolean;
  position: string;
  lastMap: string;
};

export type SpectateLaunchResult = {
  launched: boolean;
  map: string;
  error?: string;
};
