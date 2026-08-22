# Changelog

Meaningful repository changes are recorded here newest-first. Entries are grouped by logical work
area and may summarize one or more related commits.

## 2026-08-22

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
