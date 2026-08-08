const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 60000);

app.whenReady().then(async () => {
  const controls = require(path.join(__dirname, "..", "out", "main", "controls.js"));
  const install = require(path.join(__dirname, "..", "out", "main", "install.js"));

  // Build a realistic dir: extract the real bundle (same as a real install).
  const csgo = "C:\\Users\\Me\\AppData\\Local\\Temp\\opencode\\perfcsgo";
  if (fs.existsSync(csgo)) fs.rmSync(csgo, { recursive: true, force: true });
  fs.mkdirSync(csgo, { recursive: true });
  await install.installPackage(csgo, () => {});

  const N = 8;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    controls.validateFiles(csgo);
    await install.driftFiles(csgo);
    controls.getDifficulty(csgo);
    controls.getMode(csgo);
    controls.getBotItems(csgo);
    controls.getPresets(csgo);
    controls.getDropKnives(csgo);
    controls.isCs2Running();
  }
  const avg = (Date.now() - t0) / N;
  console.log(`PERF: full poll pipeline avg = ${avg.toFixed(1)} ms (${N} rounds, real bundle)`);

  const f = controls.validateFiles(csgo);
  const d = controls.getDifficulty(csgo);
  console.log(`SANITY: files ok=${f.ok} present=${f.present}/${f.total}, drift=${(await install.driftFiles(csgo)).length}`);
  console.log(`SANITY: difficulty current=${d.current} available=[${d.available}]`);

  const pass = f.ok && d.current === "Medium" && avg < 500;
  console.log(pass ? "PERF TEST PASSED" : "PERF TEST FAILED");
  app.exit(pass ? 0 : 1);
});
