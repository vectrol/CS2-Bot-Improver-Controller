const { app } = require("electron");
const path = require("node:path");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 45000);

app.whenReady().then(async () => {
  const log = require(path.join(__dirname, "..", "out", "main", "log.js"));
  let fails = 0;

  log.clearLog();
  const empty = log.getLog();
  console.log(`PASS  log starts empty (${empty.length})`);

  log.logAction("install", "ok, 650 files");
  log.logAction("mode", "bots");
  log.logAction("difficulty", "High");
  const entries = log.getLog();
  const ok =
    entries.length === 3 &&
    entries[0].action === "install" &&
    entries[0].detail === "ok, 650 files" &&
    entries[1].action === "mode" &&
    entries[2].action === "difficulty" &&
    typeof entries[0].time === "number" &&
    entries[0].time <= Date.now();
  console.log(`${ok ? "PASS" : "FAIL"}  log entries recorded in order`);
  if (!ok) fails++;

  for (let i = 0; i < 120; i++) log.logAction("mode", "bots");
  const capped = log.getLog();
  const capOk = capped.length === 100;
  console.log(`${capOk ? "PASS" : "FAIL"}  log capped at 100 (got ${capped.length})`);
  if (!capOk) fails++;

  log.clearLog();
  const cleared = log.getLog();
  console.log(`${cleared.length === 0 ? "PASS" : "FAIL"}  log cleared`);
  if (cleared.length !== 0) fails++;

  console.log(fails === 0 ? "ALL LOG TESTS PASSED" : `${fails} FAILED`);
  app.exit(fails === 0 ? 0 : 1);
});
