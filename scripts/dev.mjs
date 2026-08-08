import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "vite";

console.log("[dev] compiling main process (tsc)...");
try {
  execSync("npx tsc -p tsconfig.main.json", { stdio: "inherit" });
} catch {
  process.exit(1);
}

const vite = await createServer({ configFile: "vite.config.ts" });
await vite.listen();
const url = vite.resolvedUrls?.local[0];
console.log(`[dev] renderer at ${url}`);

const electronBin = existsSync("node_modules/electron/dist/electron.exe")
  ? "node_modules/electron/dist/electron.exe"
  : null;

let child;
if (electronBin) {
  child = spawn(electronBin, ["."], {
    env: { ...process.env, VITE_DEV_SERVER_URL: url },
    stdio: "inherit",
  });
  child.on("close", () => {
    vite.close();
    process.exit(0);
  });
} else {
  console.error("[dev] electron binary missing — run `npm install` first");
  process.exit(1);
}

process.on("SIGINT", () => {
  vite.close();
  child.kill();
  process.exit(0);
});
