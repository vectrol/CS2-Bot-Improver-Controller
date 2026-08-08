import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

// ---- integrity manifest (sha256 of the bundled package) ----
const zipPath = join(resources, "CS2BotImprover.zip");
if (existsSync(zipPath)) {
  const data = readFileSync(zipPath);
  const sha256 = createHash("sha256").update(data).digest("hex");
  const manifest = {
    pluginVersion: "1.4.3",
    sha256,
    size: statSync(zipPath).size,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(resources, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[prepare] manifest sha256=${sha256.slice(0, 16)}...`);
} else {
  console.error("[prepare] MISSING bundled zip for manifest");
  process.exit(1);
}
console.log("[prepare] done");
