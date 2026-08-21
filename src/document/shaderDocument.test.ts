import { describe, expect, it } from "vite-plus/test";
import {
  createShaderDocument,
  getActivePass,
  migrateShaderDocument,
  parseShaderDocument,
  updateActivePassSource,
} from "./shaderDocument.ts";

describe("shader document migrations", () => {
  it("migrates a legacy source-only draft", () => {
    const document = migrateShaderDocument({
      schemaVersion: 0,
      title: "Legacy",
      source: "void main() {}",
    });

    expect(document.schemaVersion).toBe(1);
    expect(document.title).toBe("Legacy");
    expect(getActivePass(document).source).toBe("void main() {}");
  });

  it("repairs an invalid active pass id", () => {
    const document = migrateShaderDocument({
      schemaVersion: 1,
      id: "draft",
      title: "Draft",
      activePassId: "missing",
      passes: [{ id: "main", name: "main.frag", source: "source" }],
    });

    expect(document.activePassId).toBe("main");
  });

  it("falls back to a valid document for corrupt JSON", () => {
    expect(getActivePass(parseShaderDocument("not json")).source).toContain("#version 300 es");
  });
});

describe("shader document updates", () => {
  it("updates the active pass without mutating the previous document", () => {
    const before = createShaderDocument("before");
    const after = updateActivePassSource(before, "after");

    expect(getActivePass(before).source).toBe("before");
    expect(getActivePass(after).source).toBe("after");
  });
});
