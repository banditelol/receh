# receh V1 product plan

Status: active  
Last updated: 2026-08-23

## V1 outcome

V1 is a local-first, mobile-friendly shader editor that lets someone create, edit, tune, save,
restore, share, and export GLSL fragment shaders without an account. It should feel intentional on
phones while retaining a productive split workspace on larger screens.

V1 remains a browser-first React and WebGL2 product written in strict TypeScript. Accounts,
publishing, community features, WebGPU, native app shells, and advanced media inputs are post-V1
unless real-device validation uncovers a blocking need.

## What is prepared

### Application foundation

- VitePlus, React, and strict TypeScript project with formatting, linting, type checking, Vitest,
  production builds, and Playwright browser verification.
- Installable PWA manifest and platform icons, with Android/browser install actions, iOS home-screen
  guidance, an offline shell containing the complete editor and SQLite runtime, and a protected
  update-ready reload flow.
- Development service fixed to `0.0.0.0:37005`, including the allowed
  `ishineko.banteng-ratio.ts.net` Tailscale hostname.
- Responsive desktop split workspace and dedicated phone Preview/Code navigation.
- Safe-area-aware controls, 44-pixel phone targets, visual viewport keyboard sizing, reduced-motion
  handling, and accessible status/error regions.

### Editing and rendering

- CodeMirror 6 GLSL ES 3.00 editing with configurable locally bundled monospace fonts, four complete
  syntax themes, adjustable density and wrapping, and `Cmd+Enter`/`Ctrl+Enter` compilation.
- Source-aware local completions for built-ins, snippets, receh uniforms, declared symbols,
  qualifier contexts, and swizzles, plus source Find and an offline fuzzy reference for 62 common
  GLSL ES functions with signatures, descriptions, examples, desktop hover, and phone cursor help.
- Dedicated phone Focus and live-preview Overlay code presentations with a device-local default.
- Raw WebGL2 full-screen triangle renderer with `u_resolution`, `u_time`, `u_time_delta`, `u_frame`,
  `u_mouse`, `u_drag`, and `u_scroll`, plus ordered framebuffer-backed fragment passes that expose
  the immediate `u_previous` texture and every earlier output as `u_pass0`, `u_pass1`, and onward.
- Pass management covers add, rename, delete, reorder, active navigation, and full-, half-, or
  quarter-resolution intermediate targets. The final pass always renders at output resolution,
  and framebuffer targets are reused, resized, and disposed deterministically.
- Parsed live controls for custom float, int, bool, vector, and color uniforms. Color controls keep a
  visual picker, Hex, RGB, and HSL entry synchronized, while numeric `@range` and `@default`
  annotations customize sliders without introducing a separate shader format.
- Per-pass uniform values update the live preview and media exports without recompiling, persist in
  portable projects and SQLite backups, reset to source annotations, and can be explicitly baked
  into GLSL constants after a recovery snapshot.
- Debounced automatic compilation plus explicit `Cmd`/`Ctrl` + `Enter`, with preview playback and
  time scrubbing kept separate from compilation.
- Parsed compiler diagnostics that navigate back to the affected source line.
- Last-good-program rendering when a new shader fails, context-loss messaging, pause/resume, reset,
  pointer interaction, and a device-pixel-ratio cap.

### Document and local state

- Framework-neutral, versioned `ShaderDocument` model in TypeScript.
- Immutable active-pass updates, runtime schema repair, and migration from the original source-only
  local draft.
- A platform-neutral asynchronous repository contract, SQLite schema, and migration boundary ready
  for a later Expo SQLite React Native adapter.
- SQLite WASM storage in a dedicated worker, with an OPFS-backed multi-project library, debounced
  saves, explicit durability states, and one-time migration from the previous localStorage draft.
- Browser quota monitoring in the library reports current origin usage and turns into a visible
  backup warning near storage pressure.
- SHA-256-deduplicated recovery snapshots after 30 quiet seconds and before protected actions, with
  a 50-snapshot per-project retention limit and visible restore history.
- Versioned multi-pass documents preserve pass order, active selection, source, tuned uniforms, and
  intermediate resolution through project files, SQLite storage, library backups, and snapshots.

### Portable files and media

- Complete `.receh.json` project download.
- Active `.frag` GLSL source download.
- Validated `.receh.json` and `.frag` project import that creates safe new local projects.
- Consistent whole-library SQLite export and merge import with application/schema validation and
  collision-safe project, pass, and snapshot ID remapping.
- 1080 × 1080 PNG rendering through the same ordered WebGL2 pass pipeline as the live preview.
- Duration-controlled Instagram Story export from 1–60 seconds as a 1080 × 1920 H.264 MP4.
- Constant 30 FPS encoding on secure WebCodecs-capable origins and a target-30 variable-frame-rate
  compatibility path for plain-HTTP Tailscale sessions.
- Export capability checks, progress, cancellation, invalid-shader guards, and lazy media-encoder
  loading.

### Current quality baseline

- Formatting, linting, and strict TypeScript checks pass.
- Eighty unit tests cover diagnostics, document migration/update, ordered pass execution and
  framebuffer lifecycle, import validation, storage,
  snapshot hashing, downloads, Story timeline calculations, editor preference repair, GLSL catalog
  search, source-symbol/reference context, uniform parsing/baking, synchronized color conversion,
  storage-pressure classification, and service-worker generation.
- Desktop and iPhone-profile browser flows have been exercised with no application console errors.
- Generated SQLite, PNG, project, GLSL, and H.264 MP4 files have been inspected outside the browser.

## V1 scope and status

| Product capability                 | Status   | V1 requirement                                      |
| ---------------------------------- | -------- | --------------------------------------------------- |
| Single-pass create/edit/run loop   | Prepared | Harden on real phones                               |
| Mobile and desktop workspaces      | Prepared | Add remaining device coverage                       |
| Browser auto-save                  | Prepared | Harden storage pressure and failure recovery        |
| Portable local backup              | Prepared | Harden real-device import/share flows               |
| Source diagnostics and completions | Prepared | Harden rapid edits on real phones                   |
| PNG and Story MP4 export           | Prepared | Test real-device encoding, memory, and cancellation |
| Shareable shader URL               | Prepared | Harden physical-device deep links                   |
| Named snapshots/history            | Prepared | Harden backup/restore on real phones                |
| Parsed uniform tuner               | Prepared | Harden on real phones                               |
| Ordered fragment passes            | Prepared | Harden three-pass flows on real phones              |
| Installable/offline PWA            | Prepared | Harden installation on real devices                 |
| Accounts and cloud publishing      | Deferred | Post-V1                                             |
| WebGPU and alternate languages     | Deferred | Post-V1                                             |
| Community, tutorials, marketplace  | Deferred | Post-V1                                             |

## Product TODO

- [ ] **Extract reusable GLSL functions into a separate file-like view.** Add a Common or Functions
      editor alongside the active fragment pass, then compose that source into each shader without
      forcing authors to duplicate helpers.
- [ ] **Accept custom buffers and texture/data inputs.** This is related to, but not the same as,
      multipass rendering: multipass creates intermediate framebuffer textures from earlier shader
      passes, while custom inputs provide external or user-authored data. Reuse the same texture
      binding, validation, lifetime, and export boundaries where the two capabilities overlap.
- [ ] **Add optional filesystem-backed local project management.** The browser library already
      stores multiple shaders in SQLite/OPFS; add a user-selected workspace directory for explicit
      files, durable persistence, and editing or backup outside receh where the File System Access
      API is available.

## V1 debt and follow-up features

Use the shared names in [the product glossary](./glossary.md) when turning these items into design
or implementation checkpoints.

### Interface debt

- [ ] **Make topbar collapse and restore placement unambiguous.** Keep the collapse control at the
      right edge of the expanded topbar and place the restore control at the left edge after the
      topbar is collapsed. Verify both Preview and Code views, including safe areas and fullscreen
      transitions on phones.
- [ ] **Hide playback controls in fullscreen.** The playback toolbar currently occludes part of the
      viewport in fullscreen. Hide the entire toolbar, including its collapsed affordance and
      Live/error indicator, while fullscreen is active; exiting fullscreen restores its previous
      expanded or collapsed state.
- [x] **Preserve the viewport aspect ratio in preview thumbnails.** Floating and Uniform Tuner
      thumbnails must derive their aspect ratio from the current viewport instead of using a fixed
      box. Fit the complete rendered viewport without cropping or stretching, and recompute the
      thumbnail when the viewport, orientation, or floating-window size changes. Prepared with
      renderer-reported Viewport metrics and width-driven thumbnail resizing.

### New features

- [ ] **Add document undo and redo, preferably as an undo tree.** Cover source edits, pass changes,
      project functions, and tuned values without conflating short-term editing history with named
      recovery snapshots. A tree should preserve abandoned branches after undo followed by a new
      edit, expose a comprehensible branch-selection UI, and define retention and persistence
      limits before implementation. A linear undo/redo stack is an acceptable first checkpoint if
      the document boundary remains upgradeable to a tree.
- [ ] **Optionally retain revision history from project creation.** Let users opt into keeping the
      complete project revision lineage rather than only rolling recovery history. Provide explicit
      **New project** and **Import project** entry actions because both establish a new lineage root;
      define how imports, duplicates, restores, and library merges preserve or fork that lineage.
      Keep this setting local-first and communicate its storage cost before enabling it.

- [ ] **Inspect the current shader state.** Show the effective value of every custom uniform and
      the current built-in runtime values, then let the user enter an `x,y` coordinate to inspect
      the final pixel returned by the composed pass pipeline at that `gl_FragCoord`. This should be
      an explicit, on-demand inspection action rather than a readback on every animation frame.

- [ ] **Create a compile-driven project timelapse.** When the complete current project compiles
      successfully, retain a durable compile checkpoint and enough preview metadata to show how
      the Project changed. Export the ordered checkpoints as a configurable history segment followed
      by a configurable final-result hold. Recovery Snapshots remain a separate concern.

## Proposed shader inspection, aspect-correct thumbnails, and compile timelapse

This section is a feasibility and implementation path only. It does not authorize or describe an
implementation in this checkpoint.

### Feasibility at a glance

| Capability                                                  | Feasibility                              | Main risk or decision                                                                                                      |
| ----------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Uniform values and pixel inspection                         | High for effective values and final RGBA | GPU readback can stall the render loop; coordinate and pass semantics must be explicit.                                    |
| Aspect-correct Floating preview and Tuner preview thumbnail | High                                     | The current resizable box needs to be driven by the actual Viewport aspect ratio, not independent fixed width and height.  |
| Retained successful-compile lineage                         | Medium-high                              | It needs a durable event/content model, storage limits, and an atomic definition of “successful project compile.”          |
| Configurable compile timelapse export                       | Medium-high after lineage exists         | Rendering many historical documents is GPU- and memory-intensive, especially when the final video is portrait 1080 × 1920. |

### Uniform values and `gl_FragCoord` output

The Uniform Tuner already resolves typed custom values per Fragment pass and the renderer already
binds built-ins such as `u_resolution`, `u_time`, `u_time_delta`, `u_frame`, `u_mouse`, `u_drag`,
and `u_scroll`. The inspection feature should expose one immutable runtime inspection record for
the currently displayed Project, including:

- custom uniform names, types, and effective values after source defaults, annotations, and stored
  values have been resolved;
- built-in values for the current frame, including the actual render target resolution and playback
  time; and
- the active Fragment pass plus the available `u_previous`, `u_pass0`, and later pass inputs.

The pixel action should be called a **Pixel probe** and should define its coordinate contract before
the UI is built:

1. Treat `x` and `y` as zero-based pixel indices in the selected output Viewport. Use the pixel
   center (`x + 0.5`, `y + 0.5`) for the shader-space sample. If the UI uses a top-left origin,
   convert its `y` to WebGL's bottom-left coordinate before reporting the result.
2. Preserve the real target dimensions while probing. A 1 × 1 render changes `u_resolution` and
   can change branches in the shader, so the preferred path is to render the full composed pipeline
   into an offscreen target at the current resolution and call `readPixels` for the chosen pixel.
3. Return the final RGBA value in a useful representation such as normalized channels, 8-bit
   channels, and Hex. A later extension may probe an intermediate pass, but it must identify that
   pass and its own render resolution clearly.
4. Make the action explicit or throttled. WebGL `readPixels` is synchronous on common browsers and
   can cause a visible stall if performed every frame. The live canvas does not currently preserve
   its default framebuffer, so readback should be owned by the renderer or use a dedicated probe
   target rather than relying on whatever remains in the visible canvas.

This reports what the current GPU pipeline outputs; it does not promise algebraic evaluation of an
arbitrary GLSL expression. Evaluating a local variable or explaining why a pixel has a value would
require shader instrumentation and a separate debug compiler path. The existing renderer is already
the correct execution authority for the final color, including ordered passes and tuned uniforms.
The likely code boundary is a renderer callback that snapshots the live runtime values and performs
an on-demand probe without changing the visible playback time or the Last-good program.

Acceptance criteria:

- the displayed values match the values actually bound for the current Project and Fragment pass;
- a known shader can be checked at corner and center coordinates with a documented origin;
- the reported output matches a reference `readPixels` result for single- and multi-pass shaders;
- probing a failed compile continues to use the Last-good program and reports that state; and
- probing does not add a per-frame GPU readback or alter playback, pointer, or document state.

### Thumbnail aspect-ratio path

The current Floating preview and Tuner preview thumbnail are live `ShaderCanvas` surfaces placed in
resizable UI boxes. The existing layout uses independently clamped width and height values, so the
box can have a different ratio from the rendered Viewport. That is the source of the current
stretching/cropping risk.

The recommended path is:

1. Make `ShaderCanvas` report `ViewportMetrics` whenever its `ResizeObserver`-measured CSS size,
   drawing-buffer size, or device-pixel-ratio changes. The record should contain CSS width, CSS
   height, pixel width, pixel height, and `aspectRatio`.
2. Treat those measured metrics as the source of truth. Do not duplicate aspect-ratio math in
   Floating preview, the Uniform Tuner, and export panels. If a future fixed output aspect ratio is
   introduced, make that an explicit render setting rather than silently overriding the Viewport.
3. Give the thumbnail container an `aspect-ratio` derived from the current Viewport and let one
   dimension follow the available space. For a freely resizable window, constrain the resize
   result to that ratio. If the surrounding layout cannot match it, contain the rendered surface
   with letterboxing; never use a cover/crop rule or stretch the canvas.
4. Recompute on Preview pane resize, orientation changes, Floating-window resize, Tuner open/close,
   and device-pixel-ratio changes. Keep the renderer's drawing-buffer resize and the CSS layout
   update in one measured path so a thumbnail does not briefly display stale dimensions.
5. Verify a non-square Viewport on desktop and phone layouts, including Floating and Tuner modes,
   keyboard/rotation changes, and manual resize. Browser screenshots should prove that the complete
   Viewport remains visible without distortion.

This is a small, low-risk UI/renderer boundary change and does not require a document migration.
The product decision still needed is whether “current aspect ratio” means the live Preview pane's
measured ratio (recommended for V1) or a future user-selected export ratio.

### Successful-compile history and timelapse path

The existing Snapshots are recovery copies: they are content-hash deduplicated, created after idle
editing or before protected actions, and subject to the rolling 50-unpinned retention policy. They
should not be the only storage for a compile timelapse. Reusing them alone would lose repeated
successful compiles of identical content, mix recovery semantics with visual history, and allow
retention trimming to remove part of a timelapse.

Use two related but distinct records:

- a deduplicated historical Shader document body, which can reuse the canonical document JSON and
  content hash; and
- an ordered **Compile checkpoint** event containing Project ID, lineage ID, sequence, timestamp,
  document hash, compile metadata, and optional low-resolution preview metadata.

Record one checkpoint only after every required pass in the current compile plan succeeds, the
compile ticket still owns the current Project and source revisions, and the resulting pipeline is
the one being displayed. Failed, stale, cancelled, and superseded Compile requests must not create
checkpoints. This prevents a delayed success from adding a false frame to the history.

The checkpoint must represent the complete Shader document, not only the active source: ordered
passes, Project functions, tuned values, intermediate Render resolution, active pass, and any other
state required to reconstruct the render plan. Pure Uniform Tuner changes currently update the
preview without recompiling. Decide explicitly whether they are excluded from compile history (the
literal “successful compilation” interpretation) or recorded as separate user-requested render
checkpoints when the goal is to capture tuning activity too.

For storage, add a project-revision/checkpoint table or an equivalent repository boundary rather
than overloading the existing Snapshot retention rules. A practical schema can reference a
deduplicated document body by hash and keep the event's sequence and timestamp separately. Add
configurable maximum checkpoint count/bytes, visible storage estimates, and pinning before enabling
“retain from project creation.” A project created from New project or Import project starts a new
lineage root; duplicate, restore, and library merge behavior must be specified in the same way as
the existing Project and Snapshot identity rules.

For visual fidelity, capture a small preview at checkpoint time for a responsive timeline UI, but
keep the canonical document and render metadata as the source of truth. The final export can either
reuse those previews for speed or re-render each checkpoint at the requested output resolution. A
deterministic sample time is required: the recommended default is `u_time = 0` for a “what changed
when it compiled” state timelapse. An optional live mode may advance `u_time` while each historical
checkpoint is active, but it costs more and makes two exports of an animated shader less visually
identical.

The existing `createExportRenderer` and Story video encoder are reusable after they accept a
timeline instead of one static Shader pipeline. The export path should:

1. load the selected checkpoint documents in sequence and validate them with the current document
   migration path;
2. compile or cache a render plan per unique document hash, using the same ordered pass pipeline as
   live preview and PNG export;
3. map each output frame to a checkpoint using either evenly distributed intervals or normalized
   compile-event timing, with a minimum display interval so a burst of edits is still visible;
4. render a fixed sample frame or an optional animated frame, then encode through the existing
   30-FPS WebCodecs/MediaRecorder paths; and
5. show progress, cancellation, memory pressure, and a clear failure when a historical document no
   longer compiles under the current renderer.

Do not interpolate GLSL source between checkpoints. The safe default is a hard cut when the active
checkpoint changes. A later compositor can crossfade rendered frames or thumbnails, but that is a
visual transition between results, not shader interpolation.

For the requested durations, model the settings as separate values:

```text
historyDurationSeconds   = 10   # ordered successful checkpoints
finalHoldDurationSeconds = 20   # final successful result
totalDurationSeconds     = 30   # derived total
```

This makes “a 10-second timelapse and a 20-second final result” unambiguous. If the intended output
is 20 seconds total with the first 10 seconds showing history, set the final hold to 10 seconds or
offer a fixed-total mode that derives the hold. The UI should preview the resulting total and explain
how checkpoints are distributed when there are fewer or more checkpoints than output seconds.

Suggested delivery order:

1. Land the aspect-ratio contract and browser coverage; it is independent and low risk.
2. Add the runtime inspection record and on-demand Pixel probe, with renderer-level tests for
   coordinate conversion and single-/multi-pass output.
3. Add schema migration and repository APIs for Compile checkpoints, including lineage roots,
   deduplication, retention, backup/import policy, and recovery behavior.
4. Add a history viewer with checkpoint thumbnails and a deterministic “render this revision” action.
5. Extend the existing Story export with the configurable history/final-hold timeline, then test
   10/20-second settings, cancellation, low-memory devices, and a project with many checkpoints.

Overall, the thumbnail and Pixel probe features are feasible within the current browser architecture.
Compile lineage is also feasible, but it should be designed as a new durable storage concept before
the timelapse UI is built. The export is the largest piece because it must replay historical
documents safely and predictably; it should follow, rather than precede, the checkpoint schema.

## Recommended next phase

Finish the browser V1 before starting a React Native shell. The repository boundary, portable
SQLite library, and versioned document model are already the right preparation for native work;
starting the native client now would duplicate editor, renderer, storage, and recovery hardening
before those behaviors are stable.

Use this implementation order:

1. **Shareable single-pass documents.** This is the smallest remaining user-facing V1 gap and
   exercises serialization, validation, migration, and safe import without adding a server. Define
   the payload limits and failure behavior before multi-pass documents make shared payloads larger.
   Prepared with Unicode titles and active-pass metadata while continuing to open existing
   source-only links.
2. **Named snapshots and history.** Promote the existing automatic recovery snapshots into a user
   workflow with optional names, clear automatic/manual labels, pinning or retention protection,
   preview metadata, and guarded restore. Reuse the current snapshot storage rather than building a
   second history system. Prepared in the browser with optional names, retention protection,
   source metadata, automatic/manual labels, and guarded restore.
3. **Revision-safe compile scheduling.** Ensure delayed compile results can never replace a newer
   source revision, and add focused tests for rapid edits, project switches, pass switches, and
   stale diagnostics. Complete this reliability boundary before one document can run several
   passes concurrently. Prepared with document/pass/revision tickets and owner-scoped last-good
   programs.
4. **Ordered fragment passes.** Add framebuffer-backed pass execution and pass management only
   after sharing, restoration, and compilation have stable version/revision semantics. Keep common
   source and texture/media inputs out of the first multi-pass slice unless they are required by a
   concrete three-pass fixture. Prepared with previous/indexed pass textures, configurable
   intermediate resolution, guarded management, complete local persistence, and matching live,
   PNG, and Story render paths.
5. **Physical-device release gate.** Run a small real-device smoke matrix after each checkpoint,
   then complete the installation, accessibility, offline, thermal, memory, and media-export matrix
   after multi-pass is stable.

The immediate checkpoint is the physical-device release gate. Physical iOS Safari and Android
Chrome deep-link behavior remains part of that gate. Large documents continue to use project or
SQLite export.

## What to do next

### 1. Durable local documents and recovery

Status: prepared in the browser; storage-pressure and real-device hardening remain in section 7.

- Add an asynchronous, versioned repository backed on the web by SQLite WASM and OPFS. Keep the
  schema, migrations, and repository contract platform-neutral so a later React Native client can
  use the same database through Expo SQLite. Keep small device-specific UI preferences in
  localStorage.
- Store multiple shader projects, their ordered passes, and recovery snapshots in one portable
  `receh.sqlite3` library.
- Import `.receh.json` and `.frag` files with validation, migration, duplicate handling, and a
  recovery copy before destructive replacement.
- Export and import a consistent whole-library SQLite backup for moving work between machines;
  merge by default and reserve whole-library replacement for an explicit recovery action.
- Add visible save states: saving, saved, storage unavailable, and recovery needed.
- Snapshot after a quiet editing period and before reset, import, pass deletion, or schema migration.
- Use content hashes to deduplicate unchanged snapshots. Retain the latest 50 unique snapshots per
  project and create an idle snapshot after 30 seconds without edits.

Use UUIDs for portable entity identities. Single-project imports create new local projects and
receive new IDs on collisions. Whole-library imports merge by default and also remap colliding IDs.
If V1 later requires a server-side relational database, use SQLite with Drizzle rather than
introducing a different server database layer.

### 2. Shareable single-pass documents

Status: prepared in the browser with a V2 title/pass/source envelope and backward-compatible V1
source links; physical iOS Safari and Android Chrome deep-link checks remain in section 7.

- Define a compact, versioned URL payload containing title, active pass, and source.
- Compress and URL-safe encode small projects with explicit maximum-size handling.
- Restore shared documents as unsaved local copies rather than silently replacing the current
  draft.
- Add copy/share-sheet actions and test deep links on iOS Safari and Android Chrome.
- Keep large projects on the local export path until cloud publishing exists.

### 3. Named snapshots and history

Status: prepared in the browser; physical-device backup and restore hardening remain in section 7.

- Reuse content-hash-deduplicated recovery rows for both automatic and manual history.
- Allow optional manual names and promote an identical automatic snapshot rather than duplicating
  its stored document.
- Clearly identify automatic reasons and manual save points with source line, size, and pass
  metadata.
- Allow snapshots to be protected from the rolling 50-entry unpinned retention window.
- Create a recovery copy before every confirmed restore and retain names and protection state in
  whole-library backups.

### 4. Uniform tuner

Status: prepared in the browser; real-device input and accessibility coverage remain in section 7.

- Parse declared float, int, bool, vector, and color uniforms into a typed model. Runtime-managed
  receh uniforms are intentionally excluded.
- Add a keyboard-safe Tune sheet on phones and a compact inspector on larger screens.
- Update runtime uniform values and still/video exports without moving the code cursor or
  recompiling the shader.
- Store values per pass in document schema V2 and SQLite schema V2, with automatic migration from
  V1 projects and libraries.
- Provide reset and explicit bake-to-source behavior so tuning never changes source implicitly.
- Use `// @range min max step @default value` for numeric metadata and `// @color #RRGGBB` (or
  `#RRGGBBAA`) for explicit color controls. Common color-like `vec3`/`vec4` names are inferred.

### 5. Revision-safe compile scheduling

Status: prepared in the browser; rapid-edit and project-switch hardening remains in section 7.

- Assign every compile request to a document, pass, and monotonically increasing source revision.
- Ignore delayed renderer results when the active project, pass, or source revision has moved on.
- Keep last-good programs and diagnostics scoped to their owning pass.
- Add focused coverage for rapid edits, project switches, pass switches, and stale failures before
  several passes can compile concurrently.

### 6. Ordered fragment passes

Status: prepared in the browser; three-pass thermal, memory, and interaction hardening remains in
section 7.

- Execute ordered fragment passes through reusable framebuffer textures, while keeping the planned
  Common/functions editor as a separate follow-up instead of coupling it to the first multi-pass
  slice. Prepared.
- Add immediate and indexed previous-pass textures, configurable intermediate resolution, and
  deterministic framebuffer disposal. Prepared.
- Implement add, rename, delete, reorder, and active-pass navigation with guarded destructive
  actions and automatic snapshots. Prepared.
- Verify a three-pass shader can be edited and reordered repeatedly without resource or frame leaks.
  Prepared in desktop and phone-profile Chrome; physical-device soak testing remains in section 7.

### 7. PWA and real-device hardening

Status: the browser PWA and storage-pressure baseline are prepared. The remaining work requires
physical iPhone and Android validation.

- Add the web manifest, platform/maskable icons, install guidance, build-generated versioned service
  worker, complete offline shell, explicit update prompt, and storage-pressure handling. Prepared.
- Keep production navigation responses configured with the existing cross-origin opener/embedder
  headers so SQLite OPFS remains available online and from the cached shell.
- Test native selection, paste, undo/redo, IME composition, external keyboards, VoiceOver, TalkBack,
  orientation changes, and keyboard-open layouts.
- Run 30-minute thermal/memory sessions on at least one current iPhone and Android device.
- Test PNG and Story exports at 1, 15, and 60 seconds, including cancellation and low-memory failure.
- Confirm page zoom, focus order, touch targets, reduced motion, and nonvisual compile status.

## V1 release criteria

V1 is ready when all of the following are true:

- A new user can create, edit, compile, tune, save, close, restore, share, and export a shader on the
  supported phone matrix without an account.
- A broken edit never destroys the last working preview or the last recoverable document state.
- Three ordered fragment passes can run, reorder, snapshot, restore, and export without leaked GPU
  resources.
- Uniform tuning does not alter source or trigger compilation until explicitly committed.
- Local project and source files round-trip through import/export without schema or source loss.
- Share URLs open as safe local copies and fail clearly when a payload is unsupported or too large.
- The installed PWA opens the last document offline and reports when an update is ready.
- Required actions remain reachable with one hand on phones and with a hardware keyboard on all
  layouts.
- The required checks, unit tests, production build, browser flows, accessibility smoke tests, and
  real-device thermal/media tests pass with results recorded in the changelog or release notes.

## Explicitly after V1

- Accounts, cloud synchronization, collaboration, comments, profiles, and public publishing.
- Supabase or another hosted backend; if a lightweight relational service is needed first, prefer
  SQLite with Drizzle.
- WebGPU, WGSL, HLSL, Slang, compute passes, and automatic language conversion.
- Webcam, audio, screen, keyboard, and uploaded texture inputs.
- Advanced profiling, heatmaps, expression inspection, tutorials, marketplace, and monetization.
- Expo/React Native packaging until the browser V1 is proven on real devices.
