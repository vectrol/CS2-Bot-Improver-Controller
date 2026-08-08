import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const size = 256;

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- draw: dark rounded square + orange gradient crosshair ----
const px = Buffer.alloc(size * size * 4);
const inRound = (x, y, r, w, h, rad) => {
  const cx = Math.min(Math.max(x, rad), w - rad);
  const cy = Math.min(Math.max(y, rad), h - rad);
  return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
};

const o = { r: 242, g: 163, b: 60 };
const o2 = { r: 255, g: 180, b: 84 };

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const isBg = inRound(x + 0.5, y + 0.5, 4, size, size, 52);
    if (!isBg) {
      px[i + 3] = 0;
      continue;
    }
    const t = (x + y) / (2 * size);
    const r = Math.round(o.r + (o2.r - o.r) * t);
    const g = Math.round(o.g + (o2.g - o.g) * t);
    const b = Math.round(o.b + (o2.b - o.b) * t);
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  }
}

// crosshair: dark cross + ring
const dark = [20, 16, 10];
const cx = size / 2;
const crossW = 30;
const crossH = 116;
const ringR = 52;
const ringW = 14;
const inRing = (x, y) => {
  const d = Math.hypot(x - cx, y - cx);
  return d >= ringR - ringW / 2 && d <= ringR + ringW / 2;
};
const inCross = (x, y) =>
  (Math.abs(x - cx) <= crossW / 2 && Math.abs(y - cx) <= crossH / 2) ||
  (Math.abs(y - cx) <= crossW / 2 && Math.abs(x - cx) <= crossH / 2);

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    if (px[i + 3] === 0) continue;
    if (inCross(x, y) || inRing(x, y)) {
      px[i] = dark[0];
      px[i + 1] = dark[1];
      px[i + 2] = dark[2];
    }
  }
}

const png = encodePng(size, size, px);

// ICO container (single 256 PNG)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0;
entry[1] = 0;
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);
const ico = Buffer.concat([header, entry, png]);

mkdirSync(join(root, "build"), { recursive: true });
writeFileSync(join(root, "build", "icon.ico"), ico);
writeFileSync(join(root, "build", "icon.png"), png);
console.log("icon.ico + icon.png written:", ico.length, "bytes");
