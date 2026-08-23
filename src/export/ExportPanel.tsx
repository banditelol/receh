import { useEffect, useRef, useState } from "react";
import { type ShaderDocument } from "../document/shaderDocument.ts";
import type { ShaderPipelinePass } from "../renderer/passPipeline.ts";
import { createProjectFile, createSourceFile, downloadBlob, safeFilename } from "./downloads.ts";
import { renderShaderPng } from "./renderExport.ts";
import { createShareUrl, type ShareView } from "../share/shareLink.ts";
import {
  clampStoryDuration,
  getStoryVideoCapability,
  renderStoryVideo,
  STORY_VIDEO_MAX_DURATION,
  STORY_VIDEO_MIN_DURATION,
  type StoryVideoCapability,
} from "./storyVideo.ts";

type ExportPanelProps = {
  document: ShaderDocument;
  globalFunctionsSource: string;
  shareView: ShareView;
  canRender: boolean;
  passes: readonly ShaderPipelinePass[];
  onClose: () => void;
};

export function ExportPanel({
  document,
  globalFunctionsSource,
  shareView,
  canRender,
  passes,
  onClose,
}: ExportPanelProps) {
  const [busy, setBusy] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(15);
  const [progress, setProgress] = useState(0);
  const [storyCapability, setStoryCapability] = useState<StoryVideoCapability | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const recorderAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void getStoryVideoCapability()
      .then((capability) => {
        if (active) setStoryCapability(capability);
      })
      .catch(() => {
        if (active) setStoryCapability({ supported: false, frameRateMode: null });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && busy === null) onClose();
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

  const shareSource = async () => {
    setError("");
    setShareStatus("");
    try {
      const url = await createShareUrl(document, { globalFunctionsSource, shareView });
      setShareUrl(url);
      if (navigator.share) {
        await navigator.share({ title: `${document.title} · receh`, url });
        setShareStatus("Shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus("Link copied");
      } else {
        setShareStatus("Select and copy the link below");
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "The share link could not be created.");
    }
  };

  const savePng = async () => {
    setBusy("image");
    setError("");
    try {
      const blob = await renderShaderPng(passes, 0);
      downloadBlob(blob, `${safeFilename(document.title)}-preview.png`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image export failed.");
    } finally {
      setBusy(null);
    }
  };

  const saveStoryVideo = async () => {
    const selectedDuration = clampStoryDuration(duration);
    setDuration(selectedDuration);
    setBusy("video");
    setProgress(0);
    setError("");
    const controller = new AbortController();
    recorderAbortRef.current = controller;

    try {
      const result = await renderStoryVideo(passes, {
        durationSeconds: selectedDuration,
        signal: controller.signal,
        onProgress: setProgress,
      });
      downloadBlob(
        result.blob,
        `${safeFilename(document.title)}-story-${selectedDuration}s.${result.extension}`,
      );
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setError(reason instanceof Error ? reason.message : "Story video export failed.");
      }
    } finally {
      recorderAbortRef.current = null;
      setBusy(null);
      setProgress(0);
    }
  };

  return (
    <div
      className="export-backdrop"
      role="presentation"
      onMouseDown={busy === null ? onClose : undefined}
    >
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
          <button className="close-button" type="button" onClick={onClose} disabled={busy !== null}>
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
            <button
              className="secondary-button"
              type="button"
              onClick={saveProject}
              disabled={busy !== null}
            >
              Project JSON
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={saveSource}
              disabled={busy !== null}
            >
              GLSL source
            </button>
          </div>
        </div>

        <div className="export-section share-section">
          <div className="export-section-copy">
            <strong>Share editable code</strong>
            <span>
              Put this shader directly in a link. Anyone with the link can read the code and add it
              as a new local project.
            </span>
          </div>
          <button className="secondary-button export-primary" type="button" onClick={shareSource}>
            Share link
          </button>
          {shareUrl && (
            <label className="share-link-field">
              <span>{shareStatus || "Share link ready"}</span>
              <input
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Generated share link"
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          )}
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
            disabled={busy !== null || !canRender}
          >
            {busy === "image" ? "Rendering…" : "Export PNG"}
          </button>
        </div>

        <div className="export-section story-section">
          <div className="export-section-copy">
            <strong>Instagram Story video</strong>
            <span>
              Encode an H.264 MP4 at 1080 × 1920 with a{" "}
              {storyCapability?.frameRateMode === "constant" ? "constant" : "target"} 30 FPS. The
              shader timeline starts at zero.
            </span>
          </div>
          <div className="story-controls">
            <label>
              <span>Duration</span>
              <span className="duration-input">
                <input
                  type="number"
                  min={STORY_VIDEO_MIN_DURATION}
                  max={STORY_VIDEO_MAX_DURATION}
                  step="1"
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  disabled={busy !== null}
                  aria-label="Story duration in seconds"
                />
                <span>sec</span>
              </span>
            </label>
            <button
              className="story-button"
              type="button"
              onClick={saveStoryVideo}
              disabled={busy !== null || !canRender || storyCapability?.supported !== true}
            >
              {busy === "video" ? `Recording ${Math.round(progress * 100)}%` : "Record Story"}
            </button>
            {busy === "video" && (
              <button
                className="cancel-button"
                type="button"
                onClick={() => recorderAbortRef.current?.abort()}
              >
                Cancel
              </button>
            )}
          </div>
          {busy === "video" && (
            <div
              className="story-progress"
              role="progressbar"
              aria-label="Story recording progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>

        {!canRender && <p className="export-warning">Fix shader errors before exporting media.</p>}
        {storyCapability?.supported === false && (
          <p className="export-warning">This browser cannot encode H.264 Story video.</p>
        )}
        {error && (
          <p className="export-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
