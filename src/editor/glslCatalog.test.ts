import { describe, expect, it } from "vite-plus/test";
import { GLSL_REFERENCE_ENTRIES, getGlslReference, searchGlslReferences } from "./glslCatalog.ts";

describe("local GLSL reference catalog", () => {
  it("contains signatures, summaries, and examples for common GLSL ES functions", () => {
    expect(GLSL_REFERENCE_ENTRIES.length).toBeGreaterThan(50);
    expect(getGlslReference("smoothstep")).toMatchObject({
      category: "Common",
      snippet: "smoothstep(${edge0}, ${edge1}, ${x})",
    });
  });

  it("ranks exact names, aliases, and fuzzy misspellings", () => {
    expect(searchGlslReferences("mix")[0]?.name).toBe("mix");
    expect(searchGlslReferences("lerp")[0]?.name).toBe("mix");
    expect(searchGlslReferences("smostep")[0]?.name).toBe("smoothstep");
  });

  it("returns a useful popular-function list for an empty query", () => {
    const names = searchGlslReferences("", 8).map((item) => item.name);
    expect(names).toContain("smoothstep");
    expect(names).toContain("mix");
  });
});
