export const PLUGIN_VERSION = "1.4.3";

export type GameMode = "bots" | "online";

export type DifficultyLevel = "Low" | "Medium" | "High";

export type BotItemKey = "skins" | "profiles";

export type AimValue = "head" | "mixed" | "body";

export type NadesValue = "max" | "more" | "normal" | "less" | "off";

export type AppearanceConfig = {
  accent: string;
  compact: boolean;
  topmost: boolean;
};

export type LogEntry = {
  time: number;
  action: string;
  detail?: string;
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
