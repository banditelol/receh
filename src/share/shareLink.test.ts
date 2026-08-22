import { describe, expect, it } from "vite-plus/test";
import {
  createShareUrl,
  decodeSharedSource,
  encodeSharedSource,
  MAX_SHARED_SOURCE_BYTES,
  removeShareCodeFromUrl,
} from "./shareLink.ts";

describe("share links", () => {
  it("round-trips unicode shader source through a URL-safe payload", async () => {
    const source = "// receh 🌊\nvoid main() { /* café */ }";
    const payload = await encodeSharedSource(source);

    expect(payload).toMatch(/^v1\.[gu]\.[A-Za-z0-9_-]+$/u);
    expect(await decodeSharedSource(payload)).toBe(source);
  });

  it("adds only the code query parameter and clears fragments", async () => {
    const shareUrl = new URL(
      await createShareUrl("void main() {}", "https://example.com/receh/?mode=preview#editor"),
    );

    expect(shareUrl.pathname).toBe("/receh/");
    expect(shareUrl.searchParams.get("mode")).toBe("preview");
    expect(await decodeSharedSource(shareUrl.searchParams.get("code")!)).toBe("void main() {}");
    expect(shareUrl.hash).toBe("");
  });

  it("removes consumed code without discarding other URL state", () => {
    expect(
      removeShareCodeFromUrl("https://example.com/receh/?code=payload&mode=preview#editor"),
    ).toBe("https://example.com/receh/?mode=preview#editor");
  });

  it("rejects malformed, unsupported, and oversized payloads", async () => {
    await expect(decodeSharedSource("v2.u.c291cmNl")).rejects.toThrow("version");
    await expect(decodeSharedSource("v1.x.c291cmNl")).rejects.toThrow("encoding");
    await expect(decodeSharedSource("v1.u.not+url-safe")).rejects.toThrow("malformed");
    await expect(encodeSharedSource("x".repeat(MAX_SHARED_SOURCE_BYTES + 1))).rejects.toThrow(
      "too large",
    );
  });
});
