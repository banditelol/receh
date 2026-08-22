import { getActivePass, type ShaderDocument } from "../document/shaderDocument.ts";

export function safeFilename(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "untitled-shader";
}

export function createProjectFile(document: ShaderDocument) {
  return {
    blob: new Blob([`${JSON.stringify(document, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    }),
    filename: `${safeFilename(document.title)}.receh.json`,
  };
}

export function createSourceFile(document: ShaderDocument) {
  const pass = getActivePass(document);
  return {
    blob: new Blob([pass.source], { type: "text/plain;charset=utf-8" }),
    filename: pass.name.endsWith(".frag") ? pass.name : `${safeFilename(pass.name)}.frag`,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
