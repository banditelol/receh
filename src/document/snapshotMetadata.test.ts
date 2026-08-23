import { describe, expect, it } from "vite-plus/test";
import { createPortableShaderDocument } from "./shaderDocument.ts";
import {
  createSnapshotPreview,
  MAX_SNAPSHOT_NAME_LENGTH,
  normalizeSnapshotName,
} from "./snapshotMetadata.ts";

describe("snapshot metadata", () => {
  it("normalizes optional names and enforces the portable limit", () => {
    expect(normalizeSnapshotName("  First bloom  ")).toBe("First bloom");
    expect(normalizeSnapshotName("   ")).toBeNull();
    expect(() => normalizeSnapshotName("x".repeat(MAX_SNAPSHOT_NAME_LENGTH + 1))).toThrow(
      `${MAX_SNAPSHOT_NAME_LENGTH} characters`,
    );
  });

  it("summarizes the active pass without storing a second document copy", () => {
    const document = createPortableShaderDocument("\n// café 🌊\nvoid main() {}", "Blue hour");

    expect(createSnapshotPreview(document)).toEqual({
      title: "Blue hour",
      passName: "main.frag",
      passCount: 1,
      lineCount: 3,
      sourceBytes: new TextEncoder().encode("\n// café 🌊\nvoid main() {}").byteLength,
      sourcePreview: "// café 🌊",
    });
  });
});
