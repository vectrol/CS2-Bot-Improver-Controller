const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 45000);

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
  ipcMain.handle("updates:controller", () => ({ current: "1.4.1", latest: null, hasUpdate: false, error: "offline" }));
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

  win.loadFile(path.join(__dirname, "..", "dist", "index.html")).then(() => {
    setTimeout(async () => {
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
              noOverlay: !document.querySelector(".overlay"),
            };
          })()
        `);
        console.log("UI-CHECK:", JSON.stringify(result));
        const pass =
          result.hasController && result.children > 0 && result.title.includes("CS2") && result.noOverlay;
        console.log(pass ? "UI SMOKE PASSED" : "UI SMOKE FAILED");
        if (errors.length) console.log("CONSOLE ERRORS:", JSON.stringify(errors));
        app.exit(pass ? 0 : 1);
      } catch (e) {
        console.log("UI-CHECK EXCEPTION:", e.message);
        app.exit(1);
      }
    }, 4000);
  });
});
