import type { ShaderDocument } from "./shaderDocument.ts";

export const SNAPSHOT_RETENTION_LIMIT = 50;
export const IDLE_SNAPSHOT_DELAY_MS = 30_000;

export type SnapshotReason =
  | "idle"
  | "before-reset"
  | "before-import"
  | "before-restore"
  | "before-bake"
  | "migration"
  | "imported";

export type ProjectSummary = {
  id: string;
  title: string;
  updatedAt: number;
};

export type SnapshotSummary = {
  id: string;
  projectId: string;
  createdAt: number;
  reason: SnapshotReason;
};

export type RepositoryBootstrap = {
  document: ShaderDocument;
  projects: ProjectSummary[];
  persistent: boolean;
  migratedLegacyDocument: boolean;
};

export type LibraryImportResult = {
  document: ShaderDocument;
  projects: ProjectSummary[];
  importedProjectCount: number;
  remappedProjectCount: number;
};

export interface ShaderRepository {
  initialize(options: {
    preferredProjectId?: string;
    legacyDocument?: ShaderDocument;
  }): Promise<RepositoryBootstrap>;
  listProjects(): Promise<ProjectSummary[]>;
  loadProject(projectId: string): Promise<ShaderDocument>;
  saveDocument(document: ShaderDocument): Promise<ProjectSummary[]>;
  importDocument(document: ShaderDocument): Promise<ShaderDocument>;
  createSnapshot(document: ShaderDocument, reason: SnapshotReason): Promise<boolean>;
  listSnapshots(projectId: string): Promise<SnapshotSummary[]>;
  loadSnapshot(snapshotId: string): Promise<ShaderDocument>;
  exportLibrary(): Promise<Uint8Array>;
  importLibrary(bytes: Uint8Array): Promise<LibraryImportResult>;
}
