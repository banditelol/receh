import { describe, expect, it } from "vite-plus/test";
import { hashShaderDocument } from "./documentHash.ts";
import { createShaderDocument, updateActivePassSource } from "./shaderDocument.ts";

describe("shader document content hashes", () => {
  it("is stable for unchanged documents", async () => {
    const document = createShaderDocument("same");
    await expect(hashShaderDocument(document)).resolves.toBe(await hashShaderDocument(document));
  });

  it("changes when shader source changes", async () => {
    const before = createShaderDocument("before");
    const after = updateActivePassSource(before, "after");
    expect(await hashShaderDocument(after)).not.toBe(await hashShaderDocument(before));
  });
});
