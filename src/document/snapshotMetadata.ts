import { getActivePass, type ShaderDocument } from "./shaderDocument.ts";

export const MAX_SNAPSHOT_NAME_LENGTH = 80;

export type SnapshotPreview = {
  title: string;
  passName: string;
  passCount: number;
  lineCount: number;
  sourceBytes: number;
  sourcePreview: string;
};

export function normalizeSnapshotName(value: string | undefined) {
  const name = value?.trim() ?? "";
  if (name.length > MAX_SNAPSHOT_NAME_LENGTH) {
    throw new Error(`Snapshot names can be at most ${MAX_SNAPSHOT_NAME_LENGTH} characters.`);
  }
  return name || null;
}

export function createSnapshotPreview(document: ShaderDocument): SnapshotPreview {
  const pass = getActivePass(document);
  const lines = pass.source.split(/\r?\n/u);
  const sourcePreview = lines.find((line) => line.trim())?.trim() ?? "Empty fragment source";

  return {
    title: document.title,
    passName: pass.name,
    passCount: document.passes.length,
    lineCount: lines.length,
    sourceBytes: new TextEncoder().encode(pass.source).byteLength,
    sourcePreview: sourcePreview.slice(0, 120),
  };
}
