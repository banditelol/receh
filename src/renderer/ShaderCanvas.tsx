import { useEffect, useRef, useState } from "react";
import { parseShaderDiagnostics, type ShaderDiagnostic } from "./diagnostics.ts";
import { createFullscreenTriangle, createProgram, renderShaderFrame } from "./webgl.ts";
import type { RuntimeUniform } from "../uniforms/uniformTypes.ts";

type CompileState = {
  status: "compiling" | "ready" | "error" | "unsupported";
  diagnostics: ShaderDiagnostic[];
  message: string;
};

type ShaderCanvasProps = {
  source: string;
  compileRequest: number;
  paused: boolean;
  uniforms: RuntimeUniform[];
  onCompileState: (state: CompileState) => void;
};

type Runtime = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram | null;
  buffer: WebGLBuffer;
  startedAt: number;
  lastFrameAt: number;
  frame: number;
  mouse: [number, number];
  drag: [number, number];
  dragOrigin: [number, number] | null;
  scroll: number;
};

function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  gl.viewport(0, 0, width, height);
}

export function ShaderCanvas({
  source,
  compileRequest,
  paused,
  uniforms,
  onCompileState,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const sourceRef = useRef(source);
  const pausedRef = useRef(paused);
  const uniformsRef = useRef(uniforms);
  const onCompileStateRef = useRef(onCompileState);
  const [contextLost, setContextLost] = useState(false);

  sourceRef.current = source;
  pausedRef.current = paused;
  uniformsRef.current = uniforms;
  onCompileStateRef.current = onCompileState;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      onCompileStateRef.current({
        status: "unsupported",
        diagnostics: [],
        message: "WebGL2 is unavailable in this browser.",
      });
      return;
    }

    const buffer = createFullscreenTriangle(gl);

    runtimeRef.current = {
      gl,
      program: null,
      buffer,
      startedAt: performance.now(),
      lastFrameAt: performance.now(),
      frame: 0,
      mouse: [0, 0],
      drag: [0, 0],
      dragOrigin: null,
      scroll: 0,
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      runtimeRef.current = null;
      window.location.reload();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    let animationFrame = 0;
    const render = (now: number) => {
      const runtime = runtimeRef.current;
      if (runtime && runtime.program && !pausedRef.current) {
        resizeCanvas(canvas, runtime.gl);
        renderShaderFrame(runtime.gl, runtime.program, runtime.buffer, {
          time: (now - runtime.startedAt) / 1000,
          timeDelta: Math.max(0, (now - runtime.lastFrameAt) / 1000),
          frame: runtime.frame++,
          mouse: runtime.mouse,
          drag: runtime.drag,
          scroll: runtime.scroll,
          uniforms: uniformsRef.current,
        });
        runtime.lastFrameAt = now;
      }
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      if (runtimeRef.current?.program) gl.deleteProgram(runtimeRef.current.program);
      gl.deleteBuffer(buffer);
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    onCompileStateRef.current({ status: "compiling", diagnostics: [], message: "Compiling" });
    const result = createProgram(runtime.gl, sourceRef.current);

    if (!result.program) {
      onCompileStateRef.current({
        status: "error",
        diagnostics: parseShaderDiagnostics(result.log),
        message: result.log,
      });
      return;
    }

    const previous = runtime.program;
    runtime.program = result.program;
    runtime.startedAt = performance.now();
    runtime.lastFrameAt = runtime.startedAt;
    runtime.frame = 0;
    if (previous) runtime.gl.deleteProgram(previous);
    onCompileStateRef.current({ status: "ready", diagnostics: [], message: "Live" });
  }, [compileRequest]);

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const x = (event.clientX - rect.left) * scale;
    const y = (rect.bottom - event.clientY) * scale;
    runtime.mouse = [x, y];
    if (runtime.dragOrigin) {
      runtime.drag = [x - runtime.dragOrigin[0], y - runtime.dragOrigin[1]];
    }
  };

  return (
    <div className="canvas-shell">
      <canvas
        ref={canvasRef}
        className="shader-canvas"
        aria-label="Live shader preview. Drag to change the shader pointer uniforms."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updatePointer(event);
          const runtime = runtimeRef.current;
          if (runtime) runtime.dragOrigin = [...runtime.mouse];
        }}
        onPointerMove={updatePointer}
        onPointerUp={() => {
          const runtime = runtimeRef.current;
          if (runtime) runtime.dragOrigin = null;
        }}
        onWheel={(event) => {
          const runtime = runtimeRef.current;
          if (runtime) runtime.scroll += event.deltaY;
        }}
      />
      <div className="preview-hint" aria-hidden="true">
        drag to interact
      </div>
      {paused && <div className="canvas-message">Paused</div>}
      {contextLost && <div className="canvas-message">Graphics context lost — restoring…</div>}
    </div>
  );
}
