import { useEffect, useState, type ChangeEvent } from "react";
import type { ProjectSummary, SnapshotSummary } from "../document/repository.ts";
import type { ShaderDocument } from "../document/shaderDocument.ts";
import { MAX_SNAPSHOT_NAME_LENGTH } from "../document/snapshotMetadata.ts";
import type { LibrarySaveStatus } from "../document/useShaderLibrary.ts";
import { formatStorageSize, type StorageHealth } from "../pwa/useStorageHealth.ts";

type LibraryPanelProps = {
  document: ShaderDocument;
  projects: ProjectSummary[];
  snapshots: SnapshotSummary[];
  saveStatus: LibrarySaveStatus;
  storageMessage: string;
  persistent: boolean;
  storageHealth: StorageHealth;
  onClose: () => void;
  onRename: (title: string) => void;
  onOpenProject: (projectId: string) => Promise<void>;
  onCreateProject: () => Promise<void>;
  onImportProject: (file: File) => Promise<void>;
  onImportLibrary: (file: File) => Promise<void>;
  onExportLibrary: () => Promise<void>;
  onRestoreSnapshot: (snapshotId: string) => Promise<void>;
  onCreateSnapshot: (name: string, pinned: boolean) => Promise<void>;
  onSetSnapshotPinned: (snapshotId: string, pinned: boolean) => Promise<void>;
};

export const SAVE_STATUS_LABELS: Record<LibrarySaveStatus, string> = {
  loading: "Opening library",
  saving: "Saving",
  saved: "Saved",
  unavailable: "Memory only",
  "recovery-needed": "Recovery needed",
};

const SNAPSHOT_LABELS: Record<SnapshotSummary["reason"], string> = {
  manual: "Manual snapshot",
  idle: "Quiet edit",
  "before-reset": "Before reset",
  "before-import": "Before import",
  "before-restore": "Before restore",
  "before-bake": "Before baking controls",
  migration: "Browser draft migration",
  imported: "Imported project",
};

function formatSnapshotTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function LibraryPanel({
  document,
  projects,
  snapshots,
  saveStatus,
  storageMessage,
  persistent,
  storageHealth,
  onClose,
  onRename,
  onOpenProject,
  onCreateProject,
  onImportProject,
  onImportLibrary,
  onExportLibrary,
  onRestoreSnapshot,
  onCreateSnapshot,
  onSetSnapshotPinned,
}: LibraryPanelProps) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [pinNewSnapshot, setPinNewSnapshot] = useState(true);
  const pinnedSnapshotCount = snapshots.filter((snapshot) => snapshot.pinned).length;
  const recentSnapshotCount = snapshots.length - pinnedSnapshotCount;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  const run = async (label: string, action: () => Promise<void>, closeAfter = false) => {
    setBusy(label);
    setError("");
    try {
      await action();
      if (closeAfter) onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The library action failed.");
    } finally {
      setBusy("");
    }
  };

  const handleProjectImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void run("project-import", () => onImportProject(file), true);
  };

  const handleLibraryImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void run("library-import", () => onImportLibrary(file));
  };

  return (
    <div className="library-backdrop" role="presentation" onMouseDown={!busy ? onClose : undefined}>
      <section
        className="library-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="library-heading">
          <div>
            <span className="eyebrow">Portable SQLite workspace</span>
            <h2 id="library-title">Shader library</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose} disabled={Boolean(busy)}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close shader library</span>
          </button>
        </div>

        <div
          className={`library-storage library-storage--${saveStatus} ${
            storageHealth.pressure ? "library-storage--pressure" : ""
          }`}
          role="status"
        >
          <span className="library-storage-dot" aria-hidden="true" />
          <span>
            <strong>{SAVE_STATUS_LABELS[saveStatus]}</strong>
            <small>{storageMessage}</small>
            {storageHealth.supported && (
              <small className="library-storage-usage">
                {storageHealth.pressure
                  ? `Browser storage is ${Math.round(storageHealth.ratio * 100)}% full. Make a library backup soon.`
                  : `${formatStorageSize(storageHealth.usage)} used of ${formatStorageSize(storageHealth.quota)} browser storage.`}
              </small>
            )}
          </span>
        </div>

        <div className="library-title-field">
          <label htmlFor="project-title">Current project</label>
          <input
            id="project-title"
            key={document.id}
            defaultValue={document.title}
            maxLength={120}
            onBlur={(event) => onRename(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>

        <div className="library-grid">
          <section className="library-section" aria-labelledby="projects-title">
            <div className="library-section-heading">
              <div>
                <span className="eyebrow">Projects</span>
                <h3 id="projects-title">Local work</h3>
              </div>
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run("new", onCreateProject, true)}
              >
                {busy === "new" ? "Creating…" : "New"}
              </button>
            </div>
            <div className="project-list">
              {projects.map((project) => (
                <button
                  className="project-row"
                  type="button"
                  key={project.id}
                  aria-current={project.id === document.id ? "true" : undefined}
                  disabled={Boolean(busy) || project.id === document.id}
                  onClick={() => void run("open", () => onOpenProject(project.id), true)}
                >
                  <span>{project.title}</span>
                  <small>{new Date(project.updatedAt).toLocaleDateString()}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="library-section" aria-labelledby="recovery-title">
            <div className="library-section-heading">
              <div>
                <span className="eyebrow">History</span>
                <h3 id="recovery-title">Snapshots</h3>
              </div>
              <span className="snapshot-count">
                {recentSnapshotCount}/50{pinnedSnapshotCount > 0 ? ` + ${pinnedSnapshotCount}` : ""}
              </span>
            </div>
            <div className="snapshot-create">
              <input
                type="text"
                value={snapshotName}
                maxLength={MAX_SNAPSHOT_NAME_LENGTH}
                placeholder="Name this point (optional)"
                aria-label="Snapshot name"
                disabled={Boolean(busy)}
                onChange={(event) => setSnapshotName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !busy) {
                    void run("snapshot", async () => {
                      await onCreateSnapshot(snapshotName, pinNewSnapshot);
                      setSnapshotName("");
                    });
                  }
                }}
              />
              <label className="snapshot-keep">
                <input
                  type="checkbox"
                  checked={pinNewSnapshot}
                  disabled={Boolean(busy)}
                  onChange={(event) => setPinNewSnapshot(event.target.checked)}
                />
                Keep
              </label>
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(busy)}
                onClick={() =>
                  void run("snapshot", async () => {
                    await onCreateSnapshot(snapshotName, pinNewSnapshot);
                    setSnapshotName("");
                  })
                }
              >
                {busy === "snapshot" ? "Saving…" : "Save point"}
              </button>
            </div>
            <div className="snapshot-list">
              {snapshots.length === 0 ? (
                <p className="library-empty">
                  Save a named point, or keep editing for automatic recovery snapshots.
                </p>
              ) : (
                snapshots.map((snapshot) => (
                  <article className="snapshot-row" key={snapshot.id}>
                    <button
                      className="snapshot-restore"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        const label = snapshot.name ?? SNAPSHOT_LABELS[snapshot.reason];
                        if (
                          window.confirm(
                            `Restore “${label}”? A recovery copy of your current project will be created first.`,
                          )
                        ) {
                          void run("restore", () => onRestoreSnapshot(snapshot.id), true);
                        }
                      }}
                    >
                      <span className="snapshot-title">
                        <strong>{snapshot.name ?? SNAPSHOT_LABELS[snapshot.reason]}</strong>
                        <time dateTime={new Date(snapshot.createdAt).toISOString()}>
                          {formatSnapshotTime(snapshot.createdAt)}
                        </time>
                      </span>
                      <small className="snapshot-meta">
                        {snapshot.reason === "manual"
                          ? "Manual"
                          : `Automatic · ${SNAPSHOT_LABELS[snapshot.reason]}`}
                        {` · ${snapshot.passName} · ${snapshot.lineCount} ${snapshot.lineCount === 1 ? "line" : "lines"} · ${formatStorageSize(snapshot.sourceBytes)}`}
                      </small>
                      <code>{snapshot.sourcePreview}</code>
                    </button>
                    <button
                      className="snapshot-pin"
                      type="button"
                      aria-pressed={snapshot.pinned}
                      aria-label={
                        snapshot.pinned
                          ? `Allow ${snapshot.name ?? SNAPSHOT_LABELS[snapshot.reason]} to expire`
                          : `Keep ${snapshot.name ?? SNAPSHOT_LABELS[snapshot.reason]}`
                      }
                      title={snapshot.pinned ? "Protected from automatic cleanup" : "Keep snapshot"}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void run(`pin-${snapshot.id}`, () =>
                          onSetSnapshotPinned(snapshot.id, !snapshot.pinned),
                        )
                      }
                    >
                      <span aria-hidden="true">{snapshot.pinned ? "◆" : "◇"}</span>
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="library-transfer" aria-labelledby="transfer-title">
          <div>
            <span className="eyebrow">Move your work</span>
            <h3 id="transfer-title">Import and backup</h3>
            <p>
              Project files add one shader. A SQLite backup carries the complete multi-project
              library and recovery history.
            </p>
          </div>
          <div className="library-actions">
            <label className={`secondary-button file-button ${busy ? "is-disabled" : ""}`}>
              Import project
              <input
                className="sr-only"
                type="file"
                accept=".receh.json,.shaderpocket.json,.json,.frag,application/json,text/plain"
                disabled={Boolean(busy)}
                onChange={handleProjectImport}
              />
            </label>
            <label className={`secondary-button file-button ${busy ? "is-disabled" : ""}`}>
              Import library
              <input
                className="sr-only"
                type="file"
                accept=".sqlite3,.sqlite,.db,application/vnd.sqlite3"
                disabled={Boolean(busy)}
                onChange={handleLibraryImport}
              />
            </label>
            <button
              className="secondary-button export-primary"
              type="button"
              disabled={Boolean(busy) || !persistent}
              onClick={() => void run("export", onExportLibrary)}
            >
              {busy === "export" ? "Preparing…" : "Backup library"}
            </button>
          </div>
        </section>

        {error && (
          <p className="library-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
