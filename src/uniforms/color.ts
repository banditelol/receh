export type RgbaColor = [number, number, number, number];
export type HslaColor = [number, number, number, number];

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function parseHexColor(value: string): RgbaColor | null {
  const hex = value.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-f]+$/i.test(hex)) return null;
  const expanded =
    hex.length <= 4 ? Array.from(hex, (character) => `${character}${character}`).join("") : hex;
  const withAlpha = expanded.length === 6 ? `${expanded}ff` : expanded;
  return [
    Number.parseInt(withAlpha.slice(0, 2), 16) / 255,
    Number.parseInt(withAlpha.slice(2, 4), 16) / 255,
    Number.parseInt(withAlpha.slice(4, 6), 16) / 255,
    Number.parseInt(withAlpha.slice(6, 8), 16) / 255,
  ];
}

function channelToHex(value: number) {
  return Math.round(clamp(value, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

export function formatHexColor(color: readonly number[], includeAlpha = false) {
  const red = channelToHex(color[0] ?? 0);
  const green = channelToHex(color[1] ?? 0);
  const blue = channelToHex(color[2] ?? 0);
  const alpha = channelToHex(color[3] ?? 1);
  return `#${red}${green}${blue}${includeAlpha ? alpha : ""}`;
}

export function rgbToHsl(color: readonly number[]): HslaColor {
  const red = clamp(color[0] ?? 0, 0, 1);
  const green = clamp(color[1] ?? 0, 0, 1);
  const blue = clamp(color[2] ?? 0, 0, 1);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness, clamp(color[3] ?? 1, 0, 1)];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (max === green) hue = 60 * ((blue - red) / delta + 2);
  else hue = 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  return [hue, saturation, lightness, clamp(color[3] ?? 1, 0, 1)];
}

export function hslToRgb(color: readonly number[]): RgbaColor {
  const hue = (((color[0] ?? 0) % 360) + 360) % 360;
  const saturation = clamp(color[1] ?? 0, 0, 1);
  const lightness = clamp(color[2] ?? 0, 0, 1);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  let rgb: [number, number, number];
  if (section < 1) rgb = [chroma, x, 0];
  else if (section < 2) rgb = [x, chroma, 0];
  else if (section < 3) rgb = [0, chroma, x];
  else if (section < 4) rgb = [0, x, chroma];
  else if (section < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  const match = lightness - chroma / 2;
  return [rgb[0] + match, rgb[1] + match, rgb[2] + match, clamp(color[3] ?? 1, 0, 1)];
}
