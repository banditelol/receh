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
  | { id: number; command: "save-global-functions"; payload: { source: string } }
  | { id: number; command: "import-document"; payload: { document: ShaderDocument } }
  | {
      id: number;
      command: "create-snapshot";
      payload: { document: ShaderDocument; reason: SnapshotReason };
    }
  | {
      id: number;
      command: "create-manual-snapshot";
      payload: { document: ShaderDocument; name?: string; pinned: boolean };
    }
  | { id: number; command: "list-snapshots"; payload: { projectId: string } }
  | {
      id: number;
      command: "set-snapshot-pinned";
      payload: { snapshotId: string; pinned: boolean };
    }
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
  | SnapshotSummary
  | SnapshotSummary[]
  | LibraryImportResult
  | Uint8Array
  | undefined
  | boolean;

export type DatabaseResponse =
  | { id: number; ok: true; result: DatabaseResult }
  | { id: number; ok: false; error: string };
