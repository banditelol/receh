# receh refactor plan

Status: proposed  
Scope: React best practices, platform boundaries, and an eventual Expo/native client

This plan is based on the current implementation described in
[`../Architecture.md`](../Architecture.md) and [`../internal.md`](../internal.md). It preserves the
browser-first PWA while making the document, shader, storage, and renderer contracts easier to
reuse.

## Outcome to aim for

The target is not “rewrite the app in React Native.” The target is a small platform-neutral shader
core with thin platform shells:

```text
                 ┌──────────────────────────────┐
                 │ platform-neutral shader core │
                 │ document · source · compile  │
                 │ diagnostics · pass graph     │
                 └──────────────┬───────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                                   │
       web React/PWA shell                 Expo/native shell
       DOM + CodeMirror + WebGL2            RN UI + native adapters
```

The browser should remain a first-class product. Native work should consume stable contracts rather
than forcing the browser to adopt native constraints prematurely.

## Current hotspots

### 1. `App.tsx` is doing too much

`App.tsx` is currently the composition root, session store, derived-data layer, event-command
layer, responsive-layout owner, and full JSX tree. It contains document edits, compile-state
handling, playback state, fullscreen handling, share import, diagnostics navigation, uniform
baking, and every panel boundary.

This makes every new feature touch the same file and makes it difficult to render a native shell
without importing browser-only behavior.

### 2. Browser capabilities are mixed into React state orchestration

`useShaderLibrary` is a useful abstraction, but it currently obtains a module-global browser
repository and directly uses `window.localStorage`, `navigator.storage`, and browser `File` types.
`ShaderCanvas` directly owns `HTMLCanvasElement`, `window`, `requestAnimationFrame`, DOM pointer
events, and WebGL2.

The behavior is correct for the PWA, but these dependencies need explicit adapters before native
targets are realistic.

### 3. Shader contracts are close but not fully isolated

`functionLibrary.ts` imports the diagnostic type from the renderer folder. Export code also imports
the renderer's pass-pipeline types. This is a small dependency today, but it makes the renderer
look like the owner of language/compiler contracts.

The source composer, uniform model, diagnostic model, compile scheduler, and pass graph should be
one framework-neutral shader-engine boundary. A WebGL2 backend should consume that boundary.

### 4. The document model has a good contract but a broad hook API

`ShaderRepository` is the right seam, but `useShaderLibrary` exposes a large collection of setters
and workflow callbacks. The hook also combines initialization, autosave, snapshots, project
navigation, import/export, and status presentation.

The next step should be a session/controller boundary, not a second global state system by default.

### 5. UI state is centralized and partly redundant

Many booleans represent mutually exclusive panels or modes: library, settings, tuner, docs,
mobile pane, topbar collapse, toolbar collapse, fullscreen, and diagnostic disclosure. A reducer or
explicit state machines would make invalid combinations less likely and make transitions testable.

Derived values such as the active pass, editor source, composed passes, visible functions, and
status text should remain derived selectors rather than additional state.

### 6. CSS and desktop/mobile presentation are tightly coupled

The single `src/styles.css` file contains the complete design system, app shell, editor, dialogs,
tuner, library, docs, and responsive rules. This is workable for the current app, but native UI
cannot consume CSS selectors or media queries. Shared tokens should be extracted before a native
surface is designed.

### 7. Tests favor pure behavior over integration boundaries

The pure tests are strong around documents, passes, uniforms, diagnostics, and scheduling. The
refactor should add tests around the new session/controller contracts and keep a small number of
real-browser tests for CodeMirror, WebGL, persistence, responsive layout, and exports.

## Principles

1. Keep the glossary terms stable: Project, Shader document, Fragment pass, Source scope, Local
   library, Snapshot, Compile request, Last-good program, and Viewport retain their current
   meanings.
2. Keep the Shader document serializable and independent of React, DOM, WebGL, and native views.
3. Keep user events in event handlers/commands and use Effects only to synchronize with external
   systems. This follows React's guidance that Effects are an escape hatch for external systems,
   not the normal data-flow mechanism. See [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).
4. Give each piece of state one owner. Derive data from canonical state during render; do not copy
   active-pass or source values into parallel state.
5. Keep imperative systems imperative: CodeMirror, WebGL, SQLite, animation frames, and media
   encoders should expose small lifecycle APIs and be synchronized from React at explicit boundaries.
6. Prefer incremental extraction and browser regression coverage over a speculative monorepo move.
7. Native targets should share contracts, not necessarily the same view implementation.

## Target structure

Start with directories in this repository. Move to workspaces only when a second app actually needs
the packages.

```text
src/
  app/
    AppShell.tsx
    appReducer.ts
    selectors.ts
    commands.ts
  features/
    code-pane/
    preview-pane/
    pass-strip/
    library/
    uniform-tuner/
    dialogs/
  shader/
    document.ts
    migrations.ts
    sourceComposition.ts
    uniforms.ts
    diagnostics.ts
    compileScheduler.ts
    passGraph.ts
  renderer/
    backend.ts
    webgl2Backend.ts
    webglResources.ts
    passPipeline.ts
  persistence/
    repository.ts
    browserSqliteRepository.ts
    expoSqliteRepository.ts       # later
    fileTransfer.ts
  platform/
    web.ts
    native.ts                     # later
  design/
    tokens.ts

apps/
  mobile/                         # later Expo app, only after the web shell is stable
```

The existing files do not need to move all at once. First create stable modules and compatibility
re-exports; then relocate implementations in small commits.

## Phased implementation plan

### Phase 0 — establish guardrails

Priority: P0

- Keep the current browser behavior unchanged.
- Add characterization tests for document edits, compile ownership, last-good rendering, pass
  texture order, repository initialization, and risky-action snapshots.
- Add a browser smoke test that exercises: edit → compile error → last-good frame → fix → project
  switch → restore.
- Record a dependency map and forbid new imports from `window`, `document`, `navigator`, DOM types,
  or WebGL types in the future `shader/` directory.
- Keep `vp check`, `vp test --run`, `vp build`, and real-browser verification as the checkpoint gate.

Exit condition: the refactor can be stopped at any phase without changing the current product
behavior.

### Phase 1 — extract the shader core

Priority: P0

Extract and test framework-neutral modules for:

- `ShaderDocument` types, migrations, immutable commands, and serialization;
- Source composition and `ShaderLineOrigin` mapping;
- uniform declarations, runtime values, and explicit source baking;
- diagnostic parsing and authored-line mapping;
- compile revisions/tickets;
- pass order, resolution, texture-input requirements, and resource plans.

Move `ShaderDiagnostic` out of `renderer/` and make the shader core own it. Keep WebGL handles out
of `CompiledPipelinePass`; use a separate backend-owned compiled-program type.

Suggested contracts:

```ts
type ShaderCompileInput = {
  documentId: string;
  passId: string;
  source: string;
  lineOrigins: readonly ShaderLineOrigin[];
};

type CompileResult =
  | { ok: true; documentId: string; passId: string; revision: number; artifact: unknown }
  | {
      ok: false;
      documentId: string;
      passId: string;
      revision: number;
      diagnostics: ShaderDiagnostic[];
    };

interface RendererBackend {
  initialize(surface: RenderSurface): Promise<void>;
  compile(input: ShaderCompileInput): Promise<unknown>;
  render(frame: FrameInput): void;
  updateUniforms(values: readonly RuntimeUniform[]): void;
  dispose(): void;
}
```

The exact artifact type should remain backend-specific. Do not make the shared core pretend that a
WebGL `WebGLProgram` can exist in React Native.

Exit condition: `App` can build a render plan using shader-core imports without importing a renderer
implementation for source composition, uniform parsing, or diagnostics.

### Phase 2 — split the React session from the view tree

Priority: P0

Replace the one large `App` component with a small composition root and controlled feature regions:

```text
AppShell
├─ Topbar
├─ Workspace
│  ├─ PreviewPane
│  │  ├─ ShaderCanvas
│  │  └─ PlaybackToolbar
│  └─ CodePane
│     ├─ PassStrip
│     ├─ EditorActionRow
│     └─ ShaderEditor
├─ MobileNavigation
└─ OverlayHost
   ├─ LibraryPanel
   ├─ UniformTuner
   ├─ ExportPanel
   ├─ SettingsPanel
   └─ GlslDocs
```

Create a `useShaderSession()` boundary that returns a small state/command model:

```ts
{
  document,
  globalFunctionsSource,
  renderPlan,
  compileState,
  persistenceState,
  dispatch,
}
```

Use a reducer for transitions that are currently spread across many setters: source updates,
active-pass changes, project changes, playback actions, panel navigation, and diagnostic navigation.
Keep async persistence and renderer synchronization outside the reducer.

Use feature-local hooks for external systems:

- `useShaderRepository()` for repository subscription/commands;
- `useShaderCompiler()` for compile requests and stale-result handling;
- `useShaderPlayback()` for time, pause, seek, and frame reporting;
- `useFullscreenPreview()` for the Fullscreen API;
- `useEditorPreferences()` for preference persistence;
- `useVisualViewportKeyboard()` for browser-only keyboard measurement.

React-specific guidance for this phase:

- Do not add state for `activePass`, `editorSource`, `visibleFunctions`, `editorDiagnostics`,
  `statusText`, or the composed render plan; calculate them from canonical state.
- Keep user actions in command functions called from event handlers. Do not use an Effect to react
  to a state change when the initiating event is already known.
- Keep Effects for CodeMirror synchronization, WebGL lifecycle, repository initialization/subscription,
  browser event listeners, timers, and persistence.
- Use `useSyncExternalStore` if a repository or renderer becomes an independently subscribable
  external store.
- Use `useMemo`/`useCallback` only where they protect an expensive calculation or a meaningful
  external dependency. Do not blanket-wrap every component. React Compiler can be evaluated later;
  its adoption should not substitute for correcting ownership and data flow. See the [React
  Compiler guidance](https://react.dev/learn/react-compiler/introduction).
- Keep components defined at module scope and preserve stable keys for pass IDs and panel state.

Exit condition: the top-level component is composition-only, and a feature can be rendered with a
small, documented prop contract.

### Phase 3 — make persistence genuinely platform-neutral

Priority: P1

Keep `ShaderRepository` as the domain contract, but split platform concerns:

```text
ShaderRepository
├─ BrowserSqliteRepository
│  └─ SQLite WASM worker + OPFS/in-memory fallback
└─ ExpoSqliteRepository
   └─ expo-sqlite + native file/export adapters
```

Changes:

- Remove the module-global repository singleton from the React hook; provide a repository through a
  factory or context at the app boundary.
- Replace direct `window.localStorage` access with a small `KeyValueStore` adapter.
- Replace browser `File`, `Blob`, and download assumptions with `FileTransfer` operations such as
  `readText`, `writeText`, `readBytes`, `writeBytes`, and `shareFile`.
- Keep schema versioning and migration SQL in one documented contract. Preserve the portable
  `.receh.json` document format and the whole-library SQLite format.
- For Expo native, use `expo-sqlite` for the local project library and `expo-file-system` plus
  `expo-document-picker`/sharing adapters for file workflows. `expo-sqlite` currently documents
  Android, iOS, macOS, tvOS, and Web support, while Web support still has extra WASM/header
  requirements; keep the current browser worker until a deliberate web storage migration is
  tested. See [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).
- Keep snapshots and content hashes in the repository layer. The React UI should receive summaries,
  not SQL rows or JSON blobs.

Exit condition: a fake in-memory repository can drive the whole session in tests, and neither the
shader core nor the session reducer imports a browser storage API.

### Phase 4 — isolate renderer backends

Priority: P1

Split the current `ShaderCanvas` responsibilities into:

1. A React surface component that owns layout, surface events, and status presentation.
2. A renderer controller that owns lifecycle, frame scheduling, compile commits, and last-good
   ownership.
3. A WebGL2 backend that owns contexts, programs, textures, framebuffers, uniforms, and draw calls.

The backend should expose capability information:

```ts
type RendererCapabilities = {
  backend: "webgl2" | "expo-gl" | "webgpu" | "native-webgpu";
  maxPassInputs: number;
  supportsCapture: boolean;
  supportsFeedback: boolean;
};
```

Keep ordered Fragment pass semantics identical across backends. If a backend cannot support a
feature, report a capability error rather than silently changing `u_previous` or pass resolution.

For the first native renderer experiment, `expo-gl` is the closest conceptual match because it
provides an OpenGL ES render target and GL context. Its current Expo reference lists Android, iOS,
and Web; macOS must be treated as a separate validation item rather than assumed to work. See
[Expo GLView](https://docs.expo.dev/versions/latest/sdk/gl-view/).

Exit condition: the live preview can swap a fake backend in tests and the WebGL resource lifecycle
is not encoded in React state.

### Phase 5 — add an Expo shell incrementally

Priority: P1, after browser V1 is stable on physical devices

Use a separate `apps/mobile` project rather than converting the existing Vite app in place.

#### Android and iOS first

The lowest-risk native milestone is an Expo app that provides native navigation, safe-area handling,
file/share actions, and settings while hosting the existing web editor in a DOM/WebView surface.
Expo documents DOM components as an incremental way to run existing web code in native apps; SDK 56+
uses `@expo/dom-webview` by default, with `react-native-webview` available as an explicit option.
See [Using React DOM in Expo native apps](https://docs.expo.dev/guides/dom-components/) and
[`react-native-webview`](https://docs.expo.dev/versions/latest/sdk/webview/).

Native shell responsibilities:

- Expo Router/navigation and native screen lifecycle;
- safe-area and keyboard insets;
- system share sheet and document picker;
- app links/deep links;
- native file persistence and SQLite;
- haptics and platform feedback;
- bridge messages for open, save, share, theme, and renderer capability.

Web surface responsibilities in this milestone:

- CodeMirror editor and GLSL editing;
- current HTML/CSS workspace;
- WebGL2 preview and current export behavior;
- browser-compatible share payload parsing.

This is a distribution/integration milestone, not a full native rewrite. It validates the product on
Android/iOS while preserving the most mature editor and renderer.

#### macOS target

“Mac” needs an explicit product decision:

- If it means developing from a Mac, Expo already supports macOS as a development host.
- If it means shipping a native macOS desktop app, that is not the same target as Android/iOS.

React Native macOS is an out-of-tree Microsoft-maintained platform. Expo's own guidance says Expo
Modules have first-class Android/iOS support and describes macOS as additional platform support that
requires a `react-native-macos` app and platform-specific review. The current `expo-gl` reference
does not list macOS, so the browser WebGL2 canvas and the Expo GLView backend cannot be assumed to
port unchanged. See [Expo additional platform support](https://docs.expo.dev/modules/additional-platform-support/)
and [React Native macOS](https://microsoft.github.io/react-native-macos/docs/intro).

Recommended macOS order:

1. Keep the responsive web/PWA app as the macOS desktop product initially.
2. Prove the platform-neutral document and repository packages through Android/iOS first.
3. Create a separate macOS target only if a native desktop app is a real product requirement.
4. Validate `react-native-macos`, Expo module autolinking, SQLite, file dialogs, keyboard/menu
   behavior, and a dedicated GL/rendering surface independently.
5. Share shader contracts and persistence migrations, not assumptions about iOS views or WebGL DOM
   APIs.

Do not make macOS a hidden acceptance condition for the first Expo milestone.

#### New Architecture

Use the Expo/RN New Architecture from the start of the native project and validate third-party
libraries with `expo-doctor`. Current Expo guidance says SDK 55 and later run entirely on the New
Architecture, and custom Expo Modules API modules support it by default. See [React Native's New
Architecture](https://docs.expo.dev/guides/new-architecture/) and [Expo Modules API](https://docs.expo.dev/modules/overview/).

### Phase 6 — decide whether a native editor/renderer is justified

Priority: P2, evidence-driven

Only replace the DOM/WebView surface after measuring real problems: keyboard latency, WebGL frame
rate, memory, selection/IME failures, offline behavior, or store requirements.

If justified:

- keep the Shader document and shader-core packages unchanged;
- build a native code editor surface with an explicit bridge to source and diagnostics;
- implement an `Expo GLView` backend for Android/iOS behind `RendererBackend`;
- treat macOS as its own backend/surface until capability parity is demonstrated;
- keep PNG/video capture as capability-based features because browser `Blob`, `canvas.toBlob`,
  `captureStream`, and MediaRecorder are not native contracts.

Avoid translating GLSL to SkSL solely to obtain React Native Skia rendering. SkSL is not a drop-in
replacement for GLSL ES/WebGL semantics and would create a second shader language/runtime.

## React best-practice checklist

Use this checklist during implementation reviews:

- [ ] One owner for each state value; no mirrored `useState` for derived data.
- [ ] Reducer actions describe user/domain events, not arbitrary component setter combinations.
- [ ] Async work has cancellation or owner checks; stale results cannot update state.
- [ ] Effects synchronize external systems and always clean up listeners, timers, editors, workers,
      animation frames, and GPU resources.
- [ ] Event-specific side effects remain in event handlers/commands.
- [ ] Controlled components have stable, narrow prop contracts.
- [ ] Context is used for stable cross-cutting dependencies, not as an unbounded mutable store.
- [ ] `useSyncExternalStore` is used for independently changing external stores.
- [ ] Memoization is measured and local; it is not used to hide unclear ownership.
- [ ] Components stay at module scope and list keys are stable IDs.
- [ ] Loading, error, empty, and unsupported states are explicit.
- [ ] Browser-only and native-only code is behind platform adapters.
- [ ] A feature has a pure test, a session/controller test, and a real-browser/native smoke path
      appropriate to its risk.

## Priority order and checkpoints

| Checkpoint | Deliverable                                       | Why now                                             |
| ---------- | ------------------------------------------------- | --------------------------------------------------- |
| P0.1       | Characterization tests and dependency rules       | Prevents refactor regressions                       |
| P0.2       | Extract shader core and move diagnostic contracts | Highest reuse value, low UI risk                    |
| P0.3       | Split `App` into session + feature regions        | Reduces React coupling before new platforms         |
| P1.1       | Inject repository and browser platform services   | Enables fake tests and native adapters              |
| P1.2       | Renderer backend/controller split                 | Makes GL lifecycle portable and testable            |
| P1.3       | Expo Android/iOS DOM/WebView shell                | Validates native packaging without rewriting editor |
| P1.4       | Expo SQLite/file/share adapters                   | Gives native persistence and transfer behavior      |
| P2.1       | Native GL/editor spike                            | Only if WebView evidence requires it                |
| P2.2       | React Native macOS target                         | Separate product decision and platform gate         |

Each checkpoint should be a cohesive commit, pass `vp check`, `vp test --run`, and `vp build` when
relevant, and include browser verification for browser-visible changes. Keep generated artifacts and
native build output out of version control.

## Definition of done for the refactor

- `AppShell` is composition-only and does not know SQL, WebGL resource details, or file formats.
- The shader core runs in a non-DOM test environment.
- Repository behavior is testable with an in-memory fake and has separate browser/native adapters.
- The Last-good program invariant is covered by backend/controller tests.
- Web and native shells can choose different editor, renderer, file, and sharing implementations.
- Android/iOS Expo packaging is validated before native editor work begins.
- macOS support is either explicitly scoped as web/PWA or has its own validated React Native macOS
  target; it is never implied by Android/iOS success.
- The document model, migrations, and portable exports remain backward-compatible unless a versioned
  migration is added.

## References

- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [React Compiler introduction](https://react.dev/learn/react-compiler/introduction)
- [Expo SDK reference](https://docs.expo.dev/versions/latest/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo GLView](https://docs.expo.dev/versions/latest/sdk/gl-view/)
- [Expo DOM components](https://docs.expo.dev/guides/dom-components/)
- [Expo New Architecture](https://docs.expo.dev/guides/new-architecture/)
- [Expo additional platform support](https://docs.expo.dev/modules/additional-platform-support/)
- [React Native macOS](https://microsoft.github.io/react-native-macos/docs/intro)
