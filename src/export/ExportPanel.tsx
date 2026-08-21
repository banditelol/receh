import { useEffect, useState } from "react";
import { type ShaderDocument } from "../document/shaderDocument.ts";
import { createProjectFile, createSourceFile, downloadBlob, safeFilename } from "./downloads.ts";
import { renderShaderPng } from "./renderExport.ts";

type ExportPanelProps = {
  document: ShaderDocument;
  source: string;
  canRender: boolean;
  onClose: () => void;
};

export function ExportPanel({ document, source, canRender, onClose }: ExportPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  const saveProject = () => {
    const file = createProjectFile(document);
    downloadBlob(file.blob, file.filename);
  };

  const saveSource = () => {
    const file = createSourceFile(document);
    downloadBlob(file.blob, file.filename);
  };

  const savePng = async () => {
    setBusy(true);
    setError("");
    try {
      const blob = await renderShaderPng(source);
      downloadBlob(blob, `${safeFilename(document.title)}-preview.png`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image export failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="export-backdrop" role="presentation" onMouseDown={busy ? undefined : onClose}>
      <section
        className="export-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="export-heading">
          <div>
            <span className="eyebrow">Local export</span>
            <h2 id="export-title">Save your shader</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose} disabled={busy}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close export panel</span>
          </button>
        </div>

        <p className="export-intro">
          Your working draft is auto-saved in this browser. Download portable files whenever you
          want a backup or something to share.
        </p>

        <div className="export-section">
          <div className="export-section-copy">
            <strong>Project files</strong>
            <span>Keep the complete project or just the active GLSL source.</span>
          </div>
          <div className="export-actions">
            <button className="secondary-button" type="button" onClick={saveProject}>
              Project JSON
            </button>
            <button className="secondary-button" type="button" onClick={saveSource}>
              GLSL source
            </button>
          </div>
        </div>

        <div className="export-section">
          <div className="export-section-copy">
            <strong>Still image</strong>
            <span>Render a square 1080 × 1080 PNG at the animation start.</span>
          </div>
          <button
            className="secondary-button export-primary"
            type="button"
            onClick={savePng}
            disabled={busy || !canRender}
          >
            {busy ? "Rendering…" : "Export PNG"}
          </button>
        </div>

        {!canRender && <p className="export-warning">Fix shader errors before exporting media.</p>}
        {error && (
          <p className="export-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
