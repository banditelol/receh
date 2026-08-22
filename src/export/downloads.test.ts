import { describe, expect, it } from "vite-plus/test";
import { createShaderDocument } from "../document/shaderDocument.ts";
import { createProjectFile, createSourceFile, safeFilename } from "./downloads.ts";

describe("export downloads", () => {
  it("creates safe portable filenames", () => {
    expect(safeFilename("  Neon / Orbit  ")).toBe("neon-orbit");
    expect(safeFilename("✨")).toBe("untitled-shader");
  });

  it("exports the complete project schema", async () => {
    const file = createProjectFile(createShaderDocument("shader source"));

    expect(file.filename).toBe("untitled-shader.receh.json");
    expect(await file.blob.text()).toContain('"schemaVersion": 2');
  });

  it("exports the active GLSL pass", async () => {
    const file = createSourceFile(createShaderDocument("shader source"));

    expect(file.filename).toBe("main.frag");
    expect(await file.blob.text()).toBe("shader source");
  });
});
