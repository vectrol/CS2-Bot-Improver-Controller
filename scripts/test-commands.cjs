const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 45000);

app.whenReady().then(() => {
  ipcMain.handle("commands:load", () => {
    const commands = require(path.join(__dirname, "..", "out", "main", "commands.js"));
    return commands.loadCommandBlocks();
  });
  const config = require(path.join(__dirname, "..", "out", "main", "config.js"));
  ipcMain.handle("config:get", () => config.getConfig());
  ipcMain.handle("config:save", (_e, p) => config.saveConfig(p));
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

  const win = new BrowserWindow({
    width: 880,
    height: 660,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "out", "main", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html")).then(() => {
    setTimeout(async () => {
      try {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
            await sleep(1500);
            const btns = [...document.querySelectorAll("button.win-btn")];
            btns[0].click();
            await sleep(1200);
            const text = document.getElementById("root").textContent;
            return {
              hasSearch: !!document.querySelector(".search input"),
              hasChips: !!document.querySelector(".chip-row"),
              chipCount: document.querySelectorAll(".chip-row .chip").length,
              hasTeam: text.includes("Team Vitality") || text.includes("Vitality"),
              hasDesc: text.includes("Flying") || text.includes("飞碟") || text.includes("瞄准"),
              hasCopy: !!document.querySelector(".cmd-block__copy"),
              hasSide: !!document.querySelector(".cmd-side"),
              textHead: text.slice(0, 200),
            };
          })()
        `);
        console.log("CMDS-CHECK:", JSON.stringify(result));
        const pass =
          result.hasSearch &&
          result.hasChips &&
          result.chipCount >= 6 &&
          result.hasTeam &&
          result.hasDesc &&
          result.hasCopy &&
          result.hasSide;
        console.log(pass ? "COMMANDS PAGE PASSED" : "COMMANDS PAGE FAILED");
        app.exit(pass ? 0 : 1);
      } catch (e) {
        console.log("CMDS EXCEPTION:", e.message);
        app.exit(1);
      }
    }, 500);
  });
});
