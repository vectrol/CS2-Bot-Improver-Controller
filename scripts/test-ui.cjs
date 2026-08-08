const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 60000);

const MIN_CONFIG = {
  language: "zh-CN",
  csgoPath: null,
  mode: null,
  difficulty: null,
  aim: null,
  nades: null,
  botSkins: true,
  botProfiles: true,
  dropKnifeBind: "\\",
  dropKnifeSubclasses: [500],
  launchOptions: "",
  appearance: { accent: "#f2a33c", compact: false },
  spectate: {
    overlayEnabled: true,
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

app.whenReady().then(() => {
  ipcMain.handle("config:get", () => MIN_CONFIG);
  ipcMain.handle("config:save", (_e, p) => ({ ...MIN_CONFIG, ...p }));
  ipcMain.handle("dir:detect", () => ({ candidates: [], selected: null, valid: false }));
  ipcMain.handle("cs2:running", () => false);
  ipcMain.handle("cs2:reconcile", () => undefined);
  ipcMain.handle("files:validate", () => null);
  ipcMain.handle("difficulty:get", () => null);
  ipcMain.handle("mode:get", () => null);
  ipcMain.handle("botitems:get", () => null);
  ipcMain.handle("presets:get", () => null);
  ipcMain.handle("knives:get", () => null);
  ipcMain.handle("updates:cached", () => null);
  ipcMain.handle("updates:check", () => ({ current: "1.4.3", latest: null, hasUpdate: false, error: "offline" }));
  ipcMain.handle("updates:controller", () => ({ current: "1.2.0", latest: null, hasUpdate: false, error: "offline" }));
  ipcMain.handle("spectate:state", () => null);
  ipcMain.handle("spectate:maps", () => ["de_mirage"]);
  ipcMain.handle("gsi:status", () => ({ running: false, port: 8123, lastUpdate: 0 }));
  ipcMain.handle("package:verify", () => ({ ok: true, expected: "", actual: "" }));
  const win = new BrowserWindow({
    width: 860,
    height: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "out", "main", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const errors = [];
  win.webContents.on("console-message", (_e, _l, message) => {
    if (/error|uncaught/i.test(message)) errors.push(message);
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    // Phase 1: main window
    await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    await sleep(4000);
    let pass1 = false;
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const root = document.getElementById("root");
          const hasController = typeof window.controller === "object" && typeof window.controller.version === "function";
          return {
            hasController,
            children: root ? root.children.length : 0,
            text: root ? root.textContent.slice(0, 120) : "",
            title: document.title,
          };
        })()
      `);
      console.log("UI-CHECK:", JSON.stringify(result));
      pass1 = result.hasController && result.children > 0 && result.title.includes("CS2");
      console.log(pass1 ? "UI SMOKE PASSED" : "UI SMOKE FAILED");
    } catch (e) {
      console.log("UI-CHECK EXCEPTION:", e.message);
    }

    // Phase 2: overlay window (separate window — mirrors the real overlay flow)
    const overlay = new BrowserWindow({
      width: 420,
      height: 260,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "..", "out", "main", "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    await overlay.loadFile(path.join(__dirname, "..", "dist", "index.html"), { hash: "overlay" });
    await sleep(3000);
    let pass2 = false;
    try {
      const result = await overlay.webContents.executeJavaScript(`
        (() => {
          const root = document.getElementById("root");
          return {
            isOverlay: !!document.querySelector(".overlay"),
            hasPanel: !!document.querySelector(".overlay__panel"),
            text: root ? root.textContent.slice(0, 80) : "",
          };
        })()
      `);
      console.log("OVERLAY-CHECK:", JSON.stringify(result));
      pass2 = result.isOverlay && result.hasPanel;
      console.log(pass2 ? "OVERLAY SMOKE PASSED" : "OVERLAY SMOKE FAILED");
    } catch (e) {
      console.log("OVERLAY-CHECK EXCEPTION:", e.message);
    }

    if (errors.length) console.log("CONSOLE ERRORS:", JSON.stringify(errors));
    app.exit(pass1 && pass2 ? 0 : 1);
  })();
});
