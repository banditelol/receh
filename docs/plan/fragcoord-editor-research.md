# FragCoord editor reverse-engineering notes

Research date: 2026-08-21  
Target: [https://fragcoord.xyz/](https://fragcoord.xyz/)  
Scope: the public editor experience, production bundles, responsive behavior, rendering architecture, persistence, and backend clues. This is a clean-room behavioral and asset analysis, not access to the private source repository.

## Executive summary

FragCoord is a substantial React shader IDE, not a small text editor with a canvas beside it. The deployed app combines a customized Monaco editor, a raw WebGL2/WebGPU rendering pipeline, multi-pass shader state, uniform inspection and tuning, import/export, local history, Supabase-backed accounts and publishing, and PWA caching.

Its desktop architecture is strong. Its phone layout is not truly mobile-first: below 768 px, most controls are made smaller or horizontally scrollable, while the same dense two-panel workspace remains. Portrait mode stacks the code and preview panes based on the container aspect ratio, but does not replace them with a simpler phone navigation model. The result is likely cramped once the software keyboard opens.

The most important implementation choice for a reproduction is therefore to preserve the browser rendering model while replacing Monaco and the desktop panel shell on phones. A responsive web/PWA core using CodeMirror 6 is the lowest-risk path. A React Native app can wrap that web core later, but a fully native first implementation would require rebuilding most of the difficult editor and GPU infrastructure twice.

## Evidence and limits

### What was inspected

- The live site was opened in the Codex in-app browser. The editor route is `/`; saved shaders use `/s/{slug}` and embeds use `/embed/{slug}`.
- The user manually switched the in-app tab to its editor view, confirming that the editor is client-side state on the root route rather than a separate editor URL.
- The public production HTML, manifest, service worker, JavaScript chunks, CSS chunks, WASM references, API route strings, storage keys, and Supabase query names were inspected.
- Responsive rules were inspected at the declared 768 px and 480 px breakpoints, along with container-query behavior inside the inspector and tuner.
- Current official documentation was checked for Monaco, CodeMirror 6, Expo GLView, React Native WebView, React Native WebGPU, and React Native Skia.

### What could not be verified visually

The site loads in the user's in-app browser, but that surface did not expose inspection or screenshot controls to this task. A separate visible Chrome session was launched, but Chrome navigation was blocked by the execution environment for every tested public URL. Its fallback captures were blank and were rejected. Accordingly:

- This document does not claim a screenshot-backed UX audit.
- Visual hierarchy conclusions are based on the deployed DOM/CSS/component strings, not accepted screenshots.
- Keyboard behavior, focus order, screen-reader output, runtime touch gestures, shader frame rate, and iOS Safari quirks still need device testing.

## Deployed technology

| Layer             | Finding                                                      | Evidence and confidence                                                                                                        |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Application       | React 18.3.1                                                 | The production React renderer reports `18.3.1`. High confidence.                                                               |
| Routing           | React Router, client-side routes                             | Router hooks and route table are bundled; the editor stays mounted across route changes. High confidence.                      |
| Build             | Vite ESM build with lazy route chunks                        | Hashed ESM chunks, `vite:preloadError`, and Vite PWA registration. High confidence.                                            |
| Hosting           | Vercel                                                       | Production response headers identify Vercel; Vercel Analytics is bundled. High confidence.                                     |
| Code editor       | Monaco Editor 0.44.0 plus `monaco-vim`                       | Monaco license banners expose version 0.44.0; editor and worker chunks are deployed separately. High confidence.               |
| Styling           | Large custom CSS system                                      | Custom design tokens, media queries, and container queries; no evidence of Tailwind or a component framework. High confidence. |
| Font              | JetBrains Mono with Fira Code/Consolas fallbacks             | Loaded from Google Fonts and repeated in editor configuration. High confidence.                                                |
| Shader rendering  | Raw WebGL2 and WebGPU adapters                               | Separate `webgl2Adapter` and `webgpuBackend` chunks, canvas/context calls, and backend policy module. High confidence.         |
| Shader languages  | GLSL, WGSL, HLSL, Slang, Golf/GM formats                     | Language conversion and policy strings plus editor selectors. High confidence.                                                 |
| Compilation       | Browser-side transforms, Naga WASM, optional Clang HLSL WASM | `naga` and `clang-hlsl-wasm` references; portability transforms and diagnostic rewrites. High confidence.                      |
| Auth/data         | Supabase                                                     | Public Supabase client chunk and project URL; auth/session and table queries are bundled. High confidence.                     |
| Server endpoints  | Vercel/serverless APIs                                       | `/api/audio/extract`, licensing endpoints, OG image endpoint, and ShaderToy import messaging. High confidence.                 |
| Media             | MediaRecorder, WebCodecs, Mediabunny                         | WebM and MP4 export paths, audio capture, canvas capture, and lazy Mediabunny chunk. High confidence.                          |
| Offline/install   | PWA using Workbox                                            | Standalone web manifest, service worker registration, and a large Workbox precache list. High confidence.                      |
| Local persistence | localStorage and sessionStorage                              | Layout, viewport, history, draft handoff, editor settings, and cached audio metadata keys. High confidence.                    |

Notable public assets:

- [Application HTML](https://fragcoord.xyz/)
- [Main application chunk](https://fragcoord.xyz/assets/index-DaC1ngHJ.js)
- [Editor chunk](https://fragcoord.xyz/assets/Editor-C43NEUid.js)
- [Editor CSS](https://fragcoord.xyz/assets/Editor-C5Ec_nnV.css)
- [Monaco chunk](https://fragcoord.xyz/assets/monaco-TXFOG63i.js)
- [Shader viewport chunk](https://fragcoord.xyz/assets/ShaderViewport-Dj-pObO2.js)
- [PWA manifest](https://fragcoord.xyz/manifest.webmanifest)
- [Service worker](https://fragcoord.xyz/sw.js)

No source maps were published for the main, Monaco, or CSS bundles.

## Bundle shape

The following are raw production asset sizes before HTTP compression:

| Asset                    |      Approximate size |
| ------------------------ | --------------------: |
| Main JavaScript          |                390 KB |
| Main CSS                 |                 64 KB |
| Editor JavaScript        |                561 KB |
| Editor CSS               |                222 KB |
| Monaco JavaScript        |               3.67 MB |
| Monaco CSS               |                113 KB |
| Source-editor wrapper    |                 80 KB |
| Shader viewport          |                114 KB |
| Language converter       |                339 KB |
| Supabase client          |                173 KB |
| Advanced compiler bridge | 22 KB, excluding WASM |

The editor is lazy-loaded, which protects non-editor routes, but the first editor session still has a large parse and memory footprint for a phone. Monaco is the dominant cost.

## Editor surface map

### Workspace shell

- Navigation and account controls
- Shader title bar with author, reactions/comments, save, visibility, share, and focus mode
- Main workspace with code and preview panels
- Draggable split between code and preview
- Optional swapped layout (`Code | View` or `View | Code`)
- Automatic vertical stacking when the editor container is taller than it is wide
- Full-screen and focus modes

### Code panel

- Monaco with GLSL-oriented syntax, completions, hovers, diagnostics, quick fixes, bracket coloring, Vim mode, and soft wrap
- Main/common/multi-pass tabs, per-pass settings, add/delete/rename
- Inline constant tuner widgets
- Comment anchors and inline discussion previews
- Snippet insertion, library browser, local/server history, formatter, import, export, and language conversion
- Compile controls, automatic compile, character count, instruction estimate, warnings, and error banners

The Monaco configuration is tuned for desktop density: 13 px type, a six-character line-number gutter, glyph margin, bracket guides, and standard browser hover/suggestion widgets. Minimap is disabled and automatic layout is enabled.

### Preview panel

- Canvas-backed live shader output
- WebGL2 default path, WebGPU path for compute/native WGSL/Slang/HLSL and advanced formats
- Multi-pass buffers and recursion/repeat support
- Configurable resolution, aspect mode, texture wrapping/filtering, HDR/buffer formats, 1D/2D/3D/cubemap targets, and MRT clues
- Mouse, drag, scroll, date, time, frame, resolution, camera, keyboard, webcam, audio, and previous-pass built-ins
- Timeline with play/reset, speed, loop, duration, frame cap, and export range
- Full-screen canvas, FPS/GPU timing, overlays, code-shot overlays, image/video capture, WebM/MP4 export

### Inspector and tuner

- `Tuner`: parsed constants and custom uniforms, sliders, vector controls, plots, color controls, textures, webcam, audio, and pass references
- `Inspect`: selected-expression visualization, histogram, compare mode, NaN/Inf/range checks, and source navigation
- `Speed`: CPU/GPU timing, per-pass cost, instruction estimates, loop trips, texture samples/locality, and divergence heuristics
- Container queries reflow dense tuner controls at 320, 280, 260, and 240 px panel widths

### Save, sharing, and community

- Personal, invite-only, unlisted, and public visibility
- Shader passes stored separately from shader metadata
- Revisions and local snapshots
- Likes/reactions, comments, mentions, follows, sets, tutorials, marketplace listings, licenses, and creator payouts
- Share URLs, embeds, social share actions, thumbnail/video previews, and commercial licensing

## State and data model inferred from the client

The minimum useful reproduction model is:

```ts
type ShaderDocument = {
  id?: string;
  slug?: string;
  title: string;
  description: string;
  visibility: "personal" | "invite" | "unlisted" | "public";
  commonSource: string;
  passes: ShaderPass[];
  activePassId: string;
  playback: PlaybackSettings;
  viewport: ViewportSettings;
  metadata: { tags: string[]; license?: string };
};

type ShaderPass = {
  id: string;
  name: string;
  language: "glsl" | "wgsl" | "hlsl" | "slang" | "golf" | "gm";
  source: string;
  pipeline: "fragment" | "compute";
  resolution: ResolutionPreset | CustomResolution;
  buffer: BufferSettings;
  repeatCount: number;
};
```

Public Supabase table names expose the broader production model: `profiles`, `shaders`, `shader_passes`, `shader_revisions`, `shader_invites`, `shader_reactions`, `previews`, `thumbnails`, `tutorials`, `notifications`, `follows`, `shader_listings`, `shader_listing_license_variants`, `licenses`, `shader_bundles`, `shader_bundle_items`, and payout/fulfillment tables.

## Current responsive behavior

### What the implementation already does well

- Uses `100dvh` on small screens and safe-area padding on the body.
- Watches `visualViewport`, orientation changes, and panel `ResizeObserver`s.
- Switches to a vertical code/preview layout based on the editor container's aspect ratio.
- Makes toolbars, pass tabs, and menu headers horizontally scrollable.
- Increases several icon buttons to 36 px at the 768 px breakpoint.
- Uses `touch-action: none` on canvas and drag surfaces to support custom gestures.
- Uses container queries inside the tuner rather than relying only on page width.
- Supports reduced-motion preferences in several animated surfaces.

### Why it still feels desktop-first

1. **Monaco is the central editor.** Monaco's own FAQ says mobile browsers and mobile web frameworks are not supported. FragCoord is therefore carrying a foundational mobile risk, independent of its CSS. [Monaco repository and FAQ](https://github.com/microsoft/monaco-editor)
2. **The phone breakpoint mostly compresses the desktop UI.** Buttons, headers, pass tabs, the footer, and typography become smaller; the information architecture remains dense.
3. **Portrait stacks both heavy panels.** The code editor, canvas, panel menus, footer, timeline, and inspector all compete for height. A software keyboard can consume roughly half the viewport.
4. **Several touch targets become too small.** At 480 px, some footer controls have 18 px minimum height, add-pass controls can be 22 px wide, and resizer bars are only 5 px tall.
5. **The document disables user zoom.** The viewport meta tag uses `maximum-scale=1` and `user-scalable=no`, removing a key low-vision fallback.
6. **Horizontal scrolling hides discoverability.** Toolbars and pass tabs can be reached, but off-screen actions have weak affordance unless the user already knows they exist.
7. **Aspect ratio is too blunt a layout signal.** A small landscape phone becomes a side-by-side editor even when neither panel has enough width. A tablet with a keyboard may deserve the desktop shell even in portrait.
8. **Custom touch handling is pervasive.** Canvas, histogram, plot pads, splitters, and export handles all suppress native touch behavior. Gesture priority and escape routes need real-device testing.

## Accessibility risks visible in the deployed implementation

- Page zoom is disabled.
- Multiple controls fall below a comfortable 44–48 px phone target and some appear below WCAG 2.2's 24 px minimum target guidance.
- Five- or six-pixel splitters are difficult to discover and operate by touch.
- Icon-only controls increase reliance on accessible names; names exist in some component strings, but a runtime accessibility-tree inspection is still needed.
- Horizontally scrolling toolbars can create hidden keyboard/focus destinations.
- Canvas state, compile errors, shader progress, and visual inspector output require live-region and nonvisual equivalents; only some `aria-live` strings were found.
- Focus, selection, IME composition, dictation, mobile screen readers, external keyboards, and reduced-motion behavior remain unverified.

This is not a WCAG conformance claim. It is a risk inventory from public markup and styles.

## Reproduction boundaries

### Reproduce in the first useful version

- A single shader document with title, source, and live preview
- GLSL fragment shader compilation on WebGL2
- Built-in uniforms: resolution, time, time delta, frame, mouse/touch, drag, and scroll/zoom
- Explicit compile plus safe debounced auto-compile
- Pass tabs and a small multi-pass pipeline
- Parseable custom uniforms with mobile-friendly controls
- Compile errors linked to source locations
- Local autosave/history and shareable document serialization
- Image export
- Desktop split layout and phone-specific navigation

### Defer until the core is stable

- WebGPU compute and HLSL/Slang conversion
- Advanced Naga/Clang compilation
- Audio/webcam/screen textures
- Video and MP4 export
- Per-pixel profiler, heatmap, and advanced inspector
- Inline discussions, social graph, tutorials, marketplace, and licensing
- 1D/3D/cubemap buffers, MRT, recursion, and all ShaderToy compatibility edge cases

## Sources used for platform decisions

- Monaco explicitly states that mobile browsers and mobile web frameworks are unsupported: [microsoft/monaco-editor](https://github.com/microsoft/monaco-editor).
- CodeMirror advertises mobile support using native phone selection/editing behavior: [CodeMirror](https://codemirror.com/). Its current changelog also contains continuing Android and Mobile Safari fixes: [CodeMirror changelog](https://codemirror.com/docs/changelog/).
- Expo GLView supplies a native GL target with a WebGL-like context, but requires device-side synchronous calls and does not behave under remote debugging: [Expo GLView](https://docs.expo.dev/versions/v55.0.0/sdk/gl-view/).
- React Native WebGPU exposes WebGPU on iOS, Android, macOS, and visionOS through Dawn: [installation](https://wcandillon.github.io/react-native-webgpu/docs/getting-started/installation) and [canvas model](https://wcandillon.github.io/react-native-webgpu/docs/getting-started/canvas).
- React Native WebView can host the web editor inside a native shell, but current releases require React Native's New Architecture and newer platform baselines: [React Native WebView setup](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Getting-Started.md).
- React Native Skia supports runtime shaders in SkSL, which is GLSL-like but not a drop-in GLSL/WebGL runtime: [Skia shading language](https://shopify.github.io/react-native-skia/docs/shaders/overview/).
