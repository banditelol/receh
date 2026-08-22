import { describe, expect, it } from "vite-plus/test";
import { collectGlslSourceSymbols, findGlslReferenceAtCursor } from "./glslLanguage.ts";

const SOURCE = `uniform vec2 u_resolution;
float palette(float t, float offset) {
  return 0.5 + 0.5 * cos(t + offset);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float mask = smoothstep(0.2, 0.4, length(uv));
}`;

describe("GLSL language helpers", () => {
  it("collects user functions and variables for source-aware completion", () => {
    expect(collectGlslSourceSymbols(SOURCE)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "palette", kind: "function" }),
        expect.objectContaining({ name: "u_resolution", kind: "variable" }),
        expect.objectContaining({ name: "mask", kind: "variable" }),
      ]),
    );
  });

  it("finds references under a word and inside function arguments", () => {
    const functionPosition = SOURCE.indexOf("smoothstep") + 3;
    expect(findGlslReferenceAtCursor(SOURCE, functionPosition)?.name).toBe("smoothstep");

    const argumentPosition = SOURCE.indexOf("0.4") + 2;
    expect(findGlslReferenceAtCursor(SOURCE, argumentPosition)?.name).toBe("smoothstep");
  });
});
