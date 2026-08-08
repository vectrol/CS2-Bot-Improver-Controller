import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resources = join(root, "resources");

const sources = [
  {
    from: process.env.CSBIP_ZIP ||
      join(process.env.USERPROFILE, "AppData", "Local", "Temp", "opencode", "CS2BotImprover.zip"),
    to: join(resources, "CS2BotImprover.zip"),
    required: true,
  },
  {
    from: join(root, "..", "CS2-Bot-Improver", "Commands.txt"),
    to: join(resources, "Commands.txt"),
    required: false,
  },
];

mkdirSync(resources, { recursive: true });

for (const s of sources) {
  if (existsSync(s.from)) {
    copyFileSync(s.from, s.to);
    console.log(`[prepare] ${s.from} -> ${s.to}`);
  } else if (s.required) {
    console.error(`[prepare] MISSING required file: ${s.from}`);
    process.exit(1);
  } else {
    console.warn(`[prepare] not found (optional): ${s.from}`);
  }
}
console.log("[prepare] done");
