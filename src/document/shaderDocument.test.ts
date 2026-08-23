import { describe, expect, it } from "vite-plus/test";
import {
  cloneShaderDocumentWithNewIds,
  createShaderDocument,
  getActivePass,
  migrateShaderDocument,
  parseImportedShaderDocument,
  parseShaderDocument,
  updateActivePassSource,
  updateActivePassName,
  updateActivePassUniformValue,
  updateDocumentTitle,
} from "./shaderDocument.ts";

describe("shader document migrations", () => {
  it("migrates a legacy source-only draft", () => {
    const document = migrateShaderDocument({
      schemaVersion: 0,
      title: "Legacy",
      source: "void main() {}",
    });

    expect(document.schemaVersion).toBe(2);
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
    expect(getActivePass(document).uniformValues).toEqual({});
  });

  it("falls back to a valid document for corrupt JSON", () => {
    expect(getActivePass(parseShaderDocument("not json")).source).toContain("#version 300 es");
  });

  it("rejects corrupt and unsupported imported projects", () => {
    expect(() => parseImportedShaderDocument("not json")).toThrow("valid JSON");
    expect(() =>
      parseImportedShaderDocument(JSON.stringify({ schemaVersion: 99, passes: [] })),
    ).toThrow("version 99");
  });

  it("accepts and migrates source-only imported projects", () => {
    const document = parseImportedShaderDocument(
      JSON.stringify({ schemaVersion: 0, title: "Old project", source: "legacy" }),
    );
    expect(document.title).toBe("Old project");
    expect(getActivePass(document).source).toBe("legacy");
  });
});

describe("shader document updates", () => {
  it("updates the active pass without mutating the previous document", () => {
    const before = createShaderDocument("before");
    const after = updateActivePassSource(before, "after");

    expect(getActivePass(before).source).toBe("before");
    expect(getActivePass(after).source).toBe("after");
  });

  it("renames only the active pass", () => {
    const before = createShaderDocument();
    const after = updateActivePassName(before, "shared.frag");

    expect(getActivePass(before).name).toBe("main.frag");
    expect(getActivePass(after).name).toBe("shared.frag");
  });

  it("normalizes an empty title", () => {
    expect(updateDocumentTitle(createShaderDocument(), "   ").title).toBe("Untitled shader");
  });

  it("updates a pass uniform without mutating the previous document", () => {
    const before = createShaderDocument();
    const after = updateActivePassUniformValue(before, "u_tint", [1, 0.5, 0]);

    expect(getActivePass(before).uniformValues).toEqual({});
    expect(getActivePass(after).uniformValues.u_tint).toEqual([1, 0.5, 0]);
  });

  it("reidentifies a document and all of its passes", () => {
    const ids = ["new-pass", "new-project"];
    const document = cloneShaderDocumentWithNewIds(createShaderDocument(), () => ids.shift()!);

    expect(document.id).toBe("new-project");
    expect(document.activePassId).toBe("new-pass");
    expect(document.passes[0].id).toBe("new-pass");
  });
});
