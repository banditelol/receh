import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
  type SqlValue,
} from "@sqlite.org/sqlite-wasm";
import {
  CREATE_DATABASE_SCHEMA_SQL,
  SHADER_POCKET_APPLICATION_ID,
  SHADER_POCKET_DATABASE_FILENAME,
  SHADER_POCKET_DATABASE_VERSION,
} from "./databaseSchema.ts";
import type { DatabaseRequest, DatabaseResponse, DatabaseResult } from "./databaseProtocol.ts";
import { hashShaderDocument } from "./documentHash.ts";
import {
  SNAPSHOT_RETENTION_LIMIT,
  type LibraryImportResult,
  type ProjectSummary,
  type RepositoryBootstrap,
  type SnapshotReason,
  type SnapshotSummary,
} from "./repository.ts";
import {
  cloneShaderDocumentWithNewIds,
  createPortableShaderDocument,
  migrateShaderDocument,
  parseImportedShaderDocument,
  type ShaderDocument,
  type ShaderPass,
} from "./shaderDocument.ts";

type WorkerScope = {
  onmessage: ((event: MessageEvent<DatabaseRequest>) => void) | null;
  postMessage(message: DatabaseResponse, transfer?: Transferable[]): void;
};

const workerScope = self as unknown as WorkerScope;
let sqlite3: Sqlite3Static | undefined;
let database: Database | undefined;
let persistent = false;

function requireDatabase() {
  if (!database) throw new Error("The shader library has not finished opening.");
  return database;
}

function asString(value: SqlValue | undefined, field: string) {
  if (typeof value !== "string") throw new Error(`The database contains an invalid ${field}.`);
  return value;
}

function asNumber(value: SqlValue | undefined, field: string) {
  if (typeof value !== "number") throw new Error(`The database contains an invalid ${field}.`);
  return value;
}

function getPragmaNumber(db: Database, pragma: string) {
  const value = db.selectValue(`PRAGMA ${pragma}`);
  return typeof value === "bigint" ? Number(value) : asNumber(value, pragma);
}

function ensureDatabaseSchema(db: Database) {
  const applicationId = getPragmaNumber(db, "application_id");
  const version = getPragmaNumber(db, "user_version");

  if (applicationId !== 0 && applicationId !== SHADER_POCKET_APPLICATION_ID) {
    throw new Error("This SQLite file belongs to another application.");
  }
  if (version > SHADER_POCKET_DATABASE_VERSION) {
    throw new Error(`Shader library version ${version} is newer than this app supports.`);
  }
  if (version !== 0 && version !== SHADER_POCKET_DATABASE_VERSION) {
    throw new Error(`Shader library version ${version} is not supported.`);
  }

  db.exec(CREATE_DATABASE_SCHEMA_SQL);
  db.exec(`PRAGMA application_id = ${SHADER_POCKET_APPLICATION_ID}`);
  db.exec(`PRAGMA user_version = ${SHADER_POCKET_DATABASE_VERSION}`);
  db.exec("PRAGMA foreign_keys = ON");
}

async function openDatabase() {
  if (database && sqlite3) return;
  sqlite3 = await sqlite3InitModule();
  const hasOpfs = Boolean(sqlite3.capi.sqlite3_vfs_find("opfs"));
  if (hasOpfs) {
    database = new sqlite3.oo1.OpfsDb(SHADER_POCKET_DATABASE_FILENAME, "c");
    persistent = true;
  } else {
    database = new sqlite3.oo1.DB(":memory:", "c");
    persistent = false;
  }
  ensureDatabaseSchema(database);
}

function listProjectsFrom(db: Database): ProjectSummary[] {
  return db
    .selectObjects("SELECT id, title, updated_at FROM projects ORDER BY updated_at DESC, title")
    .map((row) => ({
      id: asString(row.id, "project id"),
      title: asString(row.title, "project title"),
      updatedAt: asNumber(row.updated_at, "project update time"),
    }));
}

function loadDocumentFrom(db: Database, projectId: string): ShaderDocument | null {
  const project = db.selectObject(
    `SELECT id, title, active_pass_id, schema_version
     FROM projects WHERE id = ?`,
    [projectId],
  );
  if (!project) return null;

  const passes = db
    .selectObjects(
      `SELECT id, name, kind, language, source
       FROM passes WHERE project_id = ? ORDER BY position`,
      [projectId],
    )
    .map((row) => ({
      id: asString(row.id, "pass id"),
      name: asString(row.name, "pass name"),
      kind: asString(row.kind, "pass kind"),
      language: asString(row.language, "pass language"),
      source: asString(row.source, "pass source"),
    }));

  return migrateShaderDocument({
    schemaVersion: asNumber(project.schema_version, "document version"),
    id: asString(project.id, "project id"),
    title: asString(project.title, "project title"),
    activePassId: asString(project.active_pass_id, "active pass id"),
    passes,
  });
}

function loadDocument(projectId: string) {
  const document = loadDocumentFrom(requireDatabase(), projectId);
  if (!document) throw new Error("That shader project no longer exists.");
  return document;
}

function writeDocumentTo(db: Database, document: ShaderDocument, timestamp = Date.now()) {
  const existingCreatedAt = db.selectValue("SELECT created_at FROM projects WHERE id = ?", [
    document.id,
  ]);
  const createdAt =
    typeof existingCreatedAt === "number" || typeof existingCreatedAt === "bigint"
      ? Number(existingCreatedAt)
      : timestamp;

  db.transaction(() => {
    db.exec({
      sql: `INSERT INTO projects (
              id, title, active_pass_id, schema_version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              active_pass_id = excluded.active_pass_id,
              schema_version = excluded.schema_version,
              updated_at = excluded.updated_at`,
      bind: [
        document.id,
        document.title,
        document.activePassId,
        document.schemaVersion,
        createdAt,
        timestamp,
      ],
    });
    db.exec({ sql: "DELETE FROM passes WHERE project_id = ?", bind: [document.id] });
    document.passes.forEach((pass, position) => {
      db.exec({
        sql: `INSERT INTO passes (
                id, project_id, position, name, kind, language, source
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        bind: [pass.id, document.id, position, pass.name, pass.kind, pass.language, pass.source],
      });
    });
  });
}

function isSnapshotReason(value: string): value is SnapshotReason {
  return [
    "idle",
    "before-reset",
    "before-import",
    "before-restore",
    "migration",
    "imported",
  ].includes(value);
}

function trimSnapshots(db: Database, projectId: string) {
  db.exec({
    sql: `DELETE FROM snapshots
          WHERE id IN (
            SELECT id FROM snapshots
            WHERE project_id = ?
            ORDER BY created_at DESC, rowid DESC
            LIMIT -1 OFFSET ?
          )`,
    bind: [projectId, SNAPSHOT_RETENTION_LIMIT],
  });
}

async function insertSnapshot(
  db: Database,
  document: ShaderDocument,
  reason: SnapshotReason,
  options: { id?: string; createdAt?: number } = {},
) {
  const hash = await hashShaderDocument(document);
  db.exec({
    sql: `INSERT OR IGNORE INTO snapshots (
            id, project_id, created_at, reason, content_hash, document_json
          ) VALUES (?, ?, ?, ?, ?, ?)`,
    bind: [
      options.id ?? crypto.randomUUID(),
      document.id,
      options.createdAt ?? Date.now(),
      reason,
      hash,
      JSON.stringify(document),
    ],
  });
  const inserted = db.changes() > 0;
  trimSnapshots(db, document.id);
  return inserted;
}

function listSnapshots(projectId: string): SnapshotSummary[] {
  return requireDatabase()
    .selectObjects(
      `SELECT id, project_id, created_at, reason
       FROM snapshots WHERE project_id = ?
       ORDER BY created_at DESC, rowid DESC`,
      [projectId],
    )
    .map((row) => {
      const reason = asString(row.reason, "snapshot reason");
      if (!isSnapshotReason(reason)) throw new Error("The database contains an invalid snapshot.");
      return {
        id: asString(row.id, "snapshot id"),
        projectId: asString(row.project_id, "snapshot project id"),
        createdAt: asNumber(row.created_at, "snapshot time"),
        reason,
      };
    });
}

function loadSnapshot(snapshotId: string) {
  const serialized = requireDatabase().selectValue(
    "SELECT document_json FROM snapshots WHERE id = ?",
    [snapshotId],
  );
  if (typeof serialized !== "string") throw new Error("That recovery snapshot no longer exists.");
  return parseImportedShaderDocument(serialized);
}

function hasIdCollision(db: Database, document: ShaderDocument) {
  if (db.selectValue("SELECT 1 FROM projects WHERE id = ?", [document.id]) !== undefined) {
    return true;
  }
  return document.passes.some(
    (pass) => db.selectValue("SELECT 1 FROM passes WHERE id = ?", [pass.id]) !== undefined,
  );
}

function remapDocument(
  document: ShaderDocument,
  projectId: string,
  passIds: Map<string, string>,
): ShaderDocument {
  const passes = document.passes.map((pass) => {
    let id = passIds.get(pass.id);
    if (!id) {
      id = crypto.randomUUID();
      passIds.set(pass.id, id);
    }
    return { ...pass, id };
  }) as [ShaderPass, ...ShaderPass[]];
  return {
    ...document,
    id: projectId,
    activePassId: passIds.get(document.activePassId) ?? passes[0].id,
    passes,
  };
}

function openImportedDatabase(bytes: Uint8Array) {
  if (!sqlite3) throw new Error("SQLite is unavailable.");
  if (bytes.byteLength < 100) throw new Error("This file is too small to be a SQLite library.");
  const imported = new sqlite3.oo1.DB(":memory:", "c");
  const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
  const result = sqlite3.capi.sqlite3_deserialize(
    imported,
    "main",
    pointer,
    bytes.byteLength,
    bytes.byteLength,
    sqlite3.capi.SQLITE_DESERIALIZE_READONLY,
  );
  if (result !== sqlite3.capi.SQLITE_OK) {
    imported.close();
    sqlite3.wasm.dealloc(pointer);
    throw new Error("This file is not a readable SQLite database.");
  }
  return { imported, pointer };
}

async function importLibrary(bytes: Uint8Array): Promise<LibraryImportResult> {
  const target = requireDatabase();
  const { imported, pointer } = openImportedDatabase(bytes);
  try {
    const applicationId = getPragmaNumber(imported, "application_id");
    const version = getPragmaNumber(imported, "user_version");
    if (applicationId !== SHADER_POCKET_APPLICATION_ID) {
      throw new Error("This is not a Shader Pocket SQLite library.");
    }
    if (version !== SHADER_POCKET_DATABASE_VERSION) {
      throw new Error(`Shader library version ${version} is not supported.`);
    }

    const sourceProjects = listProjectsFrom(imported);
    if (sourceProjects.length === 0)
      throw new Error("This shader library does not contain projects.");

    const importedDocuments: ShaderDocument[] = [];
    let remappedProjectCount = 0;
    for (const project of sourceProjects) {
      const sourceDocument = loadDocumentFrom(imported, project.id);
      if (!sourceDocument) continue;
      const collision = hasIdCollision(target, sourceDocument);
      const projectId = collision ? crypto.randomUUID() : sourceDocument.id;
      const passIds = new Map<string, string>();
      const document = collision
        ? remapDocument(sourceDocument, projectId, passIds)
        : sourceDocument;
      if (collision) remappedProjectCount += 1;
      writeDocumentTo(target, document, project.updatedAt);
      importedDocuments.push(document);

      const snapshots = imported.selectObjects(
        `SELECT id, created_at, reason, document_json
         FROM snapshots WHERE project_id = ? ORDER BY created_at`,
        [sourceDocument.id],
      );
      for (const row of snapshots) {
        const reason = asString(row.reason, "snapshot reason");
        if (!isSnapshotReason(reason)) continue;
        try {
          const sourceSnapshot = parseImportedShaderDocument(
            asString(row.document_json, "snapshot document"),
          );
          const snapshot = collision
            ? remapDocument(sourceSnapshot, projectId, passIds)
            : sourceSnapshot;
          await insertSnapshot(target, snapshot, reason, {
            id: collision ? undefined : asString(row.id, "snapshot id"),
            createdAt: asNumber(row.created_at, "snapshot time"),
          });
        } catch {
          // A corrupt recovery row should not prevent valid projects from importing.
        }
      }
    }

    const document = importedDocuments[0];
    if (!document) throw new Error("No valid shader projects were found in this library.");
    return {
      document,
      projects: listProjectsFrom(target),
      importedProjectCount: importedDocuments.length,
      remappedProjectCount,
    };
  } finally {
    imported.close();
    sqlite3?.wasm.dealloc(pointer);
  }
}

async function initialize(payload: {
  preferredProjectId?: string;
  legacyDocument?: ShaderDocument;
}): Promise<RepositoryBootstrap> {
  await openDatabase();
  const db = requireDatabase();
  let projects = listProjectsFrom(db);
  let migratedLegacyDocument = false;

  if (projects.length === 0) {
    const initial = payload.legacyDocument
      ? cloneShaderDocumentWithNewIds(payload.legacyDocument)
      : createPortableShaderDocument();
    writeDocumentTo(db, initial);
    if (payload.legacyDocument) {
      await insertSnapshot(db, initial, "migration");
      migratedLegacyDocument = true;
    }
    projects = listProjectsFrom(db);
  }

  const preferred = payload.preferredProjectId
    ? loadDocumentFrom(db, payload.preferredProjectId)
    : null;
  const document = preferred ?? loadDocumentFrom(db, projects[0].id);
  if (!document) throw new Error("The shader library could not restore its active project.");

  return { document, projects, persistent, migratedLegacyDocument };
}

async function handleRequest(request: DatabaseRequest): Promise<DatabaseResult> {
  if (request.command === "initialize") return initialize(request.payload);
  await openDatabase();

  switch (request.command) {
    case "list-projects":
      return listProjectsFrom(requireDatabase());
    case "load-project":
      return loadDocument(request.payload.projectId);
    case "save-document":
      writeDocumentTo(requireDatabase(), request.payload.document);
      return listProjectsFrom(requireDatabase());
    case "import-document": {
      const imported = cloneShaderDocumentWithNewIds(request.payload.document);
      writeDocumentTo(requireDatabase(), imported);
      await insertSnapshot(requireDatabase(), imported, "imported");
      return imported;
    }
    case "create-snapshot":
      return insertSnapshot(requireDatabase(), request.payload.document, request.payload.reason);
    case "list-snapshots":
      return listSnapshots(request.payload.projectId);
    case "load-snapshot":
      return loadSnapshot(request.payload.snapshotId);
    case "export-library": {
      if (!sqlite3) throw new Error("SQLite is unavailable.");
      requireDatabase().exec("PRAGMA optimize");
      return sqlite3.capi.sqlite3_js_db_export(requireDatabase());
    }
    case "import-library":
      return importLibrary(request.payload.bytes);
  }
}

let operationQueue: Promise<void> = Promise.resolve();

workerScope.onmessage = (event) => {
  const run = async () => {
    try {
      const result = await handleRequest(event.data);
      const response: DatabaseResponse = { id: event.data.id, ok: true, result };
      if (result instanceof Uint8Array) {
        workerScope.postMessage(response, [result.buffer as ArrayBuffer]);
      } else {
        workerScope.postMessage(response);
      }
    } catch (reason) {
      const response: DatabaseResponse = {
        id: event.data.id,
        ok: false,
        error: reason instanceof Error ? reason.message : "The local shader library failed.",
      };
      workerScope.postMessage(response);
    }
  };
  operationQueue = operationQueue.then(run, run);
};
