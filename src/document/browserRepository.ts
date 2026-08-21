import type {
  LibraryImportResult,
  ProjectSummary,
  RepositoryBootstrap,
  ShaderRepository,
  SnapshotReason,
  SnapshotSummary,
} from "./repository.ts";
import type {
  DatabaseRequest,
  DatabaseRequestWithoutId,
  DatabaseResponse,
  DatabaseResult,
} from "./databaseProtocol.ts";
import type { ShaderDocument } from "./shaderDocument.ts";

class BrowserShaderRepository implements ShaderRepository {
  readonly #worker = new Worker(new URL("./sqlite.worker.ts", import.meta.url), { type: "module" });
  readonly #pending = new Map<
    number,
    { resolve: (result: DatabaseResult) => void; reject: (reason: Error) => void }
  >();
  #requestId = 0;

  constructor() {
    this.#worker.addEventListener("message", (event: MessageEvent<DatabaseResponse>) => {
      const pending = this.#pending.get(event.data.id);
      if (!pending) return;
      this.#pending.delete(event.data.id);
      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.error));
    });
    this.#worker.addEventListener("error", () => {
      for (const pending of this.#pending.values()) {
        pending.reject(new Error("The local SQLite worker could not be started."));
      }
      this.#pending.clear();
    });
  }

  #request<T extends DatabaseResult>(
    request: DatabaseRequestWithoutId,
    transfer: Transferable[] = [],
  ): Promise<T> {
    const id = ++this.#requestId;
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
      });
      this.#worker.postMessage({ ...request, id } as DatabaseRequest, transfer);
    });
  }

  initialize(options: {
    preferredProjectId?: string;
    legacyDocument?: ShaderDocument;
  }): Promise<RepositoryBootstrap> {
    return this.#request({ command: "initialize", payload: options });
  }

  listProjects(): Promise<ProjectSummary[]> {
    return this.#request({ command: "list-projects" });
  }

  loadProject(projectId: string): Promise<ShaderDocument> {
    return this.#request({ command: "load-project", payload: { projectId } });
  }

  saveDocument(document: ShaderDocument): Promise<ProjectSummary[]> {
    return this.#request({ command: "save-document", payload: { document } });
  }

  importDocument(document: ShaderDocument): Promise<ShaderDocument> {
    return this.#request({ command: "import-document", payload: { document } });
  }

  createSnapshot(document: ShaderDocument, reason: SnapshotReason): Promise<boolean> {
    return this.#request({ command: "create-snapshot", payload: { document, reason } });
  }

  listSnapshots(projectId: string): Promise<SnapshotSummary[]> {
    return this.#request({ command: "list-snapshots", payload: { projectId } });
  }

  loadSnapshot(snapshotId: string): Promise<ShaderDocument> {
    return this.#request({ command: "load-snapshot", payload: { snapshotId } });
  }

  exportLibrary(): Promise<Uint8Array> {
    return this.#request({ command: "export-library" });
  }

  importLibrary(bytes: Uint8Array): Promise<LibraryImportResult> {
    return this.#request({ command: "import-library", payload: { bytes } }, [
      bytes.buffer as ArrayBuffer,
    ]);
  }
}

let repository: ShaderRepository | undefined;

export function getBrowserShaderRepository() {
  repository ??= new BrowserShaderRepository();
  return repository;
}
