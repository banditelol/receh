import type { PassResolutionScale } from "../document/shaderDocument.ts";
import type { RuntimeUniform } from "../uniforms/uniformTypes.ts";
import type { ShaderLineOrigin } from "../functions/functionLibrary.ts";
import {
  createFramebufferTarget,
  deleteFramebufferTarget,
  renderShaderFrame,
  type FramebufferTarget,
  type ShaderFrame,
} from "./webgl.ts";

export type ShaderPipelinePass = {
  id: string;
  source: string;
  lineOrigins: readonly ShaderLineOrigin[];
  resolutionScale: PassResolutionScale;
  uniforms: RuntimeUniform[];
};

export type CompiledPipelinePass = ShaderPipelinePass & {
  program: WebGLProgram;
};

export function calculatePassResolution(width: number, height: number, scale: PassResolutionScale) {
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export function requiredPassTextureUnits(passCount: number) {
  return Math.max(0, passCount - 1);
}

export function syncPipelineTargets(
  gl: WebGL2RenderingContext,
  targets: Map<string, FramebufferTarget>,
  passes: readonly CompiledPipelinePass[],
) {
  const intermediateIds = new Set(passes.slice(0, -1).map((pass) => pass.id));
  for (const [passId, target] of targets) {
    if (!intermediateIds.has(passId)) {
      deleteFramebufferTarget(gl, target);
      targets.delete(passId);
    }
  }

  passes.slice(0, -1).forEach((pass) => {
    const resolution = calculatePassResolution(
      gl.canvas.width,
      gl.canvas.height,
      pass.resolutionScale,
    );
    const existing = targets.get(pass.id);
    if (existing?.width === resolution.width && existing.height === resolution.height) return;
    if (existing) {
      deleteFramebufferTarget(gl, existing);
      targets.delete(pass.id);
    }
    targets.set(pass.id, createFramebufferTarget(gl, resolution.width, resolution.height));
  });
}

export function renderPassPipelineFrame(
  gl: WebGL2RenderingContext,
  buffer: WebGLBuffer,
  passes: readonly CompiledPipelinePass[],
  targets: Map<string, FramebufferTarget>,
  frame: Omit<ShaderFrame, "uniforms" | "target" | "inputTextures">,
) {
  const maximumTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number;
  if (requiredPassTextureUnits(passes.length) > maximumTextureUnits) {
    throw new Error(
      `This device supports ${maximumTextureUnits + 1} ordered passes at the current texture limit.`,
    );
  }

  syncPipelineTargets(gl, targets, passes);
  const inputTextures: WebGLTexture[] = [];
  passes.forEach((pass, index) => {
    const target = index === passes.length - 1 ? null : targets.get(pass.id);
    if (index < passes.length - 1 && !target) {
      throw new Error("An intermediate pass target is unavailable.");
    }
    renderShaderFrame(gl, pass.program, buffer, {
      ...frame,
      uniforms: pass.uniforms,
      target: target ?? null,
      inputTextures,
    });
    if (target) inputTextures.push(target.texture);
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

export function disposePipelineTargets(
  gl: WebGL2RenderingContext,
  targets: Map<string, FramebufferTarget>,
) {
  for (const target of targets.values()) deleteFramebufferTarget(gl, target);
  targets.clear();
}
