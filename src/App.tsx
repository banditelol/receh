import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_SHADER } from "./defaultShader.ts";
import {
  createShaderDocument,
  getActivePass,
  updateActivePassSource,
  type ShaderDocument,
} from "./document/shaderDocument.ts";
import { loadShaderDocument, saveShaderDocument } from "./document/storage.ts";
import { ShaderEditor } from "./editor/ShaderEditor.tsx";
import { useVisualViewport } from "./hooks/useVisualViewport.ts";
import { ShaderCanvas } from "./renderer/ShaderCanvas.tsx";
import type { ShaderDiagnostic } from "./renderer/diagnostics.ts";

type MobilePane = "preview" | "code";
type CompileStatus = "compiling" | "ready" | "error" | "unsupported";

function readStoredDocument() {
  return loadShaderDocument(window.localStorage);
}

export function App() {
  useVisualViewport();
  const [document, setDocument] = useState<ShaderDocument>(readStoredDocument);
  const [compileRequest, setCompileRequest] = useState(0);
  const [status, setStatus] = useState<CompileStatus>("compiling");
  const [message, setMessage] = useState("Compiling");
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([]);
  const [mobilePane, setMobilePane] = useState<MobilePane>("preview");
  const [paused, setPaused] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<{
    line: number;
    request: number;
  } | null>(null);
  const activePass = getActivePass(document);
  const source = activePass.source;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCompileRequest((request) => request + 1);
      try {
        saveShaderDocument(window.localStorage, document);
      } catch {
        // Storage can be disabled without affecting the editor.
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [document]);

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

  const resetShader = () => {
    if (source !== DEFAULT_SHADER && window.confirm("Reset the shader to the starter scene?")) {
      setDocument(createShaderDocument());
    }
  };

  const updateSource = (nextSource: string) => {
    setDocument((current) => updateActivePassSource(current, nextSource));
  };

  const navigateToDiagnostic = (diagnostic: ShaderDiagnostic) => {
    setMobilePane("code");
    setNavigationTarget((current) => ({
      line: diagnostic.line,
      request: (current?.request ?? 0) + 1,
    }));
  };

  return (
    <main className={`app app--${mobilePane}`}>
      <header className="topbar">
        <div className="brand" aria-label="Shader Pocket">
          <span className="brand-mark" aria-hidden="true">
            ƒ
          </span>
          <span>Shader Pocket</span>
          <span className="prototype-tag">prototype</span>
        </div>
        <div className="top-actions">
          <button className="quiet-button" type="button" onClick={resetShader}>
            Reset
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
        <section className="preview-pane" aria-label="Shader preview panel">
          <ShaderCanvas
            source={source}
            compileRequest={compileRequest}
            paused={paused}
            onCompileState={handleCompileState}
          />
          <div className="preview-toolbar">
            <span className={`status status--${status}`}>
              <span className="status-dot" aria-hidden="true" />
              {statusText}
            </span>
            <button
              className="icon-button"
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Resume animation" : "Pause animation"}
            >
              {paused ? "Play" : "Pause"}
            </button>
          </div>
        </section>

        <section className="code-pane" aria-label="Code panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Fragment shader</span>
              <strong>{activePass.name}</strong>
            </div>
            <span className="language-pill">GLSL 300 ES</span>
          </div>
          <ShaderEditor
            value={source}
            diagnostics={diagnostics}
            onChange={updateSource}
            onRun={() => setCompileRequest((request) => request + 1)}
            navigationTarget={navigationTarget}
          />
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
    </main>
  );
}
