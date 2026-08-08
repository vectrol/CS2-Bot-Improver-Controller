const c = require("../out/main/controls.js");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const csgo = "C:\\Users\\Me\\AppData\\Local\\Temp\\opencode\\fakecsgo";

// ---- reset fixture to pristine state ----
if (fs.existsSync(csgo)) {
  fs.rmSync(csgo, { recursive: true, force: true });
}
const dirs = [
  "backup/Online",
  "backup/WithBots",
  "overrides/Low",
  "overrides/Medium",
  "overrides/High",
  "addons/counterstrikesharp/configs",
  "addons/counterstrikesharp/plugins",
  "addons/BotHider",
  "cfg",
];
for (const d of dirs) fs.mkdirSync(path.join(csgo, d), { recursive: true });
fs.writeFileSync(path.join(csgo, "gameinfo.gi"), "test");
fs.writeFileSync(path.join(csgo, "backup", "Online", "gameinfo.gi"), "ONLINE-NO-METAMOD-NO-BOTPROFILE");
fs.writeFileSync(path.join(csgo, "backup", "WithBots", "gameinfo.gi"), "WITHBOTS with csgo/addons/metamod and csgo/overrides/botprofile.vpk");
fs.writeFileSync(path.join(csgo, "overrides", "Medium", "botprofile.vpk"), "MEDIUM-SIZE-VPK-XX");
fs.writeFileSync(path.join(csgo, "overrides", "Low", "botprofile.vpk"), "LOW");
fs.writeFileSync(path.join(csgo, "overrides", "High", "botprofile.vpk"), "HIGH-BIGGER-VPK");
fs.writeFileSync(path.join(csgo, "addons", "counterstrikesharp", "configs", "core.json"), '{"FollowCS2ServerGuidelines": false}');
fs.mkdirSync(path.join(csgo, "addons", "counterstrikesharp", "plugins", "BotRandomizer"), { recursive: true });
const pkg = "C:\\Users\\Me\\AppData\\Local\\Temp\\opencode\\pkgextract\\cfg";
fs.copyFileSync(path.join(pkg, "my_bot_normal_config.cfg"), path.join(csgo, "cfg", "my_bot_normal_config.cfg"));
fs.copyFileSync(path.join(pkg, "my_bot_ffa_config.cfg"), path.join(csgo, "cfg", "my_bot_ffa_config.cfg"));

let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) fails++;
};

// mode
let m = c.getMode(csgo);
ok("getMode initial bots=false", m.current === "online");
c.setMode(csgo, "bots");
ok("setMode bots -> gameinfo contains WithBots", fs.readFileSync(path.join(csgo, "gameinfo.gi"), "utf-8").includes("metamod"));
m = c.getMode(csgo);
ok("getMode current=bots", m.current === "bots");
c.setMode(csgo, "online");
ok("setMode online -> gameinfo is ONLINE", fs.readFileSync(path.join(csgo, "gameinfo.gi"), "utf-8").trim() === "ONLINE-NO-METAMOD-NO-BOTPROFILE");

// difficulty
let d = c.getDifficulty(csgo);
ok("difficulty initial none", d.current === null && d.activePresent === false);
c.setDifficulty(csgo, "Medium");
d = c.getDifficulty(csgo);
ok("difficulty Medium detected", d.current === "Medium");
c.setDifficulty(csgo, "Low");
d = c.getDifficulty(csgo);
ok("difficulty Low detected", d.current === "Low");

// bot items
let b = c.getBotItems(csgo);
ok("botItems skins on", b.skins === true && b.profiles === true);
c.setBotItem(csgo, "skins", false);
b = c.getBotItems(csgo);
ok("skins off -> folder renamed", b.skins === false);
const core = JSON.parse(fs.readFileSync(path.join(csgo, "addons", "counterstrikesharp", "configs", "core.json"), "utf-8"));
ok("core.json FollowCS2ServerGuidelines=true", core.FollowCS2ServerGuidelines === true);
c.setBotItem(csgo, "skins", true);
b = c.getBotItems(csgo);
ok("skins back on", b.skins === true);
c.setBotItem(csgo, "profiles", false);
b = c.getBotItems(csgo);
ok("profiles off", b.profiles === false && fs.existsSync(path.join(csgo, "addons", "BotHider_disabled")));
c.setBotItem(csgo, "profiles", true);
b = c.getBotItems(csgo);
ok("profiles back on", b.profiles === true);

// presets
let p = c.getPresets(csgo);
ok("presets initial null", p.aim === null && p.nades === null);
c.setAim(csgo, "head");
c.setNades(csgo, "max");
p = c.getPresets(csgo);
ok("aim=head nades=max", p.aim === "head" && p.nades === "max");
const normalCfg = fs.readFileSync(path.join(csgo, "cfg", "my_bot_normal_config.cfg"), "utf-8");
ok("cfg contains bot_aim head", /^bot_aim head$/m.test(normalCfg));
ok("cfg contains bot_nades max", /^bot_nades max$/m.test(normalCfg));

// knives
let k = c.getDropKnives(csgo);
ok("knives parsed bind \\ + 20 subs", k.bindKey === "\\" && k.selected.length === 20);
c.setDropKnives(csgo, "k", [500, 507]);
k = c.getDropKnives(csgo);
ok("knives custom bind k", k.bindKey === "k" && k.selected.length === 2 && k.selected[0] === 500 && k.selected[1] === 507);
const cfg2 = fs.readFileSync(path.join(csgo, "cfg", "my_bot_ffa_config.cfg"), "utf-8");
ok("ffa cfg bind updated", /^bind k "subclass_create 500;subclass_create 507"$/m.test(cfg2));

// validate
const v = c.validateFiles(csgo);
ok("validate reports missing", v.ok === false && v.missing.length > 0);

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
