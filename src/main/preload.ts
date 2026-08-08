import { contextBridge, ipcRenderer } from "electron";
import type { AppConfig, LogEntry } from "../shared/types";

const api = {
  version: () => ipcRenderer.invoke("app:version") as Promise<{ controller: string; plugin: string }>,
  logGet: () => ipcRenderer.invoke("log:get") as Promise<LogEntry[]>,
  logClear: () => ipcRenderer.invoke("log:clear") as Promise<void>,
  winTopmost: (on: boolean) => ipcRenderer.invoke("win:topmost", on) as Promise<boolean>,
  checkUpdate: (force?: boolean) => ipcRenderer.invoke("updates:check", force),
  cachedUpdate: () => ipcRenderer.invoke("updates:cached"),
  checkControllerUpdate: (force?: boolean) => ipcRenderer.invoke("updates:controller", force),
  configGet: () => ipcRenderer.invoke("config:get") as Promise<AppConfig>,
  configSave: (patch: Partial<AppConfig>) => ipcRenderer.invoke("config:save", patch) as Promise<AppConfig>,
  detectDir: () => ipcRenderer.invoke("dir:detect"),
  selectDir: () => ipcRenderer.invoke("dir:select"),
  validateFiles: () => ipcRenderer.invoke("files:validate"),
  packageAvailable: () => ipcRenderer.invoke("package:available") as Promise<boolean>,
  packageVerify: () => ipcRenderer.invoke("package:verify"),
  installPackage: () => ipcRenderer.invoke("package:install"),
  uninstallPackage: () => ipcRenderer.invoke("package:uninstall"),
  onInstallProgress: (cb: (ev: unknown) => void) => {
    const listener = (_e: unknown, ev: unknown) => cb(ev);
    ipcRenderer.on("install:progress", listener);
    return () => ipcRenderer.removeListener("install:progress", listener);
  },
  modeGet: () => ipcRenderer.invoke("mode:get"),
  modeSet: (mode: "bots" | "online") => ipcRenderer.invoke("mode:set", mode),
  difficultyGet: () => ipcRenderer.invoke("difficulty:get"),
  difficultySet: (level: "Low" | "Medium" | "High") => ipcRenderer.invoke("difficulty:set", level),
  botItemsGet: () => ipcRenderer.invoke("botitems:get"),
  botItemsSet: (item: "skins" | "profiles", on: boolean) => ipcRenderer.invoke("botitems:set", item, on),
  presetsGet: () => ipcRenderer.invoke("presets:get"),
  presetsSetAim: (v: "head" | "mixed" | "body") => ipcRenderer.invoke("presets:setAim", v),
  presetsSetNades: (v: string) => ipcRenderer.invoke("presets:setNades", v),
  knivesGet: () => ipcRenderer.invoke("knives:get"),
  knivesSet: (bindKey: string, selected: number[]) => ipcRenderer.invoke("knives:set", bindKey, selected),
  cs2Running: () => ipcRenderer.invoke("cs2:running") as Promise<boolean>,
  cs2Launch: () => ipcRenderer.invoke("cs2:launch"),
  cs2Reconcile: () => ipcRenderer.invoke("cs2:reconcile") as Promise<void>,
  launchOptionsGet: () => ipcRenderer.invoke("launch:options"),
  launchOptionsSet: (custom: string) => ipcRenderer.invoke("launch:options:set", custom),
  dataExport: (payload: string) => ipcRenderer.invoke("data:export", payload) as Promise<boolean>,
  dataImport: () => ipcRenderer.invoke("data:import") as Promise<string | null>,
  commandsLoad: () => ipcRenderer.invoke("commands:load"),
  windowMinimize: () => ipcRenderer.send("win:minimize"),
  windowMaximize: () => ipcRenderer.send("win:maximize"),
  windowClose: () => ipcRenderer.send("win:close"),
  openExternal: (url: string) => ipcRenderer.invoke("open:external", url),
};

contextBridge.exposeInMainWorld("controller", api);
