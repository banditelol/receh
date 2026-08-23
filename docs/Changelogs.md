# Changelog

Meaningful repository changes are recorded here newest-first. Entries are grouped by logical work
area and may summarize one or more related commits.

## 2026-08-23

### Ordered fragment passes

- Added an ordered WebGL2 pass pipeline with reusable framebuffer textures, `u_previous` for the
  immediate input, indexed `u_pass0`, `u_pass1`, and later inputs, and full-, half-, or
  quarter-resolution intermediate targets. The final pass remains fixed at output resolution.
- Added responsive pass tabs and controls for add, rename, reorder, resolution, navigation, and
  guarded deletion, including an automatic recovery snapshot before removing a pass.
- Migrated portable documents to schema V3 and SQLite libraries to schema V4 so pass order,
  selection, source, tuned values, and resolution survive reloads, project/library transfer, and
  recovery restores.
- Routed live preview, 1080 × 1080 PNG, and Story MP4 rendering through the same complete pipeline;
  compilation remains revision-safe per pass and automatically opens the pass containing an error
  while the last-good pipeline continues rendering.
- Added coverage for document migration and pass operations, ordered texture binding, resolution,
  framebuffer reuse/resizing/disposal, and generated-name collisions. Verified a three-pass fixture,
  reordering, persistence, delete/restore, compile recovery, indexed input sampling, and PNG export
  at 1440 × 900 and 390 × 844 with no application console errors.

### Revision-safe shader compilation

- Scoped every compile request to its project, pass, monotonically increasing source revision, and
  explicit request generation so delayed successes or diagnostics cannot replace newer work.
- Cleared diagnostics as soon as the compile owner changes, retained last-good rendering only for
  edits to the same project/pass, and disposed and cleared programs when switching owners so a
  different project's frame is never presented as recovery.
- Added focused scheduling coverage for rapid edits, repeated explicit compiles, project switches,
  pass switches, unmount invalidation, and delayed stale diagnostics.
- Verified compile failure with a continuing same-pass last-good frame, project switching to a
  clean compile, and owner-scoped failure with a cleared preview at 1440 × 900 and no application
  console errors.

### Complete shared-document links

- Upgraded generated links to a compact V2 envelope that round-trips Unicode project titles,
  active-pass names, and GLSL source while keeping the explicit compressed URL size limits.
- Kept existing source-only V1 links readable with a safe compatibility title and pass name, and
  restored both formats through the same non-destructive new-project import path.
- Verified V2 generation and import, preservation of the existing local project, and V1 deep-link
  compatibility at 1440 × 900 with no application console errors.

### Named snapshot history

- Promoted recovery snapshots into a visible history workflow with optional manual names, clear
  automatic/manual labels, active-pass line and size metadata, and guarded restore that preserves
  the current edit first.
- Added per-snapshot retention protection outside the rolling 50 unpinned entries, while promoting
  identical automatic content into a named manual point instead of storing a duplicate.
- Migrated SQLite libraries to schema V3 for snapshot names and protection state, including
  backward-compatible V1/V2 library import and collision-safe transfer of the new metadata.
- Verified manual creation, Unicode naming, duplicate promotion, pin toggling, automatic
  pre-restore recovery, and restore at 1440 × 900 and 390 × 844 with no application console errors.

### Master VM preview sync

- Added a guarded VM sync script that fetches `origin/main`, fast-forwards only a clean local
  `main` checkout, and refreshes dependencies when a merged change updates the package manifest or
  lockfile. The master VM runs it once per minute and restarts the preview service after an update
  so remotely merged work reaches the deployed development preview without a manual pull.
- Added a persistent user service for the master VM development preview on `0.0.0.0:37005`, with
  automatic startup and restart so `ishineko:37005` remains available after merges and reboots.

### Compact mobile editing

- Positioned diagnostic navigation targets three editor lines below the top edge, preserving useful
  source context above each error while keeping the target visible in short keyboard-constrained
  editor viewports.
- Made the phone app header and the preview transport collapsible, with compact in-context reveal
  controls that keep the editor and live canvas available underneath.
- Added compact symbol-only restart and play/pause actions to the collapsible playback transport;
  restart seeks to `0:00` and resumes animation immediately.
- Replaced the automatically open compiler-error drawer with a compact error count in the editor
  header. Selecting it jumps to the first failure, while highlighted error line numbers reveal and
  dismiss their messages inline.
- Preserved raw compiler logs when a browser returns an error without a source line, and added
  focusable previous/next error controls plus F8 and Shift+F8 diagnostic navigation.
- Added regression coverage for diagnostic disclosure and navigation, playback restart/resume, and
  transport collapse state.
- Added focus-aware visual-viewport keyboard detection so the phone Preview/Code tabs and their
  safe-area padding disappear while typing, allowing the editor to meet the keyboard without an
  empty gap across both overlay- and resize-based mobile browser behavior.

### Persistent PWA installation

- Added a permanent install section to Config so the native install action or iOS Add to Home
  Screen guidance remains available after the startup prompt is dismissed.
- Made the startup dismissal explain where installation can be found later and kept its **Not now**
  action visible on phone layouts.

### Tuning, playback, and learning flow

- Replaced the hidden native color input with a responsive `react-colorful` saturation, hue, and
  alpha experience while retaining Hex and optional advanced RGB/HSL channel editing.
- Turned the preview footer into a clear transport with separated Tune, Play/Pause, and Fullscreen
  buttons, an explicit uniform-count badge, and a seekable shader-time timeline.
- Removed the redundant top Run action and the preview's drag instruction pill; automatic compile
  and the editor's explicit keyboard compile shortcut remain available.
- Added an in-app uniform guide covering runtime values, annotated custom controls, and the exact
  source transformation and recovery behavior of Bake into GLSL.
- Recorded planned Common/function source, custom input buffer, and filesystem-workspace work,
  including how custom inputs differ from multipass framebuffers.

### Fullscreen preview

- Added a preview-toolbar mode that expands the live shader across the entire viewport, uses the
  browser Fullscreen API when available, and retains a viewport-filling fallback with visible Exit
  and Escape controls on unsupported browsers.

### Install prompt dismissal

- Persisted the install prompt's **Not now** choice locally so it stays dismissed across the
  service worker's first-install reload and future visits, while retaining a session-only fallback
  when browser storage is blocked.

### GitHub Pages delivery

- Added a manually triggered VitePlus-based GitHub Actions workflow that checks, tests, builds, and
  deploys `main` once the repository is eligible for GitHub Pages. It remains manual while the
  current GitHub plan does not support Pages for this private repository, and defaults to a safe
  build-only validation unless its explicit deployment input is selected.
- Made browser assets, the web manifest, offline shell, and service-worker registration aware of
  the `/receh/` project path while preserving root-based local development.
- Added service-worker isolation headers and a controlled first-install reload so SQLite OPFS
  persistence remains available on a static GitHub Pages host.

### Portable share links

- Added versioned, URL-safe `code` query parameters that compress the active GLSL source directly
  into a link without uploading it to a server.
- Added native mobile sharing and clipboard/manual-copy fallbacks. Opening a shared link validates
  its size and encoding, imports it as a new local project, and preserves existing work.

## 2026-08-22

### Product naming

- Renamed the application to **receh**, a small, playful space for non-serious shader
  exploration. The app, install metadata, portable project downloads, library backups, and current
  product documentation use the new name; imports continue to accept legacy `.shaderpocket.json`
  files.

### Next-phase planning

- Recommended closing the browser V1 in a risk-ordered sequence: shareable documents, named
  snapshot history, revision-safe compilation, ordered passes, and final physical-device release
  validation, with React Native work remaining after the browser behavior is stable.

### Installable offline application

- Added a production web manifest, adaptive/maskable and Apple application icons, browser install
  actions, and iOS Add to Home Screen guidance in a phone-safe prompt.
- Added a build-generated, versioned service worker that precaches the complete editor shell,
  locally bundled docs and fonts, SQLite worker/WASM runtime, and platform assets for offline use.
- Added an explicit update-ready flow that leaves the active version running until the user chooses
  Reload, then removes superseded shell caches without touching OPFS projects.
- Added online/offline status messaging and browser storage estimates in the SQLite library, with a
  prominent backup warning at high quota use or low remaining space.
- Verified production service-worker control, manifest discovery, cache installation, full editor
  reload with the web server stopped, protected application update/reload, and retained SQLite
  access at desktop and iPhone-profile viewports.

### Parsed live uniform tuner

- Added typed controls for custom float, int, bool, vector, and color uniforms, with source comment
  metadata for numeric ranges/defaults and color defaults while excluding Shader Pocket's managed
  runtime uniforms.
- Added a compact desktop inspector and keyboard-safe phone Tune sheet. Color controls synchronize
  a visual picker with Hex, RGB, HSL, and optional alpha entry.
- Applied tuning immediately to the live renderer, PNG output, and Story video without recompiling
  or moving the code cursor; reset returns to annotated defaults and an explicit protected action
  can bake values into GLSL constants.
- Migrated portable projects and SQLite libraries to schema V2 so per-pass values survive reloads,
  project exports, whole-library backups, and future React Native repository adapters.

### Configurable mobile editor appearance

- Added device-local Editor configuration for syntax theme, locally bundled JetBrains Mono or IBM
  Plex Mono typography, font size, line spacing, ligatures, line wrapping, completion behavior,
  inline help, and the default phone Code presentation.
- Replaced the editor's fallback token colors with complete Pocket Night, Catppuccin Mocha,
  Solarized Dark, and Solarized Light CodeMirror themes, including more legible gutter and comment
  colors and live reconfiguration without resetting source or selection.
- Added a phone Code header control that cycles between an opaque Focus workspace and a readable
  translucent editor over the live shader preview.

### Offline GLSL editing assistance

- Added a bundled GLSL ES 3.00 reference covering 62 commonly used functions with fuzzy name and
  concept search, overload signatures, concise descriptions, examples, and links back to the
  authoritative Khronos pages.
- Expanded completion beyond a static built-in list with ranked GLSL functions and snippets,
  Shader Pocket uniforms, user-declared functions and variables, qualifier-aware type suggestions,
  and vector swizzles while suppressing suggestions inside comments.
- Exposed a compact source Find control, desktop function hovers, and a touch-friendly cursor help
  chip that opens the selected function directly in the offline reference.

### Durable portable shader library

- Replaced the single localStorage draft with a versioned SQLite WASM repository running in a
  dedicated worker and persisted through OPFS, while retaining visible memory-only and recovery
  failure states when durable browser storage is unavailable.
- Added a portable schema for multiple projects, ordered passes, and recovery snapshots behind an
  asynchronous repository contract designed for a later Expo SQLite React Native adapter.
- Added a responsive shader library for creating, renaming, switching, and restoring local
  projects, with visible saving, saved, memory-only, and recovery-needed states.
- Added SHA-256-deduplicated snapshots after 30 quiet seconds and before protected reset, import,
  migration, and restore actions, bounded to the latest 50 states per project.
- Migrated existing localStorage drafts into SQLite with a recovery snapshot before clearing the
  old keys.

### Project and library portability

- Added validated `.shaderpocket.json` and `.frag` imports that open as new local projects without
  replacing current work.
- Added consistent whole-library `shader-pocket.sqlite3` backup export and merge import, including
  application/schema validation and collision-safe remapping across projects, passes, and recovery
  snapshots.
- Documented the shared SQLite boundary, browser adapter, backup semantics, and recommended React
  Native continuation.
- Verified OPFS persistence across reloads, multi-project switching, project import, protected
  reset/restore, SQLite export, and collision-safe database re-import at 1440 × 900 and 390 × 844 in
  Chrome with no application console errors.
- Expanded the unit baseline to 26 passing tests and confirmed formatting, linting, strict type
  checking, and the production build.

## 2026-08-21

### V1 product plan

- Added a single V1 product plan that inventories the prepared editor, renderer, document,
  responsive, local-save, and media-export capabilities.
- Defined the remaining V1 sequence: durable IndexedDB documents and recovery, shareable URLs,
  uniform tuning, ordered fragment passes, PWA delivery, and real-device hardening.
- Recorded V1 release criteria and explicit post-V1 boundaries for accounts, cloud publishing,
  advanced GPU/language support, media inputs, and native packaging.

### Tailscale development access

- Allowed the stable `ishineko.banteng-ratio.ts.net` Tailscale hostname in the Vite development
  server while retaining the strict `0.0.0.0:37005` service binding.

### Portable local exports

- Added explicit downloads for the complete versioned Shader Pocket project and the active GLSL
  fragment source, complementing browser auto-save with portable local backups.
- Added a 1080 × 1080 PNG renderer that uses the same WebGL2 compile and uniform path as the live
  preview.
- Added an accessible responsive export panel, including invalid-shader guards and visible export
  failures.
- Extracted the shared full-screen WebGL2 compile and frame runtime for reuse by live and offline
  render targets.

### Instagram Story video export

- Added duration-controlled Story exports from 1–60 seconds as H.264 MP4 at the native 9:16
  1080 × 1920 canvas size.
- Added a deterministic WebCodecs and Mediabunny path that emits exactly 30 frames per second on
  secure browser origins, with the media encoder loaded only when export capabilities are checked.
- Added an H.264 MediaRecorder compatibility path for plain-HTTP Tailscale sessions where WebCodecs
  is unavailable; the UI identifies this as target-30 variable-frame-rate recording.
- Added recording progress, cancellation, codec capability guards, source compilation errors, and
  unit coverage for duration and exact-frame timeline calculations.
- Browser-validated the deterministic output as a 30-frame, 1.000-second H.264 MP4 and validated
  the Tailscale compatibility output as a playable 1080 × 1920 H.264 MP4.

### TypeScript shader editor foundation

- Established the VitePlus, React, strict TypeScript, CodeMirror 6, and raw WebGL2 application
  foundation.
- Added a dedicated phone Code/Preview interaction model alongside the desktop split workspace,
  including safe-area and visual-viewport handling.
- Added live shader compilation, last-good-program rendering, source-linked diagnostics, GLSL
  completions, built-in uniforms, pointer interaction, pause/reset controls, and local draft
  persistence.
- Introduced a versioned, framework-neutral `ShaderDocument` model with immutable updates, runtime
  repair, and migration from the legacy source-only local draft.
- Added unit coverage for compiler diagnostics, document migrations, updates, and browser storage.
- Verified formatting, linting, strict type checking, nine unit tests, production build, and the
  visible desktop and iPhone-profile flows in Chrome.

### Repository workflow

- Initialized the repository on the `main` branch and adopted cohesive implementation commits with
  conventional subjects.
- Added the requirement to maintain this changelog alongside meaningful product and architecture
  work.
- Registered the development service on port `37005`, bound to `0.0.0.0` with strict port handling
  for stable localhost and Tailscale access.
