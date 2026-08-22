import { describe, expect, it } from "vite-plus/test";
import {
  bakeUniformValuesIntoSource,
  parseTunableUniforms,
  resolveRuntimeUniforms,
} from "./uniformParser.ts";

const SOURCE = `uniform vec2 u_resolution;
uniform vec3 u_tint; // @color #336699
uniform float u_amount; // @range 0 2 0.05 @default 1.25
uniform bool u_enabled; // @default true
uniform ivec2 u_offset; // @range -20 20 1 @default 2, 3`;

describe("tunable uniform parsing", () => {
  it("parses supported custom uniforms and skips runtime uniforms", () => {
    const definitions = parseTunableUniforms(SOURCE);
    expect(definitions.map(({ name, control }) => [name, control])).toEqual([
      ["u_tint", "color"],
      ["u_amount", "number"],
      ["u_enabled", "boolean"],
      ["u_offset", "vector"],
    ]);
    expect(definitions[0].defaultValue).toEqual([0.2, 0.4, 0.6]);
    expect(definitions[1].range).toEqual({ min: 0, max: 2, step: 0.05 });
    expect(definitions[1].defaultValue).toBe(1.25);
  });

  it("resolves stored values for the renderer", () => {
    const uniforms = resolveRuntimeUniforms(parseTunableUniforms(SOURCE), {
      u_tint: [1, 0, 0],
      u_amount: 1.5,
    });
    expect(uniforms.find(({ name }) => name === "u_tint")?.value).toEqual([1, 0, 0]);
    expect(uniforms.find(({ name }) => name === "u_enabled")?.value).toBe(true);
  });

  it("bakes current values into valid GLSL constants", () => {
    const baked = bakeUniformValuesIntoSource(SOURCE, {
      u_tint: [1, 0.5, 0],
      u_amount: 1.75,
      u_enabled: false,
      u_offset: [4, -2],
    });
    expect(baked).toContain("const vec3 u_tint = vec3(1.0, 0.5, 0.0);");
    expect(baked).toContain("const float u_amount = 1.75;");
    expect(baked).toContain("const bool u_enabled = false;");
    expect(baked).toContain("const ivec2 u_offset = ivec2(4, -2);");
    expect(baked).toContain("uniform vec2 u_resolution;");
  });
});
