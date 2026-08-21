# Slice 0 implementation handoff

## What is running

The first mobile-first editor slice is implemented as a React web app and is available on the machine's registered developer-service port:

- Local: `http://127.0.0.1:37005/`
- Tailscale: `http://100.65.23.100:37005/`
- Registry name: `fragcoord-re`

The dev server binds to `0.0.0.0` with `strictPort: true`, so a port collision fails loudly instead of silently selecting another port.

## Toolchain

The repository uses VitePlus `vp v0.2.9` with its project-local `vite-plus` package. The standard workflow is:

```bash
vp install
vp dev
vp check
vp test --run
vp build
```

VitePlus owns the Vite/Rolldown, Vitest, Oxfmt, Oxlint, and TypeScript validation path. The React UI uses CodeMirror 6 for the GLSL editor and raw WebGL2 for rendering.

## Implemented behavior

- Responsive split editor on desktop.
- Dedicated Preview and Code views on phones rather than a compressed desktop layout.
- Safe-area-aware header and bottom navigation with 44-pixel minimum touch targets.
- `visualViewport` sizing to keep the editor usable when a mobile keyboard opens.
- GLSL ES 3.00 fragment shader editing with CodeMirror syntax support.
- Debounced compilation after 450 ms and an explicit Run action.
- WebGL2 full-screen triangle renderer with time, resolution, mouse, drag, scroll, and frame uniforms.
- Touch/pointer interaction directly on the preview.
- Compiler log parsing into CodeMirror line diagnostics.
- Last-good-program behavior: a broken edit reports the error without destroying the working preview.
- Pause/resume, reset confirmation, and local source persistence.
- Device-pixel-ratio cap of 2 to limit mobile GPU cost.
- WebGL context loss messaging and reduced-motion support.

## Slice 1 foundation update

The editor now uses a framework-neutral, strict TypeScript document model instead of keeping a
single source string as the application state. The current schema is versioned and includes document
metadata, an active pass id, and a non-empty pass collection. Runtime parsing repairs invalid active
pass references and safely falls back for malformed or unsupported documents.

- The old `shader-pocket-source-v1` local draft migrates automatically to
  `shader-pocket-document-v1` without losing source.
- Model updates are immutable and covered by unit tests.
- The current single fragment pass is selected through the document model, leaving room for ordered
  multi-pass work later.
- CodeMirror offers GLSL ES types, keywords, functions, WebGL built-ins, and editor uniform
  completions.
- `Cmd+Enter` and `Ctrl+Enter` explicitly compile the current document.
- Compiler diagnostics are actionable: selecting one focuses and centers its source line.
- The renderer now supplies `u_time_delta` in addition to the existing built-in uniforms.

## Validation snapshot

- `vp check`: formatting, lint, and TypeScript checks pass.
- `vp test --run`: 3 diagnostic parser tests pass.
- `vp build`: production bundle builds successfully.
- Both localhost and the Tailscale URL return HTTP 200.
- Port `37005` is listening on `0.0.0.0`.

The Slice 1 foundation was verified in Chrome at a 1440×900 desktop viewport and with Playwright's
iPhone 15 profile. Code/Preview navigation, GLSL completion display, failed compilation with a
last-good frame, diagnostic-to-line navigation, schema persistence, and rendering were exercised.
The browser reported no page errors. Its only warnings were GL driver notices caused by screenshot
readback.

## Recommended next slice

1. Add an IndexedDB-backed autosave/snapshot adapter and image export.
2. Add compact shareable document URLs.
3. Complete real-device iOS Safari and Android Chrome editing, IME, and thermal testing.
4. Then add the parameter/tuning sheet generated from declared uniforms.
