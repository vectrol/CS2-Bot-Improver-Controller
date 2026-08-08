import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppConfig,
  BotItemsState,
  DifficultyInfo,
  DirectoryInfo,
  DropKnivesState,
  FilesReport,
  ModeInfo,
  PresetsState,
  AimValue,
} from "../../../shared/types";

declare global {
  interface Window {
    controller: {
      version: () => Promise<{ controller: string; plugin: string }>;
      checkUpdate: (force?: boolean) => Promise<Store["updateInfo"]>;
      cachedUpdate: () => Promise<Store["updateInfo"] | null>;
      checkControllerUpdate: (force?: boolean) => Promise<Store["updateInfo"]>;
      configGet: () => Promise<AppConfig>;
      configSave: (patch: Partial<AppConfig>) => Promise<AppConfig>;
      detectDir: () => Promise<DirectoryInfo>;
      selectDir: () => Promise<DirectoryInfo>;
      validateFiles: () => Promise<FilesReport | null>;
      packageAvailable: () => Promise<boolean>;
      installPackage: () => Promise<{ ok: boolean; filesWritten: number; message?: string }>;
      uninstallPackage: () => Promise<{ ok: boolean; removed: number; message?: string }>;
      onInstallProgress: (cb: (ev: any) => void) => () => void;
      modeGet: () => Promise<ModeInfo | null>;
      modeSet: (mode: "bots" | "online") => Promise<ModeInfo>;
      difficultyGet: () => Promise<DifficultyInfo | null>;
      difficultySet: (level: "Low" | "Medium" | "High") => Promise<DifficultyInfo>;
      botItemsGet: () => Promise<BotItemsState | null>;
      botItemsSet: (item: "skins" | "profiles", on: boolean) => Promise<BotItemsState>;
      presetsGet: () => Promise<PresetsState | null>;
      presetsSetAim: (v: AimValue) => Promise<PresetsState>;
      presetsSetNades: (v: string) => Promise<PresetsState>;
      knivesGet: () => Promise<DropKnivesState | null>;
      knivesSet: (bindKey: string, selected: number[]) => Promise<DropKnivesState>;
      cs2Running: () => Promise<boolean>;
      cs2Launch: () => Promise<any>;
      cs2Reconcile: () => Promise<void>;
      commandsLoad: () => Promise<any[]>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      openExternal: (url: string) => Promise<void>;
    };
  }
}

type Store = {
  ready: boolean;
  config: AppConfig | null;
  directory: DirectoryInfo | null;
  files: FilesReport | null;
  difficulty: DifficultyInfo | null;
  mode: ModeInfo | null;
  botItems: BotItemsState | null;
  presets: PresetsState | null;
  dropKnives: DropKnivesState | null;
  cs2Running: boolean;
  installing: boolean;
  installProgress: { phase: string; current: number; total: number; file: string } | null;
  error: string | null;
  reportError: (msg: string) => void;
  clearError: () => void;
  updateInfo: {
    current: string;
    latest: string | null;
    name: string | null;
    url: string | null;
    publishedAt: string | null;
    hasUpdate: boolean;
    error?: string;
  } | null;
  controllerUpdate: Store["updateInfo"];
  updateChecking: boolean;
  checkUpdate: (force?: boolean) => Promise<void>;
  setInstalling: (v: boolean) => void;
  setInstallProgress: (p: Store["installProgress"]) => void;
  refresh: (silent?: boolean) => Promise<void>;
  updateConfig: (patch: Partial<AppConfig>) => Promise<void>;
  pickDirectory: () => Promise<void>;
  setMode: (m: "bots" | "online") => Promise<void>;
  setDifficulty: (l: "Low" | "Medium" | "High") => Promise<void>;
  setBotItem: (item: "skins" | "profiles", on: boolean) => Promise<void>;
  setAim: (v: AimValue) => Promise<void>;
  setNades: (v: string) => Promise<void>;
  setKnives: (bind: string, sel: number[]) => Promise<void>;
  uninstall: () => Promise<{ ok: boolean; removed: number } | null>;
  launch: () => Promise<{ launched: boolean; error?: string }>;
  toast: string | null;
  showToast: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [directory, setDirectory] = useState<DirectoryInfo | null>(null);
  const [files, setFiles] = useState<FilesReport | null>(null);
  const [difficulty, setDifficultyS] = useState<DifficultyInfo | null>(null);
  const [mode, setModeS] = useState<ModeInfo | null>(null);
  const [botItems, setBotItemsS] = useState<BotItemsState | null>(null);
  const [presets, setPresetsS] = useState<PresetsState | null>(null);
  const [dropKnives, setDropKnivesS] = useState<DropKnivesState | null>(null);
  const [cs2Running, setCs2Running] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<Store["installProgress"]>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<Store["updateInfo"]>(null);
  const [controllerUpdate, setControllerUpdate] = useState<Store["updateInfo"]>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const reportError = useCallback((msg: string) => setError(msg), []);
  const clearError = useCallback(() => setError(null), []);

  const checkUpdate = useCallback(async (force = false) => {
    setUpdateChecking(true);
    try {
      const [plugin, controller] = await Promise.all([
        window.controller.checkUpdate(force),
        window.controller.checkControllerUpdate(force),
      ]);
      setUpdateInfo(plugin);
      setControllerUpdate(controller);
    } catch (e) {
      const errInfo = {
        current: "",
        latest: null,
        name: null,
        url: null,
        publishedAt: null,
        hasUpdate: false,
        error: e instanceof Error ? e.message : String(e),
      };
      setUpdateInfo(errInfo);
      setControllerUpdate(errInfo);
    } finally {
      setUpdateChecking(false);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const refresh = useCallback(async (silent = false) => {
    try {
      const [dir, running] = await Promise.all([window.controller.detectDir(), window.controller.cs2Running()]);
      setDirectory(dir);
      setCs2Running(running);
      if (!dir.valid || !dir.selected) {
        setFiles(null);
        setDifficultyS(null);
        setModeS(null);
        setBotItemsS(null);
        setPresetsS(null);
        setDropKnivesS(null);
        return;
      }
      const [f, d, m, b, p, k] = await Promise.all([
        window.controller.validateFiles(),
        window.controller.difficultyGet(),
        window.controller.modeGet(),
        window.controller.botItemsGet(),
        window.controller.presetsGet(),
        window.controller.knivesGet(),
      ]);
      setFiles(f);
      setDifficultyS(d);
      setModeS(m);
      setBotItemsS(b);
      setPresetsS(p);
      setDropKnivesS(k);
    } catch {
      if (!silent) {
        setFiles(null);
        setDifficultyS(null);
        setModeS(null);
        setBotItemsS(null);
        setPresetsS(null);
        setDropKnivesS(null);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await window.controller.configGet();
        setConfig(cfg);
      } catch {
        /* ignore */
      }
      await window.controller.cs2Reconcile().catch(() => undefined);
      await refresh();
      checkUpdate(false);
      setReady(true);
    })();
  }, [refresh, checkUpdate]);

  useEffect(() => {
    if (!ready) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      await refresh(true);
    };
    const id = window.setInterval(tick, 2000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [ready, refresh]);

  const updateConfig = useCallback(async (patch: Partial<AppConfig>) => {
    setConfig((c) => (c ? { ...c, ...patch } : c));
    try {
      await window.controller.configSave(patch);
    } catch {
      /* ignore */
    }
  }, []);

  const pickDirectory = useCallback(async () => {
    try {
      const info = await window.controller.selectDir();
      setDirectory(info);
      await updateConfig({ csgoPath: info.selected });
      await refresh();
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [refresh, reportError, updateConfig]);

  const setMode = useCallback(async (m: "bots" | "online") => {
    try {
      const info = await window.controller.modeSet(m);
      setModeS(info);
      await updateConfig({ mode: m });
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [reportError, updateConfig]);

  const setDifficulty = useCallback(async (l: "Low" | "Medium" | "High") => {
    try {
      const info = await window.controller.difficultySet(l);
      setDifficultyS(info);
      await updateConfig({ difficulty: l });
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [reportError, updateConfig]);

  const setBotItem = useCallback(async (item: "skins" | "profiles", on: boolean) => {
    try {
      const info = await window.controller.botItemsSet(item, on);
      setBotItemsS(info);
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [reportError]);

  const setAim = useCallback(async (v: AimValue) => {
    try {
      const info = await window.controller.presetsSetAim(v);
      setPresetsS(info);
      await updateConfig({ aim: v });
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [reportError, updateConfig]);

  const setNades = useCallback(async (v: string) => {
    try {
      const info = await window.controller.presetsSetNades(v);
      setPresetsS(info);
      await updateConfig({ nades: v as AppConfig["nades"] });
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [reportError, updateConfig]);

  const setKnives = useCallback(async (bind: string, sel: number[]) => {
    try {
      const info = await window.controller.knivesSet(bind, sel);
      setDropKnivesS(info);
      await updateConfig({ dropKnifeBind: bind, dropKnifeSubclasses: sel });
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [reportError, updateConfig]);

  const uninstall = useCallback(async () => {
    try {
      const result = await window.controller.uninstallPackage();
      await refresh();
      return result;
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [refresh, reportError]);

  const launch = useCallback(async () => {
    try {
      return await window.controller.cs2Launch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : String(e));
      return { launched: false };
    }
  }, [reportError]);

  const value: Store = {
    ready,
    config,
    directory,
    files,
    difficulty,
    mode,
    botItems,
    presets,
    dropKnives,
    cs2Running,
    installing,
    installProgress,
    error,
    reportError,
    clearError,
    updateInfo,
    controllerUpdate,
    updateChecking,
    checkUpdate,
    setInstalling,
    setInstallProgress,
    refresh,
    updateConfig,
    pickDirectory,
    setMode,
    setDifficulty,
    setBotItem,
    setAim,
    setNades,
    setKnives,
    uninstall,
    launch,
    toast,
    showToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
