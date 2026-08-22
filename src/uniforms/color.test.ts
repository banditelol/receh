import { describe, expect, it } from "vite-plus/test";
import { formatHexColor, hslToRgb, parseHexColor, rgbToHsl } from "./color.ts";

describe("uniform color conversions", () => {
  it("round-trips RGB through HSL", () => {
    const original = [0.2, 0.6, 0.9, 0.4];
    const roundTrip = hslToRgb(rgbToHsl(original));
    roundTrip.forEach((channel, index) => expect(channel).toBeCloseTo(original[index]));
  });

  it("parses shorthand and alpha hex colors", () => {
    expect(parseHexColor("#F80")).toEqual([1, 136 / 255, 0, 1]);
    expect(parseHexColor("33669980")).toEqual([0.2, 0.4, 0.6, 128 / 255]);
    expect(parseHexColor("nope")).toBeNull();
  });

  it("formats RGB and RGBA values", () => {
    expect(formatHexColor([1, 0.5, 0])).toBe("#FF8000");
    expect(formatHexColor([1, 0.5, 0, 0.25], true)).toBe("#FF800040");
  });
});
