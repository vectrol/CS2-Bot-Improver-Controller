import { app } from "electron";
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, readdirSync, rmdirSync } from "node:fs";
import { dirname, join } from "node:path";
import yauzl from "yauzl";
import type { InstallEvent, InstallResult, UninstallResult } from "../shared/types";

const EXCLUDED = /^Panel v[\d.]+\.exe$/i;

export function bundledZipPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "plugin", "CS2BotImprover.zip");
  }
  return join(__dirname, "..", "..", "resources", "CS2BotImprover.zip");
}

export function bundledCommandsPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "plugin", "Commands.txt");
  }
  return join(__dirname, "..", "..", "resources", "Commands.txt");
}

export function packageAvailable(): boolean {
  return existsSync(bundledZipPath());
}

function entriesOf(zipPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error("zip open failed"));
      const names: string[] = [];
      zip.readEntry();
      zip.on("entry", (entry) => {
        names.push(entry.fileName);
        zip.readEntry();
      });
      zip.on("end", () => resolve(names));
      zip.on("error", reject);
    });
  });
}

/** Files in the bundled zip that are missing from the target dir (drift). */
export async function driftFiles(csgo: string): Promise<string[]> {
  const zipPath = bundledZipPath();
  if (!existsSync(zipPath)) return [];
  const names = await entriesOf(zipPath).catch(() => [] as string[]);
  const missing: string[] = [];
  for (const n of names) {
    if (/\/$/.test(n) || EXCLUDED.test(n.split("/").pop() ?? n)) continue;
    if (!existsSync(join(csgo, n))) missing.push(n);
  }
  return missing;
}

function extractEntry(
  zip: yauzl.ZipFile,
  entry: yauzl.Entry,
  csgo: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = join(csgo, entry.fileName);
    if (/\/$/.test(entry.fileName)) {
      mkdirSync(target, { recursive: true });
      return resolve();
    }
    mkdirSync(dirname(target), { recursive: true });    zip.openReadStream(entry, (err, stream) => {
      if (err || !stream) return reject(err ?? new Error("openReadStream failed"));
      const out = createWriteStream(target);
      stream.pipe(out);
      stream.on("end", () => out.close());
      out.on("close", () => resolve());
      out.on("error", reject);
      stream.on("error", reject);
    });
  });
}

export async function installPackage(
  csgo: string,
  onProgress: (ev: InstallEvent) => void
): Promise<InstallResult> {
  const zipPath = bundledZipPath();
  if (!existsSync(zipPath)) {
    return { ok: false, filesWritten: 0, message: "bundled package missing" };
  }

  const names = await entriesOf(zipPath).catch(() => [] as string[]);
  const files = names.filter(
    (n) => !/\/$/.test(n) && !EXCLUDED.test(n.split("/").pop() ?? n)
  );
  const total = files.length;
  if (total === 0) return { ok: false, filesWritten: 0, message: "empty package" };

  onProgress({ phase: "prepare", current: 0, total, file: "" });

  const written = await extractAll(zipPath, csgo, files, onProgress);

  try {
    const commands = bundledCommandsPath();
    if (existsSync(commands)) {
      const text = readFileSync(commands, "utf-8");
      const target = join(csgo, "Commands.txt");
      const existing = existsSync(target) ? readFileSync(target, "utf-8") : "";
      if (existing !== text) {
        const fs = await import("node:fs");
        fs.writeFileSync(target, text, "utf-8");
        written.filesWritten += 1;
      }
    }
  } catch {
    /* best-effort commands copy */
  }

  onProgress({ phase: "finalize", current: total, total, file: "" });
  onProgress({ phase: "done", current: total, total, file: "" });
  return { ok: true, filesWritten: written.filesWritten };
}

function extractAll(
  zipPath: string,
  csgo: string,
  files: string[],
  onProgress: (ev: InstallEvent) => void
): Promise<{ filesWritten: number }> {
  const total = files.length;
  const byName = new Set(files);
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error("zip open failed"));
      let written = 0;
      let failures = 0;
      zip.readEntry();
      const next = () => {
        try {
          zip.readEntry();
        } catch (e) {
          reject(e);
        }
      };
      zip.on("entry", (entry) => {
        if (!byName.has(entry.fileName)) return next();
        extractEntry(zip, entry, csgo)
          .then(() => {
            written += 1;
            onProgress({ phase: "extract", current: written, total, file: entry.fileName });
            next();
          })
          .catch(() => {
            failures += 1;
            written += 1;
            next();
          });
      });
      zip.on("end", () => resolve({ filesWritten: written }));
      zip.on("error", reject);
    });
  });
}

/** Remove every file the bundle installed (restores the game to a clean state). */
export async function uninstallPackage(csgo: string): Promise<UninstallResult> {
  const zipPath = bundledZipPath();
  const names = existsSync(zipPath)
    ? await entriesOf(zipPath).catch(() => [] as string[])
    : [];
  const installed = names.filter((n) => !/\/$/.test(n) && !EXCLUDED.test(n.split("/").pop() ?? n));

  let removed = 0;
  const failed: string[] = [];
  const rm = (p: string) => {
    try {
      if (existsSync(p)) {
        rmSync(p, { force: true });
        removed += 1;
      }
    } catch {
      failed.push(p);
    }
  };

  for (const rel of installed) {
    // gameinfo.gi was restored to the vanilla variant by the caller (setMode
    // "online") — keep it so the game still boots after uninstall.
    if (rel === "gameinfo.gi") continue;
    rm(join(csgo, rel));
  }
  rm(join(csgo, "Commands.txt"));

  // Prune now-empty directories left behind (only inside known bundle roots).
  for (const rel of [...new Set(installed.map((n) => n.split("/").slice(0, -1).join("/")))]) {
    if (!rel) continue;
    let cur = join(csgo, rel);
    while (cur !== csgo) {
      try {
        if (!existsSync(cur)) break;
        const children = readdirSync(cur);
        if (children.length === 0) rmdirSync(cur);
        else break;
      } catch {
        break;
      }
      cur = join(cur, "..");
    }
  }

  if (failed.length > 0) {
    return { ok: false, removed, message: failed.slice(0, 5).join(", ") };
  }
  return { ok: true, removed };
}
