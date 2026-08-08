import { app, net } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLUGIN_VERSION } from "../shared/types";

export type UpdateInfo = {
  current: string;
  latest: string | null;
  name: string | null;
  url: string | null;
  publishedAt: string | null;
  hasUpdate: boolean;
  checkedAt: number;
  error?: string;
};

const PLUGIN_REPO = "ed0ard/CS2-Bot-Improver";
const CACHE_TTL_MS = 10 * 60 * 1000;

let pluginCache: UpdateInfo | null = null;
let controllerCache: UpdateInfo | null = null;

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x.replace(/\D/g, ""), 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x.replace(/\D/g, ""), 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/** Own repository, derived from package.json `repository.url`. */
export function controllerRepo(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(app.getAppPath(), "package.json"), "utf-8")
    ) as { repository?: { url?: string } };
    const url = pkg.repository?.url ?? "";
    const m = url.match(/(?:github\.com[/:])([\w.-]+\/[\w.-]+?)(?:\.git)?$/i);
    if (m) return m[1];
  } catch {
    /* ignore */
  }
  return "vectrol/CS2-Bot-Improver-Controller";
}

async function fetchLatestRelease(repo: string): Promise<{
  tag: string;
  name: string;
  url: string;
  publishedAt: string;
}> {
  const res = await net.fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { "User-Agent": "CBIC", Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    tag_name?: string;
    name?: string;
    html_url?: string;
    published_at?: string;
  };
  return {
    tag: data.tag_name ?? "",
    name: data.name ?? "",
    url: data.html_url ?? "",
    publishedAt: data.published_at ?? "",
  };
}

function fresh(cache: UpdateInfo | null, force: boolean): boolean {
  return !force && cache !== null && Date.now() - cache.checkedAt < CACHE_TTL_MS;
}

export function getCachedPluginUpdate(): UpdateInfo | null {
  return pluginCache;
}

export function getCachedControllerUpdate(): UpdateInfo | null {
  return controllerCache;
}

/** Check upstream CS2-Bot-Improver (bundled plugin package) releases. */
export async function checkPluginUpdate(force = false): Promise<UpdateInfo> {
  const current = PLUGIN_VERSION;
  const info: UpdateInfo = {
    current,
    latest: null,
    name: null,
    url: null,
    publishedAt: null,
    hasUpdate: false,
    checkedAt: Date.now(),
  };
  if (fresh(pluginCache, force)) return pluginCache!;
  try {
    const rel = await fetchLatestRelease(PLUGIN_REPO);
    const latest = rel.tag.replace(/^v/i, "");
    info.latest = latest || null;
    info.name = rel.name || null;
    info.url = rel.url || null;
    info.publishedAt = rel.publishedAt || null;
    info.hasUpdate = !!latest && compareVersions(latest, current) > 0;
  } catch (e) {
    info.error = e instanceof Error ? e.message : String(e);
  }
  pluginCache = info;
  return info;
}

/** Check this controller's own releases on GitHub. */
export async function checkControllerUpdate(force = false): Promise<UpdateInfo> {
  const current = app.getVersion();
  const info: UpdateInfo = {
    current,
    latest: null,
    name: null,
    url: null,
    publishedAt: null,
    hasUpdate: false,
    checkedAt: Date.now(),
  };
  if (fresh(controllerCache, force)) return controllerCache!;
  try {
    const rel = await fetchLatestRelease(controllerRepo());
    const latest = rel.tag.replace(/^v/i, "");
    info.latest = latest || null;
    info.name = rel.name || null;
    info.url = rel.url || null;
    info.publishedAt = rel.publishedAt || null;
    info.hasUpdate = !!latest && compareVersions(latest, current) > 0;
  } catch (e) {
    info.error = e instanceof Error ? e.message : String(e);
  }
  controllerCache = info;
  return info;
}
