import { describe, expect, it } from "vite-plus/test";
import { classifyStorageEstimate, formatStorageSize } from "./useStorageHealth.ts";

describe("browser storage health", () => {
  it("warns near quota and with little remaining space", () => {
    expect(classifyStorageEstimate(90, 100).pressure).toBe(true);
    expect(classifyStorageEstimate(10, 100).pressure).toBe(true);
    expect(classifyStorageEstimate(100, 1024 * 1024 * 1024).pressure).toBe(false);
  });

  it("formats storage quantities for the library", () => {
    expect(formatStorageSize(512 * 1024)).toBe("512 KB");
    expect(formatStorageSize(12.5 * 1024 * 1024)).toBe("12.5 MB");
    expect(formatStorageSize(2 * 1024 * 1024 * 1024)).toBe("2.0 GB");
  });
});
