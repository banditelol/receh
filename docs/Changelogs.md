# Changelog

Meaningful repository changes are recorded here newest-first. Entries are grouped by logical work
area and may summarize one or more related commits.

## 2026-08-21

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
