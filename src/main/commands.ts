import { existsSync, readFileSync } from "node:fs";
import { bundledCommandsPath } from "./install";
import type { CommandBlock } from "../shared/types";

export function loadCommandBlocks(): CommandBlock[] {
  const file = bundledCommandsPath();
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf-8");
  const blocks: CommandBlock[] = [];
  let section = "General";
  let title = "";
  let commands: string[] = [];

  const flush = () => {
    if (commands.length > 0) blocks.push({ section, title, commands: [...commands] });
    commands = [];
    title = "";
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    if (/^[A-Z][A-Z0-9 &/()-]{2,}$/.test(line)) {
      flush();
      section = line;
      continue;
    }
    if (/^\d+\..+/.test(line) && !line.includes(";")) {
      flush();
      title = line;
      continue;
    }
    commands.push(line);
  }
  flush();
  return blocks;
}
