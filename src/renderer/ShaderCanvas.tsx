import { useEffect, useRef, useState } from "react";
import {
  advanceCompileRevision,
  CompileScheduler,
  type CompileRevision,
} from "./compileScheduler.ts";
import { parseShaderDiagnostics, type ShaderDiagnostic } from "./diagnostics.ts";
import {
  disposePipelineTargets,
  renderPassPipelineFrame,
  type CompiledPipelinePass,
  type ShaderPipelinePass,
} from "./passPipeline.ts";
import { createFullscreenTriangle, createProgram } from "./webgl.ts";
import type { FramebufferTarget } from "./webgl.ts";

type CompileState = {
  status: "compiling" | "ready" | "error" | "unsupported";
  diagnostics: ShaderDiagnostic[];
  message: string;
  hasLastGoodProgram: boolean;
  passId?: string;
};

type ShaderCanvasProps = {
  documentId: string;
  passes: readonly ShaderPipelinePass[];
  activePassId: string;
  compileRequest: number;
  paused: boolean;
  seekRequest: { time: number; request: number };
  onCompileState: (state: CompileState) => void;
  onPlaybackTimeChange: (time: number) => void;
};

type PassError = {
  diagnostics: ShaderDiagnostic[];
  message: string;
};

type Runtime = {
  gl: WebGL2RenderingContext;
  programs: Map<string, WebGLProgram>;
  targets: Map<string, FramebufferTarget>;
  buffer: WebGLBuffer;
  documentId: string | null;
  time: number;
  lastFrameAt: number;
  lastTimeReportAt: number;
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

function clearPreview(runtime: Runtime) {
  runtime.gl.bindFramebuffer(runtime.gl.FRAMEBUFFER, null);
  runtime.gl.clearColor(0, 0, 0, 1);
  runtime.gl.clear(runtime.gl.COLOR_BUFFER_BIT);
}

function disposePrograms(runtime: Runtime) {
  for (const program of runtime.programs.values()) runtime.gl.deleteProgram(program);
  runtime.programs.clear();
}

export function ShaderCanvas({
  documentId,
  passes,
  activePassId,
  compileRequest,
  paused,
  seekRequest,
  onCompileState,
  onPlaybackTimeChange,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const pausedRef = useRef(paused);
  const passesRef = useRef(passes);
  const activePassIdRef = useRef(activePassId);
  const onCompileStateRef = useRef(onCompileState);
  const onPlaybackTimeChangeRef = useRef(onPlaybackTimeChange);
  const revisionsRef = useRef(new Map<string, CompileRevision>());
  const schedulersRef = useRef(new Map<string, CompileScheduler>());
  const compilePlanRef = useRef<CompileRevision[]>([]);
  const compileTargetKeyRef = useRef("");
  const compileGenerationRef = useRef(0);
  const pendingCompilationRef = useRef(true);
  const errorsRef = useRef(new Map<string, PassError>());
  const [contextLost, setContextLost] = useState(false);

  pausedRef.current = paused;
  passesRef.current = passes;
  activePassIdRef.current = activePassId;
  onCompileStateRef.current = onCompileState;
  onPlaybackTimeChangeRef.current = onPlaybackTimeChange;

  const nextRevisions = new Map<string, CompileRevision>();
  const compilePlan = passes.map((pass) => {
    const revision = advanceCompileRevision(revisionsRef.current.get(pass.id), {
      documentId,
      passId: pass.id,
      source: pass.source,
    });
    nextRevisions.set(pass.id, revision);
    const scheduler = schedulersRef.current.get(pass.id) ?? new CompileScheduler();
    scheduler.updateTarget(revision);
    schedulersRef.current.set(pass.id, scheduler);
    return revision;
  });
  for (const [passId, scheduler] of schedulersRef.current) {
    if (!nextRevisions.has(passId)) {
      scheduler.invalidate();
      schedulersRef.current.delete(passId);
    }
  }
  revisionsRef.current = nextRevisions;
  compilePlanRef.current = compilePlan;
  const compileTargetKey = `${documentId}:${[...compilePlan]
    .sort((left, right) => left.passId.localeCompare(right.passId))
    .map((revision) => `${revision.passId}@${revision.revision}`)
    .join("|")}`;
  if (compileTargetKeyRef.current !== compileTargetKey) {
    compileTargetKeyRef.current = compileTargetKey;
    compileGenerationRef.current += 1;
    pendingCompilationRef.current = true;
  }

  const reportPipelineState = (runtime: Runtime) => {
    const currentPasses = passesRef.current;
    const hasCompletePipeline = currentPasses.every((pass) => runtime.programs.has(pass.id));
    if (pendingCompilationRef.current) {
      onCompileStateRef.current({
        status: "compiling",
        diagnostics: [],
        message: "Compiling",
        hasLastGoodProgram: hasCompletePipeline,
      });
      return;
    }
    const errorPass =
      (errorsRef.current.has(activePassIdRef.current)
        ? activePassIdRef.current
        : currentPasses.find((pass) => errorsRef.current.has(pass.id))?.id) ?? null;
    if (errorPass) {
      const error = errorsRef.current.get(errorPass)!;
      onCompileStateRef.current({
        status: "error",
        diagnostics: error.diagnostics,
        message: error.message,
        hasLastGoodProgram: hasCompletePipeline,
        passId: errorPass,
      });
    } else if (hasCompletePipeline) {
      onCompileStateRef.current({
        status: "ready",
        diagnostics: [],
        message: "Live",
        hasLastGoodProgram: true,
      });
    } else {
      onCompileStateRef.current({
        status: "compiling",
        diagnostics: [],
        message: "Compiling",
        hasLastGoodProgram: false,
      });
    }
  };

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
        hasLastGoodProgram: false,
      });
      return;
    }

    const buffer = createFullscreenTriangle(gl);
    runtimeRef.current = {
      gl,
      programs: new Map(),
      targets: new Map(),
      buffer,
      documentId: null,
      time: 0,
      lastFrameAt: performance.now(),
      lastTimeReportAt: 0,
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
      if (runtime) {
        const timeDelta = Math.max(0, (now - runtime.lastFrameAt) / 1000);
        const currentPasses = passesRef.current;
        const compiledPasses = currentPasses
          .map((pass): CompiledPipelinePass | null => {
            const program = runtime.programs.get(pass.id);
            return program ? { ...pass, program } : null;
          })
          .filter((pass) => pass !== null);
        if (compiledPasses.length === currentPasses.length && !pausedRef.current) {
          runtime.time += timeDelta;
          resizeCanvas(canvas, runtime.gl);
          try {
            renderPassPipelineFrame(runtime.gl, runtime.buffer, compiledPasses, runtime.targets, {
              time: runtime.time,
              timeDelta,
              frame: runtime.frame++,
              mouse: runtime.mouse,
              drag: runtime.drag,
              scroll: runtime.scroll,
            });
          } catch (reason) {
            const message =
              reason instanceof Error ? reason.message : "The pass pipeline could not render.";
            errorsRef.current.set(activePassIdRef.current, { diagnostics: [], message });
            reportPipelineState(runtime);
          }
          if (now - runtime.lastTimeReportAt >= 100) {
            runtime.lastTimeReportAt = now;
            onPlaybackTimeChangeRef.current(runtime.time);
          }
        }
        runtime.lastFrameAt = now;
      }
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      for (const scheduler of schedulersRef.current.values()) scheduler.invalidate();
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      if (runtimeRef.current) {
        disposePrograms(runtimeRef.current);
        disposePipelineTargets(gl, runtimeRef.current.targets);
      }
      gl.deleteBuffer(buffer);
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const currentPasses = passesRef.current;
    const passIds = new Set(currentPasses.map((pass) => pass.id));
    const ownerChanged = runtime.documentId !== documentId;
    if (ownerChanged) {
      disposePrograms(runtime);
      disposePipelineTargets(runtime.gl, runtime.targets);
      errorsRef.current.clear();
      runtime.documentId = documentId;
      runtime.time = 0;
      runtime.frame = 0;
      onPlaybackTimeChangeRef.current(0);
    } else {
      for (const [passId, program] of runtime.programs) {
        if (!passIds.has(passId)) {
          runtime.gl.deleteProgram(program);
          runtime.programs.delete(passId);
        }
      }
      for (const passId of errorsRef.current.keys()) {
        if (!passIds.has(passId)) errorsRef.current.delete(passId);
      }
    }
    errorsRef.current.clear();
    if (!currentPasses.every((pass) => runtime.programs.has(pass.id))) clearPreview(runtime);
    reportPipelineState(runtime);
  }, [compileTargetKey, documentId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) reportPipelineState(runtime);
  }, [activePassId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const plan = compilePlanRef.current;
    const generation = compileGenerationRef.current;
    let active = true;
    pendingCompilationRef.current = true;
    onCompileStateRef.current({
      status: "compiling",
      diagnostics: [],
      message: "Compiling",
      hasLastGoodProgram: passesRef.current.every((pass) => runtime.programs.has(pass.id)),
    });

    void Promise.all(
      plan.map(async (revision) => {
        const scheduler = schedulersRef.current.get(revision.passId);
        if (!scheduler) return;
        const ticket = scheduler.begin(revision, compileRequest);
        const result = await Promise.resolve().then(() =>
          createProgram(runtime.gl, revision.source),
        );
        if (!active || !scheduler.isCurrent(ticket)) {
          if (result.program) runtime.gl.deleteProgram(result.program);
          return;
        }
        if (!result.program) {
          errorsRef.current.set(revision.passId, {
            diagnostics: parseShaderDiagnostics(result.log),
            message: result.log,
          });
          return;
        }
        const previous = runtime.programs.get(revision.passId);
        runtime.programs.set(revision.passId, result.program);
        errorsRef.current.delete(revision.passId);
        if (previous) runtime.gl.deleteProgram(previous);
      }),
    )
      .then(() => {
        if (!active || generation !== compileGenerationRef.current) return;
        runtime.lastFrameAt = performance.now();
        if (errorsRef.current.size === 0) {
          runtime.time = 0;
          runtime.lastTimeReportAt = 0;
          runtime.frame = 0;
          onPlaybackTimeChangeRef.current(0);
        }
        pendingCompilationRef.current = false;
        reportPipelineState(runtime);
      })
      .catch((reason: unknown) => {
        if (!active || generation !== compileGenerationRef.current) return;
        const message = reason instanceof Error ? reason.message : "Shader compilation failed";
        errorsRef.current.set(activePassIdRef.current, { diagnostics: [], message });
        pendingCompilationRef.current = false;
        reportPipelineState(runtime);
      });
    return () => {
      active = false;
    };
  }, [compileRequest]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const canvas = canvasRef.current;
    if (!runtime || !canvas) return;

    runtime.time = Math.max(0, seekRequest.time);
    runtime.lastFrameAt = performance.now();
    const currentPasses = passesRef.current;
    const compiledPasses = currentPasses
      .map((pass): CompiledPipelinePass | null => {
        const program = runtime.programs.get(pass.id);
        return program ? { ...pass, program } : null;
      })
      .filter((pass) => pass !== null);
    if (compiledPasses.length === currentPasses.length) {
      resizeCanvas(canvas, runtime.gl);
      renderPassPipelineFrame(runtime.gl, runtime.buffer, compiledPasses, runtime.targets, {
        time: runtime.time,
        timeDelta: 0,
        frame: runtime.frame++,
        mouse: runtime.mouse,
        drag: runtime.drag,
        scroll: runtime.scroll,
      });
    }
    onPlaybackTimeChangeRef.current(runtime.time);
  }, [seekRequest.request, seekRequest.time]);

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const x = (event.clientX - rect.left) * scale;
    const y = (rect.bottom - event.clientY) * scale;
    runtime.mouse = [x, y];
    if (runtime.dragOrigin) runtime.drag = [x - runtime.dragOrigin[0], y - runtime.dragOrigin[1]];
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
      {paused && <div className="canvas-message">Paused</div>}
      {contextLost && <div className="canvas-message">Graphics context lost — restoring…</div>}
    </div>
  );
}
