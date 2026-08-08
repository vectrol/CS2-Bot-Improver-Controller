import { app } from "electron";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  rmdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import yauzl from "yauzl";
import type { InstallEvent, InstallResult, UninstallResult } from "../shared/types";

const EXCLUDED = /^Panel v[\d.]+\.exe$/i;

export type BundleManifest = {
  pluginVersion: string;
  sha256: string;
  size: number;
  generatedAt?: string;
};

let verifyCache: { at: number; ok: boolean } | null = null;
const VERIFY_CACHE_MS = 5 * 60 * 1000;

export function manifestPath(): string {
  if (app.isPackaged) return join(process.resourcesPath, "plugin", "manifest.json");
  return join(__dirname, "..", "..", "resources", "manifest.json");
}

export function readManifest(): BundleManifest | null {
  try {
    return JSON.parse(readFileSync(manifestPath(), "utf-8")) as BundleManifest;
  } catch {
    return null;
  }
}

/** Verify the bundled package against the build-time sha256 manifest. */
export function verifyBundle(force = false): { ok: boolean; expected: string; actual: string } {
  const now = Date.now();
  if (!force && verifyCache && now - verifyCache.at < VERIFY_CACHE_MS) {
    return verifyCache.ok
      ? { ok: true, expected: "", actual: "" }
      : { ok: false, expected: "", actual: "" };
  }
  const manifest = readManifest();
  const zipPath = bundledZipPath();
  const expected = manifest?.sha256 ?? "";
  let actual = "";
  if (expected && existsSync(zipPath)) {
    const hash = createHash("sha256");
    hash.update(readFileSync(zipPath));
    actual = hash.digest("hex");
  }
  const ok = expected !== "" && actual === expected;
  verifyCache = { at: now, ok };
  return { ok, expected, actual };
}

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

let entriesCache: { path: string; mtimeMs: number; names: string[] } | null = null;

/** Cached zip listing — invalidated by file mtime (avoids re-reading the 67MB index on every poll). */
function cachedEntries(zipPath: string): Promise<string[]> {
  try {
    const st = statSync(zipPath);
    if (entriesCache && entriesCache.path === zipPath && entriesCache.mtimeMs === st.mtimeMs) {
      return Promise.resolve(entriesCache.names);
    }
    return entriesOf(zipPath).then((names) => {
      entriesCache = { path: zipPath, mtimeMs: st.mtimeMs, names };
      return names;
    });
  } catch {
    return Promise.resolve([]);
  }
}

/** Files in the bundled zip that are missing from the target dir (drift). */
export async function driftFiles(csgo: string): Promise<string[]> {
  const zipPath = bundledZipPath();
  if (!existsSync(zipPath)) return [];
  const names = await cachedEntries(zipPath);
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
  const integrity = verifyBundle(true);
  if (!integrity.ok) {
    return { ok: false, filesWritten: 0, message: "bundle corrupt" };
  }

  const names = await cachedEntries(zipPath);
  const files = names.filter(
    (n) => !/\/$/.test(n) && !EXCLUDED.test(n.split("/").pop() ?? n)
  );
  const total = files.length;
  if (total === 0) return { ok: false, filesWritten: 0, message: "empty package" };

  // Snapshot what already exists so a failed install can roll back cleanly.
  const preexisting = new Set(files.filter((n) => existsSync(join(csgo, n))));

  onProgress({ phase: "prepare", current: 0, total, file: "" });

  const rollback = () => {
    for (const n of files) {
      if (preexisting.has(n)) continue;
      try {
        rmSync(join(csgo, n), { force: true });
      } catch {
        /* ignore */
      }
    }
    pruneEmptyDirs(csgo);
  };

  try {
    const written = await extractAll(zipPath, csgo, files, onProgress);

    try {
      const commands = bundledCommandsPath();
      if (existsSync(commands)) {
        const text = readFileSync(commands, "utf-8");
        const target = join(csgo, "Commands.txt");
        const existing = existsSync(target) ? readFileSync(target, "utf-8") : "";
        if (existing !== text) {
          writeFileSync(target, text, "utf-8");
          written.filesWritten += 1;
        }
      }
    } catch {
      /* best-effort commands copy */
    }

    onProgress({ phase: "finalize", current: total, total, file: "" });
    onProgress({ phase: "done", current: total, total, file: "" });
    return { ok: true, filesWritten: written.filesWritten };
  } catch (e) {
    rollback();
    onProgress({ phase: "error", current: 0, total, file: "" });
    return {
      ok: false,
      filesWritten: 0,
      message: e instanceof Error ? `install failed (rolled back): ${e.message}` : "install failed (rolled back)",
    };
  }
}

function pruneEmptyDirs(csgo: string): void {
  const stack = [csgo];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    let entries: string[] = [];
    try {
      entries = readdirSync(cur);
    } catch {
      continue;
    }
    const subdirs = entries.filter((n) => {
      try {
        return statSync(join(cur, n)).isDirectory();
      } catch {
        return false;
      }
    });
    for (const d of subdirs) stack.push(join(cur, d));
    if (subdirs.length === entries.length && cur !== csgo) {
      try {
        rmdirSync(cur);
      } catch {
        /* busy */
      }
    }
  }
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
          .catch((err) => {
            // Fail fast so installPackage can roll back this run.
            reject(err instanceof Error ? err : new Error(String(err)));
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
  const names = existsSync(zipPath) ? await cachedEntries(zipPath) : [];
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
