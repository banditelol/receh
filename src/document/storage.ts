import {
  createShaderDocument,
  migrateShaderDocument,
  parseShaderDocument,
  type ShaderDocument,
} from "./shaderDocument.ts";

export const DOCUMENT_STORAGE_KEY = "shader-pocket-document-v1";
export const LEGACY_SOURCE_STORAGE_KEY = "shader-pocket-source-v1";
export const ACTIVE_PROJECT_STORAGE_KEY = "shader-pocket-active-project-v1";

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem" | "removeItem">;

export function loadShaderDocument(storage: StorageReader): ShaderDocument {
  return loadStoredDocumentForMigration(storage) ?? createShaderDocument();
}

export function loadStoredDocumentForMigration(storage: StorageReader): ShaderDocument | null {
  try {
    const storedDocument = storage.getItem(DOCUMENT_STORAGE_KEY);
    if (storedDocument) return parseShaderDocument(storedDocument);

    const legacySource = storage.getItem(LEGACY_SOURCE_STORAGE_KEY);
    if (legacySource) return migrateShaderDocument({ schemaVersion: 0, source: legacySource });
  } catch {
    // Storage can be blocked or unavailable. The editor still works in memory.
  }

  return null;
}

export function saveShaderDocument(storage: StorageWriter, document: ShaderDocument) {
  storage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(document));
  storage.removeItem(LEGACY_SOURCE_STORAGE_KEY);
}

export function clearMigratedDocumentStorage(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(DOCUMENT_STORAGE_KEY);
  storage.removeItem(LEGACY_SOURCE_STORAGE_KEY);
}
