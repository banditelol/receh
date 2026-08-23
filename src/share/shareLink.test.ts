import { describe, expect, it } from "vite-plus/test";
import {
  createPortableShaderDocument,
  updateActivePassName,
  updateDocumentTitle,
  updateProjectFunctionsSource,
} from "../document/shaderDocument.ts";
import {
  createShareUrl,
  decodeSharedDocument,
  encodeSharedDocument,
  MAX_SHARED_SOURCE_BYTES,
  readShareViewFromUrl,
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
    const document = updateProjectFunctionsSource(
      sharedDocument(),
      "float projectWave(float x) { return x; }",
    );
    const payload = await encodeSharedDocument(document, "float globalWave(float x) { return x; }");

    expect(payload).toMatch(/^v3\.[gu]\.[A-Za-z0-9_-]+$/u);
    expect(await decodeSharedDocument(payload)).toEqual({
      title: "Gelombang biru 🌊",
      passName: "cahaya.frag",
      source: "// receh 🌊\nvoid main() { /* café */ }",
      projectFunctionsSource: "float projectWave(float x) { return x; }",
      globalFunctionsSource: "float globalWave(float x) { return x; }",
    });
  });

  it("continues to open legacy source-only v1 links", async () => {
    expect(await decodeSharedDocument("v1.u.dm9pZCBtYWluKCkge30")).toEqual({
      title: "Shared shader",
      passName: "main.frag",
      source: "void main() {}",
      projectFunctionsSource: "",
      globalFunctionsSource: "",
    });
  });

  it("continues to open metadata-aware v2 links", async () => {
    const value = btoa(JSON.stringify(["Old title", "old.frag", "void main() {}"]))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/u, "");
    expect(await decodeSharedDocument(`v2.u.${value}`)).toEqual({
      title: "Old title",
      passName: "old.frag",
      source: "void main() {}",
      projectFunctionsSource: "",
      globalFunctionsSource: "",
    });
  });

  it("adds only the code query parameter and clears fragments", async () => {
    const shareUrl = new URL(
      await createShareUrl(sharedDocument("void main() {}"), {
        currentHref: "https://example.com/receh/?mode=preview#editor",
        shareView: { view: "global", functionName: "palette" },
      }),
    );

    expect(shareUrl.pathname).toBe("/receh/");
    expect(shareUrl.searchParams.get("mode")).toBe("preview");
    expect((await decodeSharedDocument(shareUrl.searchParams.get("code")!)).source).toBe(
      "void main() {}",
    );
    expect(shareUrl.hash).toBe("");
    expect(shareUrl.searchParams.get("view")).toBe("functions");
    expect(shareUrl.searchParams.get("scope")).toBe("global");
    expect(shareUrl.searchParams.get("fn")).toBe("palette");
    expect(readShareViewFromUrl(shareUrl.toString())).toEqual({
      view: "global",
      functionName: "palette",
    });
  });

  it("removes consumed code without discarding other URL state", () => {
    expect(
      removeShareCodeFromUrl(
        "https://example.com/receh/?code=payload&view=functions&scope=global&fn=wave&mode=preview#editor",
      ),
    ).toBe("https://example.com/receh/?mode=preview#editor");
  });

  it("rejects malformed, unsupported, and oversized payloads", async () => {
    await expect(decodeSharedDocument("v4.u.c291cmNl")).rejects.toThrow("version");
    await expect(decodeSharedDocument("v2.x.c291cmNl")).rejects.toThrow("encoding");
    await expect(decodeSharedDocument("v2.u.not+url-safe")).rejects.toThrow("malformed");
    await expect(
      encodeSharedDocument(sharedDocument("x".repeat(MAX_SHARED_SOURCE_BYTES + 1))),
    ).rejects.toThrow("too large");
  });
});
