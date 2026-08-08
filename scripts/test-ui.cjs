const { app, BrowserWindow } = require("electron");
const path = require("node:path");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 45000);

app.whenReady().then(() => {
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
            };
          })()
        `);
        console.log("UI-CHECK:", JSON.stringify(result));
        const pass =
          result.hasController && result.children > 0 && result.title.includes("CS2");
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
