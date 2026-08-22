import { useCallback, useEffect, useRef, useState } from "react";
import { downloadBlob } from "../export/downloads.ts";
import { getBrowserShaderRepository } from "./browserRepository.ts";
import { readLibraryImport, readProjectImport } from "./imports.ts";
import {
  IDLE_SNAPSHOT_DELAY_MS,
  type ProjectSummary,
  type SnapshotReason,
  type SnapshotSummary,
} from "./repository.ts";
import {
  ACTIVE_PROJECT_STORAGE_KEY,
  clearMigratedDocumentStorage,
  loadShaderDocument,
  loadStoredDocumentForMigration,
} from "./storage.ts";
import {
  createPortableShaderDocument,
  type ShaderDocument,
  updateDocumentTitle,
} from "./shaderDocument.ts";

export type LibrarySaveStatus = "loading" | "saving" | "saved" | "unavailable" | "recovery-needed";

const repository = getBrowserShaderRepository();

function readInitialDocument() {
  return loadShaderDocument(window.localStorage);
}

export function useShaderLibrary() {
  const [document, setDocument] = useState<ShaderDocument>(readInitialDocument);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<LibrarySaveStatus>("loading");
  const [storageMessage, setStorageMessage] = useState("");
  const [persistent, setPersistent] = useState(false);
  const [ready, setReady] = useState(false);
  const documentRef = useRef(document);
  const persistentRef = useRef(false);
  const saveRevisionRef = useRef(0);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    let active = true;
    const legacyDocument = loadStoredDocumentForMigration(window.localStorage) ?? undefined;
    const preferredProjectId = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) ?? undefined;
    void repository
      .initialize({ preferredProjectId, legacyDocument })
      .then((bootstrap) => {
        if (!active) return;
        setDocument(bootstrap.document);
        setProjects(bootstrap.projects);
        setPersistent(bootstrap.persistent);
        persistentRef.current = bootstrap.persistent;
        setReady(true);
        setSaveStatus(bootstrap.persistent ? "saved" : "unavailable");
        setStorageMessage(
          bootstrap.persistent
            ? bootstrap.migratedLegacyDocument
              ? "Your previous browser draft was migrated into the SQLite library."
              : "Saved in the local SQLite library."
            : "Persistent browser storage is unavailable; edits remain in memory only.",
        );
        window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, bootstrap.document.id);
        if (bootstrap.persistent) clearMigratedDocumentStorage(window.localStorage);
        if (bootstrap.persistent && navigator.storage?.persist) {
          void navigator.storage.persist().catch(() => undefined);
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setReady(false);
        setPersistent(false);
        persistentRef.current = false;
        setSaveStatus("recovery-needed");
        setStorageMessage(
          reason instanceof Error ? reason.message : "The local shader library could not open.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const persistDocument = useCallback(
    async (nextDocument: ShaderDocument) => {
      if (!ready) return;
      const revision = ++saveRevisionRef.current;
      setSaveStatus(persistentRef.current ? "saving" : "unavailable");
      try {
        const nextProjects = await repository.saveDocument(nextDocument);
        setProjects(nextProjects);
        window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, nextDocument.id);
        if (revision === saveRevisionRef.current) {
          setSaveStatus(persistentRef.current ? "saved" : "unavailable");
          setStorageMessage(
            persistentRef.current
              ? "Saved in the local SQLite library."
              : "Persistent browser storage is unavailable; edits remain in memory only.",
          );
        }
      } catch (reason) {
        if (revision === saveRevisionRef.current) {
          setSaveStatus("recovery-needed");
          setStorageMessage(
            reason instanceof Error ? reason.message : "This edit could not be saved locally.",
          );
        }
        throw reason;
      }
    },
    [ready],
  );

  useEffect(() => {
    if (!ready) return;
    setSaveStatus(persistentRef.current ? "saving" : "unavailable");
    const timer = window.setTimeout(() => {
      void persistDocument(document).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [document, persistDocument, ready]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void repository.createSnapshot(document, "idle").catch((reason: unknown) => {
        setSaveStatus("recovery-needed");
        setStorageMessage(
          reason instanceof Error ? reason.message : "A recovery snapshot could not be created.",
        );
      });
    }, IDLE_SNAPSHOT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [document, ready]);

  const createSnapshot = useCallback(
    async (reason: SnapshotReason) => {
      if (!ready) return false;
      return repository.createSnapshot(documentRef.current, reason);
    },
    [ready],
  );

  const refreshSnapshots = useCallback(async () => {
    if (!ready) return;
    try {
      setSnapshots(await repository.listSnapshots(documentRef.current.id));
    } catch (reason) {
      setStorageMessage(
        reason instanceof Error ? reason.message : "Recovery snapshots could not be loaded.",
      );
    }
  }, [ready]);

  const openProject = useCallback(
    async (projectId: string) => {
      await persistDocument(documentRef.current);
      const nextDocument = await repository.loadProject(projectId);
      documentRef.current = nextDocument;
      setDocument(nextDocument);
      setSnapshots([]);
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, nextDocument.id);
    },
    [persistDocument],
  );

  const createProject = useCallback(async () => {
    await persistDocument(documentRef.current);
    const nextDocument = createPortableShaderDocument();
    const nextProjects = await repository.saveDocument(nextDocument);
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setProjects(nextProjects);
    setSnapshots([]);
    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, nextDocument.id);
  }, [persistDocument]);

  const importProject = useCallback(
    async (file: File) => {
      await createSnapshot("before-import");
      const imported = await repository.importDocument(await readProjectImport(file));
      documentRef.current = imported;
      setDocument(imported);
      setProjects(await repository.listProjects());
      setSnapshots(await repository.listSnapshots(imported.id));
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, imported.id);
    },
    [createSnapshot],
  );

  const importLibrary = useCallback(
    async (file: File) => {
      await createSnapshot("before-import");
      const result = await repository.importLibrary(await readLibraryImport(file));
      documentRef.current = result.document;
      setDocument(result.document);
      setProjects(result.projects);
      setSnapshots(await repository.listSnapshots(result.document.id));
      setStorageMessage(
        `Imported ${result.importedProjectCount} project${result.importedProjectCount === 1 ? "" : "s"}${
          result.remappedProjectCount > 0
            ? ` and safely remapped ${result.remappedProjectCount} ID collision${result.remappedProjectCount === 1 ? "" : "s"}`
            : ""
        }.`,
      );
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, result.document.id);
    },
    [createSnapshot],
  );

  const exportLibrary = useCallback(async () => {
    await persistDocument(documentRef.current);
    const bytes = await repository.exportLibrary();
    downloadBlob(
      new Blob([bytes.slice().buffer], { type: "application/vnd.sqlite3" }),
      "receh.sqlite3",
    );
  }, [persistDocument]);

  const restoreSnapshot = useCallback(
    async (snapshotId: string) => {
      await createSnapshot("before-restore");
      const restored = await repository.loadSnapshot(snapshotId);
      documentRef.current = restored;
      setDocument(restored);
      await persistDocument(restored);
      setSnapshots(await repository.listSnapshots(restored.id));
    },
    [createSnapshot, persistDocument],
  );

  const renameDocument = useCallback((title: string) => {
    setDocument((current) => updateDocumentTitle(current, title));
  }, []);

  return {
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
  };
}
