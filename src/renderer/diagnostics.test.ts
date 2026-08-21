import { describe, expect, it } from "vite-plus/test";
import { parseShaderDiagnostics } from "./diagnostics.ts";

describe("parseShaderDiagnostics", () => {
  it("parses WebGL-style errors", () => {
    expect(parseShaderDiagnostics("ERROR: 0:18: 'oops' : syntax error")).toEqual([
      { line: 18, message: "'oops' : syntax error" },
    ]);
  });

  it("parses ANGLE-style errors", () => {
    expect(parseShaderDiagnostics("0(7) : error C0000: syntax error")).toEqual([
      { line: 7, message: "syntax error" },
    ]);
  });

  it("ignores non-diagnostic lines", () => {
    expect(parseShaderDiagnostics("Shader failed without a line number")).toEqual([]);
  });
});
