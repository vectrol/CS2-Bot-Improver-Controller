import { createServer, type Server, type IncomingMessage } from "node:http";
import { BrowserWindow } from "electron";
import type { GsiState } from "../shared/types";

export const GSI_PORT = 8123;

let server: Server | null = null;
let latest: GsiState | null = null;
let lastEmit = 0;
let lastTick = 0;

export function gsiStatus(): { running: boolean; port: number; lastUpdate: number } {
  return { running: !!server?.listening, port: GSI_PORT, lastUpdate: lastTick };
}

export function getGsiState(): GsiState | null {
  return latest;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString("utf-8");
      if (data.length > 4 * 1024 * 1024) {
        reject(new Error("payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export async function startGsiServer(onState: (s: GsiState) => void): Promise<void> {
  if (server) return;
  server = createServer(async (req, res) => {
    if (req.method === "POST" && (req.url === "/" || req.url === "")) {
      try {
        const body = await readBody(req);
        const state = JSON.parse(body) as GsiState;
        if (state && typeof state === "object") {
          latest = state;
          lastTick = Date.now();
          // Throttle broadcasts to ~5 Hz regardless of game's throttle setting.
          const now = Date.now();
          if (now - lastEmit >= 200) {
            lastEmit = now;
            onState(state);
          }
        }
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
      } catch {
        res.writeHead(400);
        res.end("bad request");
        return;
      }
    }
    res.writeHead(404);
    res.end("not found");
  });
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(GSI_PORT, "127.0.0.1", () => resolve());
  });
  server.on("error", () => {
    /* port conflict — leave server down */
  });
}

export function stopGsiServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}

export function broadcastGsiState(windows: BrowserWindow[]): void {
  if (!latest) return;
  for (const w of windows) {
    if (w && !w.isDestroyed()) {
      w.webContents.send("gsi:state", latest);
    }
  }
}
