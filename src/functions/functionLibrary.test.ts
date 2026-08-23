import { describe, expect, it } from "vite-plus/test";
import {
  appendFunctionTemplate,
  collectFunctionDefinitions,
  composeShaderSource,
  mapComposedDiagnostics,
} from "./functionLibrary.ts";

describe("function libraries", () => {
  it("collects function names, signatures, scopes, and source lines", () => {
    expect(
      collectFunctionDefinitions(
        "// helpers\nfloat glow(float x) { return x; }\nvec2 warp(vec2 p) { return p; }",
        "project",
      ),
    ).toEqual([
      { name: "glow", signature: "float glow(float x)", line: 2, scope: "project" },
      { name: "warp", signature: "vec2 warp(vec2 p)", line: 3, scope: "project" },
    ]);
  });

  it("injects global and project functions before pass functions with line origins", () => {
    const composed = composeShaderSource(
      "#version 300 es\nprecision highp float;\nuniform float u_gain;\nvoid main() {}",
      "float projectFn(float x) { return x; }",
      "float globalFn(float x) { return x; }",
    );

    expect(composed.source).toContain(
      "uniform float u_gain;\nfloat globalFn(float x) { return x; }\nfloat projectFn(float x) { return x; }\nvoid main() {}",
    );
    expect(
      mapComposedDiagnostics([{ line: 4, message: "global error" }], composed.lineOrigins),
    ).toEqual([{ line: 1, message: "global error", sourceView: "global" }]);
    expect(
      mapComposedDiagnostics([{ line: 6, message: "pass error" }], composed.lineOrigins),
    ).toEqual([{ line: 4, message: "pass error", sourceView: "pass" }]);
  });

  it("appends uniquely named starter functions", () => {
    const result = appendFunctionTemplate("float helper(float value) { return value; }\n");
    expect(result.name).toBe("helper2");
    expect(result.source).toContain("float helper2(float value)");
  });
});
