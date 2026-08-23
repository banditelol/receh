import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SHADER } from "./defaultShader.ts";
import {
  createPortableShaderDocument,
  getActivePass,
  resetActivePassUniformValues,
  updateActivePassName,
  updateActivePassSource,
  updateActivePassUniformValue,
} from "./document/shaderDocument.ts";
import { useShaderLibrary } from "./document/useShaderLibrary.ts";
import {
  loadEditorPreferences,
  saveEditorPreferences,
  type EditorPreferences,
} from "./editor/editorPreferences.ts";
import { GlslDocsPanel } from "./editor/GlslDocsPanel.tsx";
import {
  getAdjacentDiagnosticLine,
  toggleDiagnosticDisclosure,
} from "./editor/diagnosticDisclosure.ts";
import type { GlslReferenceEntry } from "./editor/glslCatalog.ts";
import { ShaderEditor } from "./editor/ShaderEditor.tsx";
import { ExportPanel } from "./export/ExportPanel.tsx";
import { useVisualViewport } from "./hooks/useVisualViewport.ts";
import { LibraryPanel, SAVE_STATUS_LABELS } from "./library/LibraryPanel.tsx";
import { createPlaybackRestart, togglePlaybackToolbar } from "./playback/playbackControls.ts";
import { PwaPrompt } from "./pwa/PwaPrompt.tsx";
import { usePwa } from "./pwa/usePwa.ts";
import { useStorageHealth } from "./pwa/useStorageHealth.ts";
import { ShaderCanvas } from "./renderer/ShaderCanvas.tsx";
import type { ShaderDiagnostic } from "./renderer/diagnostics.ts";
import { EditorSettingsPanel } from "./settings/EditorSettingsPanel.tsx";
import { UniformTunerPanel } from "./uniforms/UniformTunerPanel.tsx";
import { decodeSharedDocument, removeShareCodeFromUrl } from "./share/shareLink.ts";
import {
  bakeUniformValuesIntoSource,
  parseTunableUniforms,
  resolveRuntimeUniforms,
} from "./uniforms/uniformParser.ts";
import type { ShaderUniformValue } from "./uniforms/uniformTypes.ts";

type MobilePane = "preview" | "code";
type CompileStatus = "compiling" | "ready" | "error" | "unsupported";
const DEFAULT_PLAYBACK_RANGE = 60;

function formatPlaybackTime(time: number) {
  const seconds = Math.max(0, Math.floor(time));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function App() {
  useVisualViewport();
  const pwa = usePwa();
  const storageHealth = useStorageHealth();
  const {
    document,
    setDocument,
    projects,
    snapshots,
    saveStatus,
    storageMessage,
    persistent,
    ready,
    createSnapshot,
    createManualSnapshot,
    refreshSnapshots,
    openProject,
    createProject,
    importProject,
    importShaderDocument,
    importLibrary,
    exportLibrary,
    restoreSnapshot,
    setSnapshotPinned,
    renameDocument,
  } = useShaderLibrary();
  const [compileRequest, setCompileRequest] = useState(0);
  const [status, setStatus] = useState<CompileStatus>("compiling");
  const [message, setMessage] = useState("Compiling");
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([]);
  const [mobilePane, setMobilePane] = useState<MobilePane>("preview");
  const [topbarCollapsed, setTopbarCollapsed] = useState(false);
  const [previewToolbarCollapsed, setPreviewToolbarCollapsed] = useState(false);
  const [expandedDiagnosticLine, setExpandedDiagnosticLine] = useState<number | null>(null);
  const [rawCompilerErrorOpen, setRawCompilerErrorOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackRange, setPlaybackRange] = useState(DEFAULT_PLAYBACK_RANGE);
  const [playbackSeekRequest, setPlaybackSeekRequest] = useState({ time: 0, request: 0 });
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsInitialName, setDocsInitialName] = useState<string>();
  const [docsInitialSection, setDocsInitialSection] = useState<"functions" | "uniforms">(
    "functions",
  );
  const [cursorReference, setCursorReference] = useState<GlslReferenceEntry | null>(null);
  const [searchRequest, setSearchRequest] = useState(0);
  const [shareImportNotice, setShareImportNotice] = useState("");
  const shareImportStartedRef = useRef(false);
  const previewPaneRef = useRef<HTMLElement>(null);
  const resumeAfterScrubRef = useRef(false);
  const [editorPreferences, setEditorPreferences] = useState(() =>
    loadEditorPreferences(window.localStorage),
  );
  const [navigationTarget, setNavigationTarget] = useState<{
    line: number;
    request: number;
  } | null>(null);
  const activePass = getActivePass(document);
  const source = activePass.source;
  const uniformDefinitions = useMemo(() => parseTunableUniforms(source), [source]);
  const runtimeUniforms = useMemo(
    () => resolveRuntimeUniforms(uniformDefinitions, activePass.uniformValues),
    [activePass.uniformValues, uniformDefinitions],
  );

  useEffect(() => {
    saveEditorPreferences(window.localStorage, editorPreferences);
  }, [editorPreferences]);

  useEffect(() => {
    if (status !== "error") {
      setExpandedDiagnosticLine(null);
      setRawCompilerErrorOpen(false);
      return;
    }

    if (diagnostics.length > 0) setRawCompilerErrorOpen(false);
    else setExpandedDiagnosticLine(null);
    if (
      expandedDiagnosticLine !== null &&
      !diagnostics.some((diagnostic) => diagnostic.line === expandedDiagnosticLine)
    ) {
      setExpandedDiagnosticLine(null);
    }
  }, [diagnostics, expandedDiagnosticLine, status]);

  useEffect(() => {
    if (!ready || shareImportStartedRef.current) return;
    const payload = new URL(window.location.href).searchParams.get("code");
    shareImportStartedRef.current = true;
    if (!payload) return;

    void decodeSharedDocument(payload)
      .then(async (sharedDocument) => {
        const importedDocument = updateActivePassName(
          createPortableShaderDocument(sharedDocument.source, sharedDocument.title),
          sharedDocument.passName,
        );
        await importShaderDocument(importedDocument);
        window.history.replaceState(null, "", removeShareCodeFromUrl());
        setShareImportNotice(`“${sharedDocument.title}” added to your local library.`);
      })
      .catch((reason: unknown) => {
        setShareImportNotice(
          reason instanceof Error ? reason.message : "This shared shader could not be opened.",
        );
      });
  }, [importShaderDocument, ready]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCompileRequest((request) => request + 1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (window.document.fullscreenElement === previewPaneRef.current) setPreviewFullscreen(true);
      else if (window.document.fullscreenElement === null) setPreviewFullscreen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && window.document.fullscreenElement === null) {
        setPreviewFullscreen(false);
      }
    };

    window.document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleCompileState = useCallback(
    (state: { status: CompileStatus; diagnostics: ShaderDiagnostic[]; message: string }) => {
      setStatus(state.status);
      setDiagnostics(state.diagnostics);
      setMessage(state.message);
    },
    [],
  );

  const handlePlaybackTimeChange = useCallback((time: number) => {
    setPlaybackTime(time);
    setPlaybackRange((current) =>
      time > current ? Math.ceil(time / DEFAULT_PLAYBACK_RANGE) * DEFAULT_PLAYBACK_RANGE : current,
    );
  }, []);

  const statusText = useMemo(() => {
    if (status === "error") {
      const count = diagnostics.length;
      return count > 0
        ? `${count} ${count === 1 ? "error" : "errors"} · last good frame`
        : "Compile error";
    }
    if (status === "unsupported") return "WebGL2 unavailable";
    return status === "ready" ? "Live" : "Compiling";
  }, [diagnostics.length, status]);

  const resetShader = async () => {
    if (source !== DEFAULT_SHADER && window.confirm("Reset the shader to the starter scene?")) {
      try {
        await createSnapshot("before-reset");
        setDocument((current) => updateActivePassSource(current, DEFAULT_SHADER));
      } catch (reason) {
        window.alert(
          reason instanceof Error
            ? `Reset was cancelled: ${reason.message}`
            : "Reset was cancelled because a recovery snapshot could not be created.",
        );
      }
    }
  };

  const updateSource = (nextSource: string) => {
    setDocument((current) => updateActivePassSource(current, nextSource));
  };

  const seekPlayback = (time: number) => {
    const nextTime = Math.max(0, Math.min(time, playbackRange));
    setPlaybackTime(nextTime);
    setPlaybackSeekRequest((current) => ({ time: nextTime, request: current.request + 1 }));
  };

  const restartPlayback = () => {
    resumeAfterScrubRef.current = false;
    const restarted = createPlaybackRestart(playbackSeekRequest);
    setPlaybackTime(restarted.playbackTime);
    setPaused(restarted.paused);
    setPlaybackSeekRequest(restarted.seekRequest);
  };

  const beginPlaybackScrub = () => {
    resumeAfterScrubRef.current = !paused;
    setPaused(true);
  };

  const endPlaybackScrub = () => {
    if (resumeAfterScrubRef.current) setPaused(false);
    resumeAfterScrubRef.current = false;
  };

  const togglePreviewFullscreen = async () => {
    const previewPane = previewPaneRef.current;
    if (!previewPane) return;

    if (previewFullscreen) {
      if (window.document.fullscreenElement === previewPane) {
        await window.document.exitFullscreen().catch(() => undefined);
      }
      setPreviewFullscreen(false);
      return;
    }

    setPreviewFullscreen(true);
    if (previewPane.requestFullscreen) {
      await previewPane.requestFullscreen().catch(() => undefined);
    }
  };

  const navigateToDiagnosticLine = (line: number) => {
    setMobilePane("code");
    setRawCompilerErrorOpen(false);
    setExpandedDiagnosticLine(line);
    setNavigationTarget((current) => ({
      line,
      request: (current?.request ?? 0) + 1,
    }));
  };

  const toggleDiagnosticDetails = () => {
    const result = toggleDiagnosticDisclosure(
      { expandedLine: expandedDiagnosticLine, rawMessageOpen: rawCompilerErrorOpen },
      diagnostics,
    );
    setExpandedDiagnosticLine(result.state.expandedLine);
    setRawCompilerErrorOpen(result.state.rawMessageOpen);
    if (result.navigationLine !== null) navigateToDiagnosticLine(result.navigationLine);
  };

  const navigateAdjacentDiagnostic = (direction: -1 | 1) => {
    const line = getAdjacentDiagnosticLine(diagnostics, expandedDiagnosticLine, direction);
    if (line !== null) navigateToDiagnosticLine(line);
  };

  const openLibrary = () => {
    setLibraryOpen(true);
    void refreshSnapshots();
  };

  const updateEditorPreferences = (patch: Partial<EditorPreferences>) => {
    setEditorPreferences((current) => ({ ...current, ...patch }));
  };

  const toggleCodePresentation = () => {
    setEditorPreferences((current) => ({
      ...current,
      phoneCodePresentation: current.phoneCodePresentation === "focus" ? "overlay" : "focus",
    }));
  };

  const openDocs = (name?: string, section: "functions" | "uniforms" = "functions") => {
    setDocsInitialName(name);
    setDocsInitialSection(section);
    setDocsOpen(true);
  };

  const updateUniformValue = (name: string, value: ShaderUniformValue) => {
    setDocument((current) => updateActivePassUniformValue(current, name, value));
  };

  const bakeUniformValues = async () => {
    await createSnapshot("before-bake");
    setDocument((current) => {
      const pass = getActivePass(current);
      const bakedSource = bakeUniformValuesIntoSource(pass.source, pass.uniformValues);
      return updateActivePassSource(resetActivePassUniformValues(current), bakedSource);
    });
  };

  return (
    <main
      className={`app app--${mobilePane} app--code-presentation-${editorPreferences.phoneCodePresentation} ${topbarCollapsed ? "app--topbar-collapsed" : ""}`}
    >
      <header className="topbar">
        <button
          className="brand library-trigger"
          type="button"
          onClick={openLibrary}
          aria-label={`Open shader library. ${SAVE_STATUS_LABELS[saveStatus]}.`}
        >
          <span className="brand-mark" aria-hidden="true">
            ƒ
          </span>
          <span className="brand-copy">
            <strong>receh</strong>
            <small className={`save-state save-state--${saveStatus}`} aria-live="polite">
              {SAVE_STATUS_LABELS[saveStatus]}
            </small>
          </span>
        </button>
        <div className="top-actions">
          <button className="quiet-button" type="button" onClick={() => void resetShader()}>
            Reset
          </button>
          <button className="export-button" type="button" onClick={() => setExportOpen(true)}>
            Export
          </button>
          <button className="config-button" type="button" onClick={() => setSettingsOpen(true)}>
            Config
          </button>
          <button
            className="topbar-toggle"
            type="button"
            onClick={() => setTopbarCollapsed(true)}
            aria-label="Hide app header"
          >
            <span aria-hidden="true">⌃</span>
          </button>
        </div>
      </header>

      <section className="workspace">
        <section
          ref={previewPaneRef}
          className={`preview-pane ${previewFullscreen ? "preview-pane--fullscreen" : ""}`}
          aria-label="Shader preview panel"
        >
          <ShaderCanvas
            source={source}
            compileRequest={compileRequest}
            paused={paused}
            seekRequest={playbackSeekRequest}
            uniforms={runtimeUniforms}
            onCompileState={handleCompileState}
            onPlaybackTimeChange={handlePlaybackTimeChange}
          />
          {topbarCollapsed && (
            <button
              className="topbar-restore topbar-restore--preview"
              type="button"
              onClick={() => setTopbarCollapsed(false)}
              aria-label="Show app header"
            >
              <span aria-hidden="true">⌄</span>
            </button>
          )}
          <div
            className={`preview-toolbar ${previewToolbarCollapsed ? "preview-toolbar--collapsed" : ""}`}
          >
            <span className={`status status--${status}`}>
              <span className="status-dot" aria-hidden="true" />
              {statusText}
            </span>
            <label className="preview-time-control">
              <span className="preview-time-current">{formatPlaybackTime(playbackTime)}</span>
              <input
                type="range"
                min={0}
                max={playbackRange}
                step={0.01}
                value={Math.min(playbackTime, playbackRange)}
                onChange={(event) => seekPlayback(Number(event.target.value))}
                onPointerDown={beginPlaybackScrub}
                onPointerUp={endPlaybackScrub}
                onPointerCancel={endPlaybackScrub}
                aria-label={`Shader playback time, ${formatPlaybackTime(playbackTime)}`}
              />
              <span className="preview-time-end">{formatPlaybackTime(playbackRange)}</span>
            </label>
            <span className="preview-toolbar-actions">
              <button
                className="preview-control"
                type="button"
                onClick={() => setTunerOpen(true)}
                aria-label={`Tune ${uniformDefinitions.length} custom shader uniforms`}
              >
                <span aria-hidden="true">Tune</span>
                <span className="uniform-count" aria-hidden="true">
                  {uniformDefinitions.length}
                </span>
              </button>
              <button
                className="preview-control preview-control--icon"
                type="button"
                onClick={restartPlayback}
                aria-label="Restart playback from the beginning"
                title="Restart playback"
              >
                <span className="preview-control-icon" aria-hidden="true">
                  ↺
                </span>
              </button>
              <button
                className="preview-control preview-control--icon"
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Resume animation" : "Pause animation"}
                aria-pressed={!paused}
                title={paused ? "Play" : "Pause"}
              >
                <span className="preview-control-icon" aria-hidden="true">
                  {paused ? "▶" : "Ⅱ"}
                </span>
              </button>
              <button
                className="preview-control"
                type="button"
                onClick={() => void togglePreviewFullscreen()}
                aria-label={
                  previewFullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"
                }
                aria-pressed={previewFullscreen}
              >
                <span className="preview-control-icon" aria-hidden="true">
                  {previewFullscreen ? "↙" : "⛶"}
                </span>
                {previewFullscreen ? "Exit" : "Fullscreen"}
              </button>
              <button
                className="preview-control preview-toolbar-toggle"
                type="button"
                onClick={() => setPreviewToolbarCollapsed(togglePlaybackToolbar)}
                aria-label={
                  previewToolbarCollapsed ? "Show playback controls" : "Hide playback controls"
                }
                aria-expanded={!previewToolbarCollapsed}
              >
                <span className="preview-control-icon" aria-hidden="true">
                  {previewToolbarCollapsed ? "⌃" : "⌄"}
                </span>
                <span className="preview-toolbar-toggle-label">
                  {previewToolbarCollapsed ? "Playback" : "Hide"}
                </span>
              </button>
            </span>
          </div>
        </section>

        <section
          className={`code-pane ${rawCompilerErrorOpen ? "code-pane--compiler-error-open" : ""}`}
          aria-label="Code panel"
        >
          <div className="panel-heading">
            <div className="panel-heading-primary">
              {topbarCollapsed && (
                <button
                  className="topbar-restore"
                  type="button"
                  onClick={() => setTopbarCollapsed(false)}
                  aria-label="Show app header"
                >
                  <span aria-hidden="true">⌄</span>
                </button>
              )}
              {status === "error" ? (
                <button
                  className="panel-error-button"
                  type="button"
                  onClick={toggleDiagnosticDetails}
                  aria-expanded={expandedDiagnosticLine !== null || rawCompilerErrorOpen}
                  aria-label={`${statusText}. ${
                    expandedDiagnosticLine !== null || rawCompilerErrorOpen
                      ? "Hide error details"
                      : diagnostics.length > 0
                        ? "Show the first error"
                        : "Show compiler error details"
                  }`}
                >
                  <span className="status-dot" aria-hidden="true" />
                  {diagnostics.length > 0
                    ? `${diagnostics.length} ${diagnostics.length === 1 ? "error" : "errors"}`
                    : "Compile error"}
                </button>
              ) : (
                <span className="panel-heading-title">
                  <span className="eyebrow">Fragment shader</span>
                  <strong>{activePass.name}</strong>
                </span>
              )}
            </div>
            <div className="panel-heading-actions">
              <span className="language-pill">GLSL 300 ES</span>
              <button
                className="panel-action"
                type="button"
                onClick={() => setSearchRequest((request) => request + 1)}
                aria-label="Find in shader source"
              >
                Find
              </button>
              <button
                className="panel-action"
                type="button"
                onClick={() => openDocs(cursorReference?.name)}
                aria-label="Search offline GLSL function documentation"
              >
                Docs
              </button>
              <button
                className="panel-action presentation-toggle"
                type="button"
                onClick={toggleCodePresentation}
                aria-label={
                  editorPreferences.phoneCodePresentation === "focus"
                    ? "Show the live preview behind the code editor"
                    : "Use an opaque code editor"
                }
              >
                {editorPreferences.phoneCodePresentation === "focus" ? "Overlay" : "Focus"}
              </button>
            </div>
          </div>
          {rawCompilerErrorOpen && status === "error" && diagnostics.length === 0 && (
            <div className="compiler-error-panel" role="alert">
              <span>
                <strong>Compiler error</strong>
                <code>{message}</code>
              </span>
              <button
                type="button"
                onClick={() => setRawCompilerErrorOpen(false)}
                aria-label="Hide compiler error details"
              >
                ×
              </button>
            </div>
          )}
          <ShaderEditor
            value={source}
            diagnostics={diagnostics}
            onChange={updateSource}
            onRun={() => setCompileRequest((request) => request + 1)}
            navigationTarget={navigationTarget}
            preferences={editorPreferences}
            searchRequest={searchRequest}
            onReferenceChange={setCursorReference}
            expandedDiagnosticLine={expandedDiagnosticLine}
            onDiagnosticLineClick={(line) => {
              setRawCompilerErrorOpen(false);
              setExpandedDiagnosticLine(line);
            }}
            onNavigateDiagnostic={navigateAdjacentDiagnostic}
            onCloseDiagnostic={() => setExpandedDiagnosticLine(null)}
          />
          {cursorReference && editorPreferences.inlineDocumentation && status !== "error" && (
            <button
              className="editor-reference-chip"
              type="button"
              onClick={() => openDocs(cursorReference.name)}
              aria-label={`Inspect ${cursorReference.name} in the GLSL reference`}
            >
              <strong>{cursorReference.name}</strong>
              <code>{cursorReference.signatures[0]}</code>
              <span>Inspect</span>
            </button>
          )}
        </section>
      </section>

      <nav className="mobile-nav" aria-label="Editor views">
        <button
          type="button"
          className={mobilePane === "preview" ? "active" : ""}
          aria-pressed={mobilePane === "preview"}
          onClick={() => setMobilePane("preview")}
        >
          <span aria-hidden="true">◉</span>
          Preview
        </button>
        <button
          type="button"
          className={mobilePane === "code" ? "active" : ""}
          aria-pressed={mobilePane === "code"}
          onClick={() => setMobilePane("code")}
        >
          <span aria-hidden="true">⌘</span>
          Code
          {status === "error" && <span className="nav-error" aria-label="Shader has errors" />}
        </button>
      </nav>

      {exportOpen && (
        <ExportPanel
          document={document}
          source={source}
          canRender={status === "ready"}
          uniforms={runtimeUniforms}
          onClose={() => setExportOpen(false)}
        />
      )}

      {libraryOpen && (
        <LibraryPanel
          document={document}
          projects={projects}
          snapshots={snapshots}
          saveStatus={saveStatus}
          storageMessage={storageMessage}
          persistent={persistent}
          storageHealth={storageHealth}
          onClose={() => setLibraryOpen(false)}
          onRename={renameDocument}
          onOpenProject={openProject}
          onCreateProject={createProject}
          onImportProject={importProject}
          onImportLibrary={importLibrary}
          onExportLibrary={exportLibrary}
          onRestoreSnapshot={restoreSnapshot}
          onCreateSnapshot={createManualSnapshot}
          onSetSnapshotPinned={setSnapshotPinned}
        />
      )}

      {settingsOpen && (
        <EditorSettingsPanel
          preferences={editorPreferences}
          pwa={pwa}
          onChange={updateEditorPreferences}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {docsOpen && (
        <GlslDocsPanel
          initialName={docsInitialName}
          initialSection={docsInitialSection}
          onClose={() => setDocsOpen(false)}
        />
      )}

      {tunerOpen && (
        <UniformTunerPanel
          definitions={uniformDefinitions}
          values={activePass.uniformValues}
          onChange={updateUniformValue}
          onReset={() => setDocument(resetActivePassUniformValues)}
          onBake={bakeUniformValues}
          onOpenGuide={() => {
            setTunerOpen(false);
            openDocs(undefined, "uniforms");
          }}
          onClose={() => setTunerOpen(false)}
        />
      )}

      {shareImportNotice && (
        <div className="share-import-notice" role="status">
          <span>{shareImportNotice}</span>
          <button type="button" onClick={() => setShareImportNotice("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <PwaPrompt pwa={pwa} />
    </main>
  );
}
