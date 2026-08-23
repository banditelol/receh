import { describe, expect, it } from "vite-plus/test";
import {
  addFragmentPass,
  cloneShaderDocumentWithNewIds,
  createShaderDocument,
  deleteFragmentPass,
  getActivePass,
  migrateShaderDocument,
  parseImportedShaderDocument,
  parseShaderDocument,
  moveFragmentPass,
  setActivePass,
  updateActivePassSource,
  updateActivePassName,
  updateActivePassUniformValue,
  updateDocumentTitle,
  updatePassResolutionScale,
} from "./shaderDocument.ts";

describe("shader document migrations", () => {
  it("migrates a legacy source-only draft", () => {
    const document = migrateShaderDocument({
      schemaVersion: 0,
      title: "Legacy",
      source: "void main() {}",
    });

    expect(document.schemaVersion).toBe(3);
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
    expect(getActivePass(document).resolutionScale).toBe(1);
  });

  it("adds full resolution while migrating V2 pass uniform values", () => {
    const document = migrateShaderDocument({
      schemaVersion: 2,
      id: "v2-project",
      title: "Tuned shader",
      activePassId: "main",
      passes: [
        {
          id: "main",
          name: "main.frag",
          source: "source",
          uniformValues: { u_strength: 0.75 },
        },
      ],
    });

    expect(getActivePass(document).uniformValues).toEqual({ u_strength: 0.75 });
    expect(getActivePass(document).resolutionScale).toBe(1);
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

  it("adds, activates, reorders, scales, and deletes fragment passes immutably", () => {
    const first = createShaderDocument();
    const added = addFragmentPass(first, () => "second");
    const scaled = updatePassResolutionScale(added, "second", 0.5);
    const moved = moveFragmentPass(scaled, "second", -1);
    const reactivated = setActivePass(moved, "main");
    const deleted = deleteFragmentPass(reactivated, "second");

    expect(first.passes).toHaveLength(1);
    expect(added.activePassId).toBe("second");
    expect(getActivePass(scaled).resolutionScale).toBe(0.5);
    expect(moved.passes.map((pass) => pass.id)).toEqual(["second", "main"]);
    expect(reactivated.activePassId).toBe("main");
    expect(deleted.passes.map((pass) => pass.id)).toEqual(["main"]);
  });

  it("keeps at least one pass and ignores unknown active passes", () => {
    const document = createShaderDocument();
    expect(deleteFragmentPass(document, "main")).toBe(document);
    expect(setActivePass(document, "missing")).toBe(document);
  });

  it("does not reuse an existing generated pass name after deletion", () => {
    const withSecond = addFragmentPass(createShaderDocument(), () => "second");
    const withThird = addFragmentPass(withSecond, () => "third");
    const withoutSecond = deleteFragmentPass(withThird, "second");
    const withFourth = addFragmentPass(withoutSecond, () => "fourth");

    expect(withFourth.passes.map((pass) => pass.name)).toEqual([
      "main.frag",
      "pass-3.frag",
      "pass-4.frag",
    ]);
  });
});
