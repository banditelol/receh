import type { ShaderDocument } from "./shaderDocument.ts";

export function serializeDocumentContent(document: ShaderDocument) {
  return JSON.stringify({
    schemaVersion: document.schemaVersion,
    id: document.id,
    title: document.title,
    functionsSource: document.functionsSource,
    activePassId: document.activePassId,
    passes: document.passes.map((pass) => ({
      id: pass.id,
      name: pass.name,
      kind: pass.kind,
      language: pass.language,
      source: pass.source,
      uniformValues: pass.uniformValues,
      resolutionScale: pass.resolutionScale,
    })),
  });
}

export async function hashShaderDocument(document: ShaderDocument) {
  const data = new TextEncoder().encode(serializeDocumentContent(document));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
