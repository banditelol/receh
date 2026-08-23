import { describe, expect, it } from "vite-plus/test";
import { hashShaderDocument } from "./documentHash.ts";
import {
  createShaderDocument,
  updateActivePassSource,
  updateActivePassUniformValue,
  updatePassResolutionScale,
  updateProjectFunctionsSource,
} from "./shaderDocument.ts";

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

  it("changes when a runtime uniform changes", async () => {
    const before = createShaderDocument();
    const after = updateActivePassUniformValue(before, "u_intensity", 1.4);
    expect(await hashShaderDocument(after)).not.toBe(await hashShaderDocument(before));
  });

  it("changes when project functions or pass resolution changes", async () => {
    const before = createShaderDocument();
    const withFunctions = updateProjectFunctionsSource(
      before,
      "float helper(float x) { return x; }",
    );
    const withResolution = updatePassResolutionScale(before, "main", 0.5);

    expect(await hashShaderDocument(withFunctions)).not.toBe(await hashShaderDocument(before));
    expect(await hashShaderDocument(withResolution)).not.toBe(await hashShaderDocument(before));
  });
});
