import {
  disposePipelineTargets,
  renderPassPipelineFrame,
  type CompiledPipelinePass,
  type ShaderPipelinePass,
} from "../renderer/passPipeline.ts";
import { createFullscreenTriangle, createProgram } from "../renderer/webgl.ts";
import type { FramebufferTarget } from "../renderer/webgl.ts";

type ExportRenderer = {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  passes: CompiledPipelinePass[];
  buffer: WebGLBuffer;
  render: (frame: {
    time: number;
    timeDelta: number;
    frame: number;
    mouse: [number, number];
    drag: [number, number];
    scroll: number;
  }) => void;
  dispose: () => void;
};

export function createExportRenderer(
  passes: readonly ShaderPipelinePass[],
  width: number,
  height: number,
): ExportRenderer {
  const canvas = window.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("WebGL2 is unavailable for export in this browser.");

  const buffer = createFullscreenTriangle(gl);
  const compiledPasses: CompiledPipelinePass[] = [];
  const targets = new Map<string, FramebufferTarget>();
  try {
    for (const pass of passes) {
      const result = createProgram(gl, pass.source);
      if (!result.program) throw new Error(`${pass.id}: ${result.log}`);
      compiledPasses.push({ ...pass, program: result.program });
    }
  } catch (reason) {
    for (const pass of compiledPasses) gl.deleteProgram(pass.program);
    gl.deleteBuffer(buffer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw reason;
  }

  return {
    canvas,
    gl,
    passes: compiledPasses,
    buffer,
    render: (frame) => renderPassPipelineFrame(gl, buffer, compiledPasses, targets, frame),
    dispose: () => {
      disposePipelineTargets(gl, targets);
      for (const pass of compiledPasses) gl.deleteProgram(pass.program);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export async function renderShaderPng(passes: readonly ShaderPipelinePass[], time = 0) {
  const renderer = createExportRenderer(passes, 1080, 1080);

  try {
    renderer.render({
      time,
      timeDelta: 0,
      frame: 0,
      mouse: [540, 540],
      drag: [0, 0],
      scroll: 0,
    });
    renderer.gl.finish();

    return await new Promise<Blob>((resolve, reject) => {
      renderer.canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode the preview image."));
      }, "image/png");
    });
  } finally {
    renderer.dispose();
  }
}
