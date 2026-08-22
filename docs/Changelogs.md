# Changelog

Meaningful repository changes are recorded here newest-first. Entries are grouped by logical work
area and may summarize one or more related commits.

## 2026-08-22

### Configurable mobile editor appearance

- Added device-local Editor configuration for syntax theme, locally bundled JetBrains Mono or IBM
  Plex Mono typography, font size, line spacing, ligatures, line wrapping, completion behavior,
  inline help, and the default phone Code presentation.
- Replaced the editor's fallback token colors with complete Pocket Night, Catppuccin Mocha,
  Solarized Dark, and Solarized Light CodeMirror themes, including more legible gutter and comment
  colors and live reconfiguration without resetting source or selection.
- Added a phone Code header control that cycles between an opaque Focus workspace and a readable
  translucent editor over the live shader preview.

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
