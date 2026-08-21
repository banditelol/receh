import type {
  LibraryImportResult,
  ProjectSummary,
  RepositoryBootstrap,
  SnapshotReason,
  SnapshotSummary,
} from "./repository.ts";
import type { ShaderDocument } from "./shaderDocument.ts";

export type DatabaseRequest =
  | {
      id: number;
      command: "initialize";
      payload: { preferredProjectId?: string; legacyDocument?: ShaderDocument };
    }
  | { id: number; command: "list-projects" }
  | { id: number; command: "load-project"; payload: { projectId: string } }
  | { id: number; command: "save-document"; payload: { document: ShaderDocument } }
  | { id: number; command: "import-document"; payload: { document: ShaderDocument } }
  | {
      id: number;
      command: "create-snapshot";
      payload: { document: ShaderDocument; reason: SnapshotReason };
    }
  | { id: number; command: "list-snapshots"; payload: { projectId: string } }
  | { id: number; command: "load-snapshot"; payload: { snapshotId: string } }
  | { id: number; command: "export-library" }
  | { id: number; command: "import-library"; payload: { bytes: Uint8Array } };

export type DatabaseRequestWithoutId = DatabaseRequest extends infer Request
  ? Request extends { id: number }
    ? Omit<Request, "id">
    : never
  : never;

export type DatabaseResult =
  | RepositoryBootstrap
  | ProjectSummary[]
  | ShaderDocument
  | SnapshotSummary[]
  | LibraryImportResult
  | Uint8Array
  | boolean;

export type DatabaseResponse =
  | { id: number; ok: true; result: DatabaseResult }
  | { id: number; ok: false; error: string };
