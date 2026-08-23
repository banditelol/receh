import { describe, expect, it } from "vite-plus/test";
import {
  calculatePassResolution,
  disposePipelineTargets,
  renderPassPipelineFrame,
  requiredPassTextureUnits,
  syncPipelineTargets,
  type CompiledPipelinePass,
} from "./passPipeline.ts";

function createPass(id: string, resolutionScale: 0.25 | 0.5 | 1): CompiledPipelinePass {
  return {
    id,
    source: "",
    resolutionScale,
    uniforms: [],
    program: { id } as unknown as WebGLProgram,
  };
}

function createFramebufferGl(width = 100, height = 80) {
  let created = 0;
  let deleted = 0;
  let currentProgram = "";
  const drawn: string[] = [];
  const samplers: string[] = [];
  const gl = {
    canvas: { width, height },
    ARRAY_BUFFER: 0,
    FRAMEBUFFER: 1,
    FRAMEBUFFER_COMPLETE: 2,
    COLOR_ATTACHMENT0: 3,
    TEXTURE_2D: 4,
    TEXTURE_MIN_FILTER: 5,
    TEXTURE_MAG_FILTER: 6,
    TEXTURE_WRAP_S: 7,
    TEXTURE_WRAP_T: 8,
    LINEAR: 9,
    CLAMP_TO_EDGE: 10,
    RGBA8: 11,
    RGBA: 12,
    UNSIGNED_BYTE: 13,
    MAX_TEXTURE_IMAGE_UNITS: 14,
    TEXTURE0: 100,
    TRIANGLES: 101,
    createFramebuffer: () => ({ kind: "framebuffer", index: created++ }),
    createTexture: () => ({ kind: "texture", index: created++ }),
    bindTexture: () => undefined,
    texParameteri: () => undefined,
    texImage2D: () => undefined,
    bindFramebuffer: () => undefined,
    framebufferTexture2D: () => undefined,
    checkFramebufferStatus: () => 2,
    getParameter: () => 16,
    viewport: () => undefined,
    useProgram: (program: { id: string }) => {
      currentProgram = program.id;
    },
    bindBuffer: () => undefined,
    getAttribLocation: () => -1,
    getUniformLocation: (_program: unknown, name: string) => name,
    uniform2f: () => undefined,
    uniform1f: () => undefined,
    uniform1i: (location: string, value: number) => {
      if (location === "u_previous" || location.startsWith("u_pass")) {
        samplers.push(`${currentProgram}:${location}:${value}`);
      }
    },
    activeTexture: () => undefined,
    drawArrays: () => {
      drawn.push(currentProgram);
    },
    deleteFramebuffer: () => {
      deleted += 1;
    },
    deleteTexture: () => {
      deleted += 1;
    },
  } as unknown as WebGL2RenderingContext;
  return { gl, created: () => created, deleted: () => deleted, drawn, samplers };
}

describe("ordered pass pipeline", () => {
  it("calculates bounded intermediate resolutions", () => {
    expect(calculatePassResolution(1920, 1080, 1)).toEqual({ width: 1920, height: 1080 });
    expect(calculatePassResolution(1920, 1080, 0.5)).toEqual({ width: 960, height: 540 });
    expect(calculatePassResolution(3, 3, 0.25)).toEqual({ width: 1, height: 1 });
  });

  it("requires one texture unit for every pass before the final pass", () => {
    expect(requiredPassTextureUnits(1)).toBe(0);
    expect(requiredPassTextureUnits(3)).toBe(2);
  });

  it("reuses, resizes, reorders, and disposes intermediate framebuffers deterministically", () => {
    const fake = createFramebufferGl();
    const targets = new Map();
    const original = [createPass("a", 1), createPass("b", 0.5), createPass("c", 1)];

    syncPipelineTargets(fake.gl, targets, original);
    expect([...targets].map(([id, target]) => [id, target.width, target.height])).toEqual([
      ["a", 100, 80],
      ["b", 50, 40],
    ]);
    expect(fake.created()).toBe(4);

    syncPipelineTargets(fake.gl, targets, original);
    expect(fake.created()).toBe(4);
    expect(fake.deleted()).toBe(0);

    syncPipelineTargets(fake.gl, targets, [
      createPass("a", 0.25),
      createPass("c", 1),
      createPass("b", 0.5),
    ]);
    expect([...targets].map(([id, target]) => [id, target.width, target.height])).toEqual([
      ["a", 25, 20],
      ["c", 100, 80],
    ]);
    expect(fake.created()).toBe(8);
    expect(fake.deleted()).toBe(4);

    disposePipelineTargets(fake.gl, targets);
    expect(targets.size).toBe(0);
    expect(fake.deleted()).toBe(8);
  });

  it("draws in order and exposes the immediate and indexed previous textures", () => {
    const fake = createFramebufferGl();
    const passes = [createPass("a", 1), createPass("b", 1), createPass("c", 1)];

    renderPassPipelineFrame(fake.gl, {} as WebGLBuffer, passes, new Map(), {
      time: 0,
      timeDelta: 0,
      frame: 0,
      mouse: [0, 0],
      drag: [0, 0],
      scroll: 0,
    });

    expect(fake.drawn).toEqual(["a", "b", "c"]);
    expect(fake.samplers).toEqual([
      "b:u_pass0:0",
      "b:u_previous:0",
      "c:u_pass0:0",
      "c:u_pass1:1",
      "c:u_previous:1",
    ]);
  });
});
