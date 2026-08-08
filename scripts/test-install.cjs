const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

setTimeout(() => {
  console.log("TIMEOUT — forcing exit");
  app.exit(2);
}, 90000);

app.whenReady().then(async () => {
  const install = require(path.join(__dirname, "..", "out", "main", "install.js"));
  const csgo = "C:\\Users\\Me\\AppData\\Local\\Temp\\opencode\\fakecsgo";
  if (fs.existsSync(csgo)) fs.rmSync(csgo, { recursive: true, force: true });
  fs.mkdirSync(csgo, { recursive: true });

  let last = 0;
  const result = await install.installPackage(csgo, (ev) => {
    console.log(`[ev] ${ev.phase} ${ev.current}/${ev.total} ${ev.file}`);
    last = ev.current;
  });
  console.log("RESULT:", JSON.stringify(result));

  const checks = [
    ["gameinfo.gi", () => fs.existsSync(path.join(csgo, "gameinfo.gi"))],
    ["addons/metamod.vdf", () => fs.existsSync(path.join(csgo, "addons", "metamod.vdf"))],
    ["cssharp dll", () => fs.existsSync(path.join(csgo, "addons", "counterstrikesharp", "bin", "win64", "counterstrikesharp.dll"))],
    ["plugin BotRandomizer", () => fs.existsSync(path.join(csgo, "addons", "counterstrikesharp", "plugins", "BotRandomizer", "BotRandomizer.dll"))],
    ["backup WithBots", () => fs.existsSync(path.join(csgo, "backup", "WithBots", "gameinfo.gi"))],
    ["overrides Medium vpk", () => fs.existsSync(path.join(csgo, "overrides", "Medium", "botprofile.vpk"))],
    ["overrides active vpk", () => fs.existsSync(path.join(csgo, "overrides", "botprofile.vpk"))],
    ["cfg normal", () => fs.existsSync(path.join(csgo, "cfg", "my_bot_normal_config.cfg"))],
    ["Commands.txt", () => fs.existsSync(path.join(csgo, "Commands.txt"))],
    ["NO Panel exe", () => !fs.existsSync(path.join(csgo, "Panel v1.4.3.exe"))],
  ];
  let fails = 0;
  for (const [name, fn] of checks) {
    const pass = fn();
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) fails++;
  }
  const cnt = result.filesWritten > 500 ? "PASS" : "FAIL";
  console.log(`${cnt}  filesWritten=${result.filesWritten} (expected >500)`);
  if (cnt === "FAIL") fails++;
  // ---- uninstall test (mirrors the IPC flow: restore online gameinfo first) ----
  const controls = require(path.join(__dirname, "..", "out", "main", "controls.js"));
  controls.setMode(csgo, "online");
  const uninst = await install.uninstallPackage(csgo);
  console.log("UNINSTALL:", JSON.stringify(uninst));
  const unChecks = [
    ["gameinfo.gi kept & vanilla", () => {
      try {
        const t = fs.readFileSync(path.join(csgo, "gameinfo.gi"), "utf-8");
        return !t.includes("metamod");
      } catch {
        return false;
      }
    }],
    ["addons removed", () => !fs.existsSync(path.join(csgo, "addons"))],
    ["cfg removed", () => !fs.existsSync(path.join(csgo, "cfg"))],
    ["overrides removed", () => !fs.existsSync(path.join(csgo, "overrides"))],
    ["backup removed", () => !fs.existsSync(path.join(csgo, "backup"))],
    ["Commands.txt removed", () => !fs.existsSync(path.join(csgo, "Commands.txt"))],
  ];
  for (const [name, fn] of unChecks) {
    const pass = fn();
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) fails++;
  }
  if (!uninst.ok) fails++;

  console.log(fails === 0 ? "ALL INSTALL TESTS PASSED" : `${fails} FAILED`);
  app.exit(fails === 0 ? 0 : 1);
});
