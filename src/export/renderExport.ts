import { createFullscreenTriangle, createProgram, renderShaderFrame } from "../renderer/webgl.ts";

type ExportRenderer = {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  dispose: () => void;
};

export function createExportRenderer(
  source: string,
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
  const result = createProgram(gl, source);
  if (!result.program) {
    gl.deleteBuffer(buffer);
    throw new Error(result.log);
  }

  return {
    canvas,
    gl,
    program: result.program,
    buffer,
    dispose: () => {
      gl.deleteProgram(result.program);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export async function renderShaderPng(source: string, time = 0) {
  const renderer = createExportRenderer(source, 1080, 1080);

  try {
    renderShaderFrame(renderer.gl, renderer.program, renderer.buffer, {
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
