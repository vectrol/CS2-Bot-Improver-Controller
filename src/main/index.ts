import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { getConfig, saveConfig } from "./config";
import { detectDirectories, selectDirectory } from "./cs2dir";
import {
  installPackage,
  uninstallPackage,
  packageAvailable,
  driftFiles,
  verifyBundle,
} from "./install";
import { loadCommandBlocks } from "./commands";
import {
  getBotItems,
  getDifficulty,
  getDropKnives,
  getMode,
  getPresets,
  isCs2Running,
  setAim,
  setBotItem,
  setDifficulty,
  setDropKnives,
  setMode,
  setNades,
  validateFiles,
} from "./controls";
import {
  launchCs2,
  reconcileLaunchOptions,
  getLaunchOptions,
  setLaunchOptions,
} from "./launch";
import { PLUGIN_VERSION } from "../shared/types";
import { checkPluginUpdate, checkControllerUpdate, getCachedPluginUpdate, getCachedControllerUpdate } from "./updates";

let win: BrowserWindow | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

function createWindow(): void {
  const saved = getConfig();
  const bounds = saved.windowBounds as { x?: number; y?: number; width?: number; height?: number } | undefined;
  const validBounds =
    bounds &&
    typeof bounds.width === "number" &&
    typeof bounds.height === "number" &&
    bounds.width >= 720 &&
    bounds.height >= 560;

  win = new BrowserWindow({
    width: validBounds ? bounds!.width : 860,
    height: validBounds ? bounds!.height : 640,
    x: validBounds ? bounds!.x : undefined,
    y: validBounds ? bounds!.y : undefined,
    minWidth: 720,
    minHeight: 560,
    frame: false,
    backgroundColor: "#0d1117",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const persistBounds = () => {
    if (!win || win.isDestroyed() || win.isMinimized()) return;
    saveConfig({ windowBounds: win.getBounds() });
  };
  win.on("resize", persistBounds);
  win.on("move", persistBounds);

  win.once("ready-to-show", () => win?.show());

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(join(__dirname, "..", "..", "dist", "index.html"));
  }
}

function currentCsgo(): string | null {
  const info = detectDirectories();
  return info.valid ? info.selected : null;
}

function registerIpc(): void {
  ipcMain.handle("app:version", () => ({ controller: app.getVersion(), plugin: PLUGIN_VERSION }));

  ipcMain.handle("updates:check", (_e, force?: boolean) => checkPluginUpdate(!!force));
  ipcMain.handle("updates:cached", () => getCachedPluginUpdate());
  ipcMain.handle("updates:controller", (_e, force?: boolean) => checkControllerUpdate(!!force));
  ipcMain.handle("updates:controllerCached", () => getCachedControllerUpdate());

  ipcMain.handle("config:get", () => getConfig());
  ipcMain.handle("config:save", (_e, patch: Parameters<typeof saveConfig>[0]) =>
    saveConfig(patch)
  );

  ipcMain.handle("dir:detect", () => detectDirectories());
  ipcMain.handle("dir:select", () => {
    const info = detectDirectories();
    const chosen = win
      ? dialog.showOpenDialogSync(win, {
          title: "Select game/csgo directory",
          defaultPath: info.selected ?? undefined,
          properties: ["openDirectory"],
        })
      : dialog.showOpenDialogSync({
          title: "Select game/csgo directory",
          defaultPath: info.selected ?? undefined,
          properties: ["openDirectory"],
        });
    if (!chosen || chosen.length === 0) return info;
    const selected = selectDirectory(chosen[0]);
    if (selected.valid) saveConfig({ csgoPath: selected.selected! });
    return selected;
  });

  ipcMain.handle("files:validate", async () => {
    const csgo = currentCsgo();
    if (!csgo) return null;
    const report = validateFiles(csgo);
    const drift = await driftFiles(csgo).catch(() => [] as string[]);
    return { ...report, driftMissing: drift.length };
  });

  ipcMain.handle("package:available", () => packageAvailable());
  ipcMain.handle("package:verify", () => verifyBundle(true));
  ipcMain.handle("package:install", async () => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    if (isCs2Running()) throw new Error("cs2 running");
    const send = (ev: unknown) => {
      if (win && !win.isDestroyed()) win.webContents.send("install:progress", ev);
    };
    const result = await installPackage(csgo, send);
    if (result.ok) {
      setDifficulty(csgo, "Medium");
      setMode(csgo, "bots");
      await setLaunchOptions(true);
      saveConfig({ mode: "bots", difficulty: "Medium", csgoPath: csgo });
    }
    return result;
  });
  ipcMain.handle("package:uninstall", async () => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    if (isCs2Running()) throw new Error("cs2 running");
    // Restore the online gameinfo first — uninstall deletes the backup folder.
    setMode(csgo, "online");
    const result = await uninstallPackage(csgo);
    if (result.ok) {
      await setLaunchOptions(false);
      saveConfig({ mode: "online" });
    }
    return result;
  });

  ipcMain.handle("mode:get", async () => {
    const csgo = currentCsgo();
    if (!csgo) return null;
    const info = getMode(csgo);
    const lo = await getLaunchOptions();
    const cfg = getConfig();
    return {
      ...info,
      insecure: lo.insecure,
      pending: info.cs2Running && info.current !== (cfg.mode ?? null),
    };
  });
  ipcMain.handle("mode:set", async (_e, mode: "bots" | "online") => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    const info = setMode(csgo, mode);
    await setLaunchOptions(mode === "bots");
    const lo = await getLaunchOptions();
    saveConfig({ mode });
    return { ...info, insecure: lo.insecure, pending: info.cs2Running };
  });

  ipcMain.handle("difficulty:get", () => {
    const csgo = currentCsgo();
    return csgo ? getDifficulty(csgo) : null;
  });
  ipcMain.handle("difficulty:set", (_e, level: "Low" | "Medium" | "High") => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    const info = setDifficulty(csgo, level);
    saveConfig({ difficulty: level });
    return info;
  });

  ipcMain.handle("botitems:get", () => {
    const csgo = currentCsgo();
    return csgo ? getBotItems(csgo) : null;
  });
  ipcMain.handle("botitems:set", (_e, item: "skins" | "profiles", on: boolean) => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    const info = setBotItem(csgo, item, on);
    saveConfig({
      botSkins: item === "skins" ? on : getConfig().botSkins,
      botProfiles: item === "profiles" ? on : getConfig().botProfiles,
    });
    return info;
  });

  ipcMain.handle("presets:get", () => {
    const csgo = currentCsgo();
    return csgo ? getPresets(csgo) : null;
  });
  ipcMain.handle("presets:setAim", (_e, value: "head" | "mixed" | "body") => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    const info = setAim(csgo, value);
    saveConfig({ aim: value });
    return info;
  });
  ipcMain.handle("presets:setNades", (_e, value: string) => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    const info = setNades(csgo, value as Parameters<typeof setNades>[1]);
    saveConfig({ nades: value as Parameters<typeof saveConfig>[0]["nades"] });
    return info;
  });

  ipcMain.handle("knives:get", () => {
    const csgo = currentCsgo();
    return csgo ? getDropKnives(csgo) : null;
  });
  ipcMain.handle("knives:set", (_e, bindKey: string, selected: number[]) => {
    const csgo = currentCsgo();
    if (!csgo) throw new Error("csgo directory not set");
    const info = setDropKnives(csgo, bindKey, selected);
    saveConfig({ dropKnifeBind: bindKey, dropKnifeSubclasses: selected });
    return info;
  });

  ipcMain.handle("cs2:running", () => isCs2Running());
  ipcMain.handle("cs2:launch", async () => launchCs2());
  ipcMain.handle("cs2:reconcile", async () => reconcileLaunchOptions());

  ipcMain.handle("launch:options", async () => {
    const { options, insecure } = await getLaunchOptions(true);
    return { options, insecure };
  });
  ipcMain.handle("launch:options:set", async (_e, custom: string) => {
    saveConfig({ launchOptions: custom.trim() });
    await setLaunchOptions(getConfig().mode === "bots");
    return getLaunchOptions(true);
  });

  ipcMain.handle("data:export", async (_e, payload: string) => {
    const file = dialog.showSaveDialogSync(win!, {
      title: "Export settings",
      defaultPath: "cbic-config.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!file) return false;
    try {
      writeFileSync(file, payload, "utf-8");
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("data:import", async () => {
    const file = dialog.showOpenDialogSync(win!, {
      title: "Import settings",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (!file || file.length === 0) return null;
    try {
      return readFileSync(file[0], "utf-8");
    } catch {
      return null;
    }
  });

  ipcMain.handle("commands:load", () => loadCommandBlocks());
}

app.whenReady().then(() => {
  registerIpc();
  ipcMain.on("win:minimize", () => win?.minimize());
  ipcMain.on("win:maximize", () => {
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on("win:close", () => win?.close());
  ipcMain.handle("open:external", (_e, url: string) => shell.openExternal(url));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
