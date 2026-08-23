# Internal fragment-shader processing

This document explains how receh turns authored GLSL into a live WebGL2 frame. It focuses on the
current implementation, not a proposed compiler rewrite.

## 1. Authoring data enters through the Shader document

The active project is a versioned `ShaderDocument` from
[`src/document/shaderDocument.ts`](src/document/shaderDocument.ts). A document owns:

- project metadata and `schemaVersion`;
- `functionsSource` for Project functions;
- an ordered, non-empty `passes` array;
- the `activePassId`;
- per-pass source, `uniformValues`, and `resolutionScale`.

Global functions are held separately by `useShaderLibrary` because they belong to the Local
library rather than one portable Project.

Document edits use immutable helpers such as `updateActivePassSource`,
`updateProjectFunctionsSource`, `addFragmentPass`, `moveFragmentPass`, and
`updateActivePassUniformValue`. React receives the new object and derives the renderer input from
it.

## 2. Each pass becomes composed shader source

`App` maps every document pass into a `ShaderPipelinePass` in a `useMemo` block:

```text
for each pass:
  definitions = parseTunableUniforms(pass.source)
  composed = composeShaderSource(
    pass.source,
    document.functionsSource,
    globalFunctionsSource,
  )
  render pass = {
    id,
    source: composed.source,
    lineOrigins: composed.lineOrigins,
    resolutionScale: pass.resolutionScale,
    uniforms: resolveRuntimeUniforms(definitions, pass.uniformValues),
  }
```

The result is not stored back into the document. It is a derived render plan.

### Source insertion order

`composeShaderSource()` uses the first function definition in the authored pass as an insertion
point. It preserves the pass lines before that point, appends Global functions, appends Project
functions, then appends the remaining pass lines.

For a pass like:

```glsl
#version 300 es
precision highp float;
uniform vec2 u_resolution;
out vec4 fragColor;

void main() { /* ... */ }
```

the generated order is:

```text
#version / precision / declarations
Global functions
Project functions
pass functions and main()
```

This keeps declarations before the injected functions and lets helper functions be visible to the
pass. Empty function sources add no lines.

### Line-origin table

Composition also emits one `ShaderLineOrigin` for every generated line:

```ts
{ view: "pass" | "project" | "global", line: number }
```

The table is indexed by generated line minus one. It is the bridge between compiler output and the
editor's authored Source scope. It does not rewrite source or alter the browser's raw compiler log.

## 3. Tunable uniforms are parsed separately from compilation

`parseTunableUniforms()` scans the authored pass source with a line-oriented regular expression.
It recognizes float, int, bool, vector, and boolean-vector declarations with optional precision.

The following runtime names are reserved and skipped:

```text
u_resolution, u_time, u_time_delta, u_frame,
u_mouse, u_drag, u_scroll
```

Custom controls get a default/range from source comments:

```glsl
uniform float u_intensity; // @range 0.2 2.0 0.01 @default 1.0
uniform vec3 u_tint;       // @color #FFD0BF
```

The parser returns metadata including the GLSL type, component count, control kind, default value,
source offsets, and indentation. Stored values are validated and normalized by
`resolveUniformValue()`. `resolveRuntimeUniforms()` produces the values sent to WebGL.

The important distinction is:

```text
Tune change       -> document.uniformValues -> new runtime uniform values -> draw
Source change     -> document source -> composed source -> compile request -> new program
Bake into GLSL    -> snapshot -> replace uniform declaration with const -> compile normally
```

Tuning therefore does not change the text source or force compilation. Baking is the explicit
source-changing action and creates a recovery Snapshot first.

## 4. Source changes create a compile target

`App` creates a `compileFingerprint` from pass IDs and composed sources. A 450 ms timer increments
`compileRequest` after the fingerprint or document ID changes. This debounce is a request trigger,
not the correctness mechanism.

Inside `ShaderCanvas`, each pass gets a `CompileRevision`:

```text
{ documentId, passId, source, revision }
```

`advanceCompileRevision()` keeps the revision when the same owner and source are unchanged, and
increments it when the source or owner changes. Each pass also has a `CompileScheduler` that adds a
generation and validates a `CompileTicket` before a result is committed.

The ownership tuple is:

```text
document ID + pass ID + source revision + compile request/generation
```

This protects against delayed compile results after rapid typing, pass switching, project
switching, or unmounting.

## 5. WebGL program compilation

`createProgram()` in [`src/renderer/webgl.ts`](src/renderer/webgl.ts) performs these steps for one
pass:

1. Compile the fixed `#version 300 es` fullscreen-triangle vertex shader.
2. Compile the composed fragment source.
3. Create and link a WebGL program.
4. Delete the temporary vertex and fragment shader objects after linking.
5. Return either the linked `WebGLProgram` or the browser's info log.

The fixed vertex shader receives a fullscreen triangle from one static buffer:

```text
(-1,-1), (3,-1), (-1,3)
```

The oversized triangle covers the viewport without a separate index buffer or quad geometry.

`ShaderCanvas` compiles all current passes with `Promise.all`. Compilation is asynchronous from
the React effect's point of view, although the WebGL call itself is still performed on the browser
thread. A successful result replaces only the program for its pass. A failed result records a
`PassError` and leaves the previous program in the map.

## 6. Compiler diagnostics return to authored lines

`parseShaderDiagnostics()` understands the two observed browser log shapes:

```text
ERROR: 0:<line>: <message>
0(<line>) : error ...
```

The parsed generated line is passed through `mapComposedDiagnostics()` and the corresponding
`lineOrigins` entry. The result contains:

```ts
{ line: authoredLine, message, sourceView: "pass" | "project" | "global" }
```

`App` filters diagnostics to the currently open Source scope. When an error identifies a pass, it
activates that pass and opens the relevant scope. CodeMirror then maps each diagnostic to a line
lint marker, gutter marker, and optional inline disclosure widget.

If the browser returns no parseable line, the raw compiler log is retained and exposed through the
compiler-error disclosure instead of being discarded.

## 7. Last-good program behavior

The program map is keyed by pass ID. On a failed compile:

```text
new compile fails
  -> old program remains in runtime.programs
  -> error is stored in errorsRef
  -> complete pipeline can continue drawing with old program
  -> UI reports error and “last good frame” when every pass still has a program
```

When the document ID changes, `ShaderCanvas` deletes all programs and framebuffer targets, clears
errors, resets time/frame counters, and clears the preview until the new project compiles. This
owner boundary prevents recovery state from leaking across projects.

When a pass is deleted, its program and any target associated with that pass are removed during
the next runtime reconciliation. Unused compilation schedulers are invalidated.

## 8. Frame loop and runtime inputs

Once mounted, `ShaderCanvas` runs a continuous `requestAnimationFrame` loop. Each iteration:

1. Reads current props through refs so the loop does not restart for every React render.
2. Computes `timeDelta` from the prior frame.
3. Finds the current program for every ordered pass.
4. If every pass is compiled and playback is not paused, advances `runtime.time`.
5. Resizes the canvas to its CSS size multiplied by device pixel ratio, capped at 2.
6. Calls `renderPassPipelineFrame()`.
7. Reports playback time to React at most every 100 ms.

The runtime frame values are:

```ts
{
  time,
  timeDelta,
  frame,
  mouse: [x, y],
  drag: [dx, dy],
  scroll,
}
```

Pointer coordinates are measured against the canvas rectangle and converted to pixel coordinates
with the same device-pixel-ratio cap. Pointer-down records a drag origin; wheel events accumulate
scroll. The source shader reads these as reserved uniforms.

Playback seek does not compile. It updates `runtime.time`, renders one immediate frame at the
requested time, and reports the new time. A successful compile resets time and frame count to zero.

## 9. Ordered fragment-pass execution

`renderPassPipelineFrame()` executes passes in document order. The final pass always renders to the
onscreen canvas. Every earlier pass renders to a reusable framebuffer/texture target.

For each intermediate pass, `syncPipelineTargets()` calculates:

```text
target width  = floor(output canvas width  * resolutionScale)
target height = floor(output canvas height * resolutionScale)
```

The scale can be full (`1`), half (`0.5`), or quarter (`0.25`). The final pass is always output
resolution; its stored scale does not allocate an intermediate target.

After each intermediate pass, its color texture is appended to `inputTextures`. The next pass gets
the textures accumulated so far:

| Current pass | `u_pass0`      | `u_pass1`      | `u_previous`   |
| ------------ | -------------- | -------------- | -------------- |
| pass 0       | none           | none           | none           |
| pass 1       | pass 0 texture | none           | pass 0 texture |
| pass 2       | pass 0 texture | pass 1 texture | pass 1 texture |

`u_previous` is an alias for the immediate preceding pass in the current frame. It is not a
previous-frame feedback buffer. A custom feedback/history system would require a separate ping-pong
resource model.

Before drawing each pass, `renderShaderFrame()`:

1. binds the pass framebuffer or the default framebuffer;
2. sets the viewport to the target dimensions;
3. binds the program and fullscreen triangle;
4. sets built-in uniforms;
5. binds indexed pass textures and their sampler uniforms;
6. sets custom runtime uniforms with the appropriate scalar/vector WebGL call;
7. issues `gl.drawArrays(gl.TRIANGLES, 0, 3)`.

After the ordered loop, the default framebuffer is rebound.

The renderer checks `MAX_TEXTURE_IMAGE_UNITS` before execution. If the number of required inputs is
too high, the frame fails with a user-visible pipeline error rather than binding incomplete inputs.

## 10. Resource lifetime

Resources are owned and released at these boundaries:

| Resource                         | Created                    | Released                                           |
| -------------------------------- | -------------------------- | -------------------------------------------------- |
| WebGL context                    | `ShaderCanvas` mount       | component cleanup/browser context loss             |
| Fullscreen buffer                | context setup              | component cleanup                                  |
| Program                          | successful pass compile    | replacement, project switch, pass removal, cleanup |
| Intermediate framebuffer/texture | target sync or size change | target removal, resize, project switch, cleanup    |
| Export context/programs          | `createExportRenderer()`   | export renderer `dispose()`                        |
| Compile scheduler                | first pass revision        | pass removal, component cleanup                    |

The context-lost handler prevents the browser's default loss behavior and displays a recovery state.
The context-restored handler currently reloads the page, allowing the repository to restore the
active document and recreate GPU resources from scratch.

## 11. PNG and Story export use the same pass semantics

`createExportRenderer()` creates an offscreen canvas and WebGL2 context, compiles the exact
`ShaderPipelinePass[]`, and calls `renderPassPipelineFrame()`.

- PNG export renders one 1080 × 1080 frame and encodes it with `canvas.toBlob("image/png")`.
- Deterministic Story export renders a 1080 × 1920 frame timeline at 30 FPS through Mediabunny
  when available.
- The compatibility path uses `canvas.captureStream()` and `MediaRecorder` when the browser can
  produce the required MP4 MIME type.

This shared pipeline is important: live preview, still export, and video export agree on pass order,
resolution scaling, indexed textures, built-in uniforms, and custom uniforms.

## 12. Failure and recovery matrix

| Failure                         | Current behavior                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| WebGL2 unavailable              | Preview reports unsupported status                                                       |
| Fragment compile failure        | Diagnostics are mapped; last-good program remains when available                         |
| Stale compile result            | Scheduler rejects it and deletes any newly created stale program                         |
| Pipeline texture limit          | Frame reports a pass-capability error                                                    |
| Framebuffer allocation failure  | Frame loop records a render error; previous resources remain where possible              |
| Context lost                    | Visible recovery message; restored context triggers a reload                             |
| SQLite/OPFS unavailable         | Repository falls back to memory when it can initialize; UI marks persistence unavailable |
| Repository operation failure    | Save status becomes recovery-needed and the error is surfaced in the library/status UI   |
| Share payload invalid/too large | Import rejects it with a user-facing message and preserves the current project           |

## 13. Compact end-to-end trace

```text
authored pass source
  -> immutable ShaderDocument update
  -> Global + Project function composition
  -> line-origin table + resolved custom uniforms
  -> compile fingerprint and debounced request
  -> document/pass/revision guarded WebGL program compile
  -> program map retains prior success on failure
  -> ordered pass loop allocates/reuses intermediate targets
  -> u_passN / u_previous / built-in / custom uniforms
  -> fullscreen triangle draw
  -> final pass to the viewport
```
