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
  `u_mouse`, `u_drag`, and `u_scroll`.
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
- A pass-shaped document structure ready for multi-pass expansion, while the renderer remains
  single-pass today.

### Portable files and media

- Complete `.receh.json` project download.
- Active `.frag` GLSL source download.
- Validated `.receh.json` and `.frag` project import that creates safe new local projects.
- Consistent whole-library SQLite export and merge import with application/schema validation and
  collision-safe project, pass, and snapshot ID remapping.
- 1080 × 1080 PNG rendering through the shared WebGL2 runtime.
- Duration-controlled Instagram Story export from 1–60 seconds as a 1080 × 1920 H.264 MP4.
- Constant 30 FPS encoding on secure WebCodecs-capable origins and a target-30 variable-frame-rate
  compatibility path for plain-HTTP Tailscale sessions.
- Export capability checks, progress, cancellation, invalid-shader guards, and lazy media-encoder
  loading.

### Current quality baseline

- Formatting, linting, and strict TypeScript checks pass.
- Sixty-six unit tests cover diagnostics, document migration/update, import validation, storage,
  snapshot hashing, downloads, Story timeline calculations, editor preference repair, GLSL catalog
  search, source-symbol/reference context, uniform parsing/baking, synchronized color conversion,
  storage-pressure classification, and service-worker generation.
- Desktop and iPhone-profile browser flows have been exercised with no application console errors.
- Generated SQLite, PNG, project, GLSL, and H.264 MP4 files have been inspected outside the browser.

## V1 scope and status

| Product capability                 | Status            | V1 requirement                                      |
| ---------------------------------- | ----------------- | --------------------------------------------------- |
| Single-pass create/edit/run loop   | Prepared          | Harden on real phones                               |
| Mobile and desktop workspaces      | Prepared          | Add remaining device coverage                       |
| Browser auto-save                  | Prepared          | Harden storage pressure and failure recovery        |
| Portable local backup              | Prepared          | Harden real-device import/share flows               |
| Source diagnostics and completions | Prepared baseline | Add revision-safe async compile scheduling          |
| PNG and Story MP4 export           | Prepared          | Test real-device encoding, memory, and cancellation |
| Shareable shader URL               | Prepared baseline | Add title/pass envelope and physical-device checks  |
| Named snapshots/history            | Prepared          | Harden backup/restore on real phones                |
| Parsed uniform tuner               | Prepared          | Harden on real phones                               |
| Ordered fragment passes            | Not started       | Required for V1                                     |
| Installable/offline PWA            | Prepared          | Harden installation on real devices                 |
| Accounts and cloud publishing      | Deferred          | Post-V1                                             |
| WebGPU and alternate languages     | Deferred          | Post-V1                                             |
| Community, tutorials, marketplace  | Deferred          | Post-V1                                             |

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

## Recommended next phase

Finish the browser V1 before starting a React Native shell. The repository boundary, portable
SQLite library, and versioned document model are already the right preparation for native work;
starting the native client now would duplicate editor, renderer, storage, and recovery hardening
before those behaviors are stable.

Use this implementation order:

1. **Shareable single-pass documents.** This is the smallest remaining user-facing V1 gap and
   exercises serialization, validation, migration, and safe import without adding a server. Define
   the payload limits and failure behavior before multi-pass documents make shared payloads larger.
   Source-only links are prepared; the remaining slice must carry Unicode titles and active-pass
   metadata while continuing to open existing links.
2. **Named snapshots and history.** Promote the existing automatic recovery snapshots into a user
   workflow with optional names, clear automatic/manual labels, pinning or retention protection,
   preview metadata, and guarded restore. Reuse the current snapshot storage rather than building a
   second history system. Prepared in the browser with optional names, retention protection,
   source metadata, automatic/manual labels, and guarded restore.
3. **Revision-safe compile scheduling.** Ensure delayed compile results can never replace a newer
   source revision, and add focused tests for rapid edits, project switches, pass switches, and
   stale diagnostics. Complete this reliability boundary before one document can run several
   passes concurrently.
4. **Ordered fragment passes.** Add framebuffer-backed pass execution and pass management only
   after sharing, restoration, and compilation have stable version/revision semantics. Keep common
   source and texture/media inputs out of the first multi-pass slice unless they are required by a
   concrete three-pass fixture.
5. **Physical-device release gate.** Run a small real-device smoke matrix after each checkpoint,
   then complete the installation, accessibility, offline, thermal, memory, and media-export matrix
   after multi-pass is stable.

The immediate checkpoint should finish the shared-document envelope by adding Unicode titles and
active-pass metadata without breaking existing source-only links. After that, revision-safe compile
scheduling is the next reliability boundary. Physical iOS Safari and Android Chrome deep-link
behavior remains part of the release gate. Large documents continue to use project or SQLite
export.

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

Status: source-only links, compression, size limits, copy/native sharing, and safe local import are
prepared. Unicode title and active-pass metadata remain the next implementation checkpoint.

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

- Assign every compile request to a document, pass, and monotonically increasing source revision.
- Ignore delayed renderer results when the active project, pass, or source revision has moved on.
- Keep last-good programs and diagnostics scoped to their owning pass.
- Add focused coverage for rapid edits, project switches, pass switches, and stale failures before
  several passes can compile concurrently.

### 6. Ordered fragment passes

- Extend the renderer from one active pass to common source plus ordered fragment passes.
- Add previous-pass textures, configurable resolution, and deterministic framebuffer disposal.
- Implement add, rename, delete, reorder, and active-pass navigation with guarded destructive
  actions and automatic snapshots.
- Verify a three-pass shader can be edited and reordered repeatedly without resource or frame leaks.

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
