const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 45000);

const FIXTURE = {
  provider: { name: "Counter-Strike: Global Offensive", appid: 730, map: "de_mirage", steamid: "1", timestamp: 1 },
  map: { name: "de_mirage", mode: "casual", phase: "live", round: 5, team_ct: { score: 3 }, team_t: { score: 2 } },
  round: { phase: "live", round_number: 5, team_ct: { score: 3 }, team_t: { score: 2 } },
  phase_countdowns: { phase: "live", phase_ends_in: "47.3" },
  allplayers: {
    "1": {
      name: "BotA",
      team: "CT",
      state: { health: 100, armor: 100, money: 4800, round_kills: 2, round_killhs: 1 },
      match_stats: { kills: 12, assists: 3, deaths: 5, mvps: 2, score: 40 },
      weapons: { weapon_0: { name: "weapon_ak47", type: "Rifle" } },
    },
    "2": {
      name: "BotB",
      team: "T",
      state: { health: 0, armor: 0, money: 0, round_kills: 0 },
      match_stats: { kills: 8, assists: 1, deaths: 9, mvps: 0, score: 20 },
      weapons: { weapon_0: { name: "weapon_deagle", type: "Pistol" } },
    },
  },
};

app.whenReady().then(async () => {
  const gsi = require(path.join(__dirname, "..", "out", "main", "gsi.js"));
  const spectate = require(path.join(__dirname, "..", "out", "main", "spectate.js"));
  let fails = 0;

  let got = null;
  await gsi.startGsiServer((s) => (got = s));

  const ok = await new Promise((resolve) => {
    const req = http.request(
      { host: "127.0.0.1", port: 8123, path: "/", method: "POST" },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode === 200));
      }
    );
    req.on("error", () => resolve(false));
    req.write(JSON.stringify(FIXTURE));
    req.end();
  });

  const state = gsi.getGsiState();
  const checks = [
    ["POST accepted (200)", ok],
    ["state parsed (map=de_mirage)", state?.map?.name === "de_mirage"],
    ["round phase live", state?.round?.phase === "live"],
    ["scores parsed (3:2)", state?.round?.team_ct?.score === 3 && state?.round?.team_t?.score === 2],
    ["phase timer 47.3", state?.phase_countdowns?.phase_ends_in === "47.3"],
    ["players parsed (2)", Object.keys(state?.allplayers ?? {}).length === 2],
    ["player kills 12", state?.allplayers?.["1"]?.match_stats?.kills === 12],
    ["broadcast callback fired", got?.map?.name === "de_mirage"],
  ];
  for (const [name, pass] of checks) {
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) fails++;
  }

  const csgo = "C:\\Users\\Me\\AppData\\Local\\Temp\\opencode\\gsi-csgo";
  fs.mkdirSync(csgo, { recursive: true });
  spectate.writeSpectateFiles(csgo);
  const gsiCfg = fs.readFileSync(path.join(csgo, "cfg", "gamestate_integration_cbic.cfg"), "utf-8");
  const specCfg = fs.readFileSync(path.join(csgo, "cfg", "cbic_spectate.cfg"), "utf-8");
  const fileChecks = [
    ["gsi cfg written with port 8123", gsiCfg.includes("8123") && gsiCfg.includes("allplayers")],
    ["spectate cfg joins spec + auto director", specCfg.includes("jointeam 1") && specCfg.includes("spec_autodirector 1")],
  ];
  for (const [name, pass] of fileChecks) {
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) fails++;
  }

  gsi.stopGsiServer();
  console.log(fails === 0 ? "ALL GSI TESTS PASSED" : `${fails} FAILED`);
  app.exit(fails === 0 ? 0 : 1);
});
