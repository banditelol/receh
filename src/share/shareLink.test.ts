import { describe, expect, it } from "vite-plus/test";
import {
  createPortableShaderDocument,
  updateActivePassName,
  updateDocumentTitle,
} from "../document/shaderDocument.ts";
import {
  createShareUrl,
  decodeSharedDocument,
  encodeSharedDocument,
  MAX_SHARED_SOURCE_BYTES,
  removeShareCodeFromUrl,
} from "./shareLink.ts";

function sharedDocument(source = "// receh 🌊\nvoid main() { /* café */ }") {
  return updateActivePassName(
    updateDocumentTitle(createPortableShaderDocument(source), "Gelombang biru 🌊"),
    "cahaya.frag",
  );
}

describe("share links", () => {
  it("round-trips a Unicode title, active pass name, and shader source", async () => {
    const payload = await encodeSharedDocument(sharedDocument());

    expect(payload).toMatch(/^v2\.[gu]\.[A-Za-z0-9_-]+$/u);
    expect(await decodeSharedDocument(payload)).toEqual({
      title: "Gelombang biru 🌊",
      passName: "cahaya.frag",
      source: "// receh 🌊\nvoid main() { /* café */ }",
    });
  });

  it("continues to open legacy source-only v1 links", async () => {
    expect(await decodeSharedDocument("v1.u.dm9pZCBtYWluKCkge30")).toEqual({
      title: "Shared shader",
      passName: "main.frag",
      source: "void main() {}",
    });
  });

  it("adds only the code query parameter and clears fragments", async () => {
    const shareUrl = new URL(
      await createShareUrl(
        sharedDocument("void main() {}"),
        "https://example.com/receh/?mode=preview#editor",
      ),
    );

    expect(shareUrl.pathname).toBe("/receh/");
    expect(shareUrl.searchParams.get("mode")).toBe("preview");
    expect((await decodeSharedDocument(shareUrl.searchParams.get("code")!)).source).toBe(
      "void main() {}",
    );
    expect(shareUrl.hash).toBe("");
  });

  it("removes consumed code without discarding other URL state", () => {
    expect(
      removeShareCodeFromUrl("https://example.com/receh/?code=payload&mode=preview#editor"),
    ).toBe("https://example.com/receh/?mode=preview#editor");
  });

  it("rejects malformed, unsupported, and oversized payloads", async () => {
    await expect(decodeSharedDocument("v3.u.c291cmNl")).rejects.toThrow("version");
    await expect(decodeSharedDocument("v2.x.c291cmNl")).rejects.toThrow("encoding");
    await expect(decodeSharedDocument("v2.u.not+url-safe")).rejects.toThrow("malformed");
    await expect(
      encodeSharedDocument(sharedDocument("x".repeat(MAX_SHARED_SOURCE_BYTES + 1))),
    ).rejects.toThrow("too large");
  });
});
