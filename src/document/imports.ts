import {
  createPortableShaderDocument,
  parseImportedShaderDocument,
  type ShaderDocument,
} from "./shaderDocument.ts";

export const MAX_PROJECT_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_LIBRARY_IMPORT_BYTES = 128 * 1024 * 1024;

function titleFromFilename(filename: string) {
  const title = filename
    .replace(/\.(?:receh|shaderpocket)\.json$/i, "")
    .replace(/\.frag$/i, "")
    .trim();
  return title || "Imported shader";
}

export function parseProjectImport(filename: string, contents: string): ShaderDocument {
  if (filename.toLowerCase().endsWith(".frag")) {
    const document = createPortableShaderDocument(contents, titleFromFilename(filename));
    return {
      ...document,
      passes: [{ ...document.passes[0], name: filename }],
    };
  }
  if (
    !filename.toLowerCase().endsWith(".receh.json") &&
    !filename.toLowerCase().endsWith(".shaderpocket.json") &&
    !filename.endsWith(".json")
  ) {
    throw new Error("Choose a .receh.json or .frag project file.");
  }
  return parseImportedShaderDocument(contents);
}

export async function readProjectImport(file: File) {
  if (file.size > MAX_PROJECT_IMPORT_BYTES) {
    throw new Error("This project file is larger than the 2 MB import limit.");
  }
  return parseProjectImport(file.name, await file.text());
}

export async function readLibraryImport(file: File) {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".sqlite3") && !name.endsWith(".sqlite") && !name.endsWith(".db")) {
    throw new Error("Choose a receh .sqlite3 library file.");
  }
  if (file.size > MAX_LIBRARY_IMPORT_BYTES) {
    throw new Error("This library is larger than the 128 MB import limit.");
  }
  return new Uint8Array(await file.arrayBuffer());
}
