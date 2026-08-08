const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 45000);

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 880,
    height: 660,
    show: false,
    frame: false,
    backgroundColor: "#0c1016",
    webPreferences: {
      preload: path.join(__dirname, "..", "out", "main", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html")).then(() => {
    setTimeout(async () => {
      win.show();
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(
          path.join(__dirname, "..", "build", "ui-home.png"),
          img.toPNG()
        );
        console.log("screenshot saved: build/ui-home.png");
      } catch (e) {
        console.log("capture failed:", e.message);
      }
      app.exit(0);
    }, 600);
  });
});
