import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SHADER } from "./defaultShader.ts";
import {
  getActivePass,
  resetActivePassUniformValues,
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
import type { GlslReferenceEntry } from "./editor/glslCatalog.ts";
import { ShaderEditor } from "./editor/ShaderEditor.tsx";
import { ExportPanel } from "./export/ExportPanel.tsx";
import { useVisualViewport } from "./hooks/useVisualViewport.ts";
import { LibraryPanel, SAVE_STATUS_LABELS } from "./library/LibraryPanel.tsx";
import { PwaPrompt } from "./pwa/PwaPrompt.tsx";
import { usePwa } from "./pwa/usePwa.ts";
import { useStorageHealth } from "./pwa/useStorageHealth.ts";
import { ShaderCanvas } from "./renderer/ShaderCanvas.tsx";
import type { ShaderDiagnostic } from "./renderer/diagnostics.ts";
import { EditorSettingsPanel } from "./settings/EditorSettingsPanel.tsx";
import { UniformTunerPanel } from "./uniforms/UniformTunerPanel.tsx";
import { decodeSharedSource, removeShareCodeFromUrl } from "./share/shareLink.ts";
import {
  bakeUniformValuesIntoSource,
  parseTunableUniforms,
  resolveRuntimeUniforms,
} from "./uniforms/uniformParser.ts";
import type { ShaderUniformValue } from "./uniforms/uniformTypes.ts";

type MobilePane = "preview" | "code";
type CompileStatus = "compiling" | "ready" | "error" | "unsupported";

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
    refreshSnapshots,
    openProject,
    createProject,
    importProject,
    importLibrary,
    exportLibrary,
    restoreSnapshot,
    renameDocument,
  } = useShaderLibrary();
  const [compileRequest, setCompileRequest] = useState(0);
  const [status, setStatus] = useState<CompileStatus>("compiling");
  const [message, setMessage] = useState("Compiling");
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([]);
  const [mobilePane, setMobilePane] = useState<MobilePane>("preview");
  const [paused, setPaused] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsInitialName, setDocsInitialName] = useState<string>();
  const [cursorReference, setCursorReference] = useState<GlslReferenceEntry | null>(null);
  const [searchRequest, setSearchRequest] = useState(0);
  const [shareImportNotice, setShareImportNotice] = useState("");
  const shareImportStartedRef = useRef(false);
  const previewPaneRef = useRef<HTMLElement>(null);
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
    if (!ready || shareImportStartedRef.current) return;
    const payload = new URL(window.location.href).searchParams.get("code");
    shareImportStartedRef.current = true;
    if (!payload) return;

    void decodeSharedSource(payload)
      .then(async (sharedSource) => {
        await importProject(
          new File([sharedSource], "Shared shader.frag", { type: "text/plain;charset=utf-8" }),
        );
        window.history.replaceState(null, "", removeShareCodeFromUrl());
        setShareImportNotice("Shared shader added to your local library.");
      })
      .catch((reason: unknown) => {
        setShareImportNotice(
          reason instanceof Error ? reason.message : "This shared shader could not be opened.",
        );
      });
  }, [importProject, ready]);

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

  const navigateToDiagnostic = (diagnostic: ShaderDiagnostic) => {
    setMobilePane("code");
    setNavigationTarget((current) => ({
      line: diagnostic.line,
      request: (current?.request ?? 0) + 1,
    }));
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

  const openDocs = (name?: string) => {
    setDocsInitialName(name);
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
      className={`app app--${mobilePane} app--code-presentation-${editorPreferences.phoneCodePresentation}`}
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
            className="run-button"
            type="button"
            onClick={() => setCompileRequest((request) => request + 1)}
          >
            Run <span aria-hidden="true">↵</span>
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
            uniforms={runtimeUniforms}
            onCompileState={handleCompileState}
          />
          <div className="preview-toolbar">
            <span className={`status status--${status}`}>
              <span className="status-dot" aria-hidden="true" />
              {statusText}
            </span>
            <span className="preview-toolbar-actions">
              <button
                className="icon-button"
                type="button"
                onClick={() => setTunerOpen(true)}
                aria-label={`Tune ${uniformDefinitions.length} custom shader uniforms`}
              >
                Tune{uniformDefinitions.length > 0 ? ` ${uniformDefinitions.length}` : ""}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Resume animation" : "Pause animation"}
              >
                {paused ? "Play" : "Pause"}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => void togglePreviewFullscreen()}
                aria-label={
                  previewFullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"
                }
                aria-pressed={previewFullscreen}
              >
                {previewFullscreen ? "Exit" : "Full"}
              </button>
            </span>
          </div>
        </section>

        <section className="code-pane" aria-label="Code panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Fragment shader</span>
              <strong>{activePass.name}</strong>
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
          <ShaderEditor
            value={source}
            diagnostics={diagnostics}
            onChange={updateSource}
            onRun={() => setCompileRequest((request) => request + 1)}
            navigationTarget={navigationTarget}
            preferences={editorPreferences}
            searchRequest={searchRequest}
            onReferenceChange={setCursorReference}
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
          {status === "error" && (
            <div className="error-drawer" role="status" aria-live="polite">
              {diagnostics.length > 0 ? (
                diagnostics.map((diagnostic, index) => (
                  <button
                    type="button"
                    className="diagnostic-link"
                    key={`${diagnostic.line}-${diagnostic.message}-${index}`}
                    onClick={() => navigateToDiagnostic(diagnostic)}
                  >
                    <strong>Line {diagnostic.line}</strong>
                    <span>{diagnostic.message}</span>
                  </button>
                ))
              ) : (
                <span>{message}</span>
              )}
            </div>
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
        />
      )}

      {settingsOpen && (
        <EditorSettingsPanel
          preferences={editorPreferences}
          onChange={updateEditorPreferences}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {docsOpen && (
        <GlslDocsPanel initialName={docsInitialName} onClose={() => setDocsOpen(false)} />
      )}

      {tunerOpen && (
        <UniformTunerPanel
          definitions={uniformDefinitions}
          values={activePass.uniformValues}
          onChange={updateUniformValue}
          onReset={() => setDocument(resetActivePassUniformValues)}
          onBake={bakeUniformValues}
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
