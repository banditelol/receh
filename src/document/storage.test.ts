import { describe, expect, it } from "vite-plus/test";
import { getActivePass, updateActivePassSource } from "./shaderDocument.ts";
import {
  clearMigratedDocumentStorage,
  DOCUMENT_STORAGE_KEY,
  LEGACY_SOURCE_STORAGE_KEY,
  loadShaderDocument,
  loadStoredDocumentForMigration,
  saveShaderDocument,
} from "./storage.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("shader document storage", () => {
  it("loads and migrates the previous source storage key", () => {
    const storage = memoryStorage({ [LEGACY_SOURCE_STORAGE_KEY]: "legacy source" });
    expect(getActivePass(loadShaderDocument(storage)).source).toBe("legacy source");
  });

  it("saves the current schema and removes the legacy key", () => {
    const storage = memoryStorage({ [LEGACY_SOURCE_STORAGE_KEY]: "legacy source" });
    const document = updateActivePassSource(loadShaderDocument(storage), "new source");

    saveShaderDocument(storage, document);

    expect(storage.getItem(LEGACY_SOURCE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(DOCUMENT_STORAGE_KEY)).toContain('"schemaVersion":1');
  });

  it("distinguishes an empty legacy store from a starter document", () => {
    expect(loadStoredDocumentForMigration(memoryStorage())).toBeNull();
  });

  it("clears both migrated browser draft formats", () => {
    const storage = memoryStorage({
      [DOCUMENT_STORAGE_KEY]: "document",
      [LEGACY_SOURCE_STORAGE_KEY]: "source",
    });
    clearMigratedDocumentStorage(storage);
    expect(storage.getItem(DOCUMENT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_SOURCE_STORAGE_KEY)).toBeNull();
  });
});
