export const ACCENT_PRESETS: { name: string; zh: string; en: string; value: string }[] = [
  { name: "Orange", zh: "经典橙", en: "Classic orange", value: "#f2a33c" },
  { name: "Blue", zh: "天际蓝", en: "Sky blue", value: "#4f9dff" },
  { name: "Violet", zh: "紫罗兰", en: "Violet", value: "#9b6bff" },
  { name: "Green", zh: "翠绿", en: "Emerald", value: "#2fd68b" },
  { name: "Pink", zh: "樱花粉", en: "Sakura", value: "#ff6b9d" },
  { name: "Red", zh: "烈焰红", en: "Flame red", value: "#f0525e" },
];

export function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(color);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mix(hex: string, target: number, ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (v: number) =>
    Math.round(v + (target - v) * ratio)
      .toString(16)
      .padStart(2, "0");
  return `#${m(r)}${m(g)}${m(b)}`;
}

export function applyTheme(accent: string, compact: boolean): void {
  const root = document.documentElement;
  const color = isValidHex(accent) ? accent : "#f2a33c";
  const [r, g, b] = hexToRgb(color);
  root.style.setProperty("--accent", color);
  root.style.setProperty("--accent-strong", mix(color, 255, 0.18));
  root.style.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, 0.28)`);
  document.body.classList.toggle("compact", compact);
}
