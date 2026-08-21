import { DEFAULT_SHADER } from "../defaultShader.ts";

export const SHADER_DOCUMENT_VERSION = 1 as const;

export type ShaderLanguage = "glsl";
export type ShaderPassKind = "fragment";

export type ShaderPass = {
  id: string;
  name: string;
  kind: ShaderPassKind;
  language: ShaderLanguage;
  source: string;
};

export type ShaderDocument = {
  schemaVersion: typeof SHADER_DOCUMENT_VERSION;
  id: string;
  title: string;
  activePassId: string;
  passes: [ShaderPass, ...ShaderPass[]];
};

type ShaderDocumentV0 = {
  schemaVersion?: 0;
  id?: unknown;
  title?: unknown;
  source?: unknown;
};

const DEFAULT_DOCUMENT_ID = "local-draft";
const DEFAULT_PASS_ID = "main";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function parsePass(value: unknown): ShaderPass | null {
  if (!isRecord(value) || typeof value.source !== "string") return null;

  return {
    id: stringOr(value.id, DEFAULT_PASS_ID),
    name: stringOr(value.name, "main.frag"),
    kind: "fragment",
    language: "glsl",
    source: value.source,
  };
}

export function createShaderDocument(source = DEFAULT_SHADER): ShaderDocument {
  return {
    schemaVersion: SHADER_DOCUMENT_VERSION,
    id: DEFAULT_DOCUMENT_ID,
    title: "Untitled shader",
    activePassId: DEFAULT_PASS_ID,
    passes: [
      {
        id: DEFAULT_PASS_ID,
        name: "main.frag",
        kind: "fragment",
        language: "glsl",
        source,
      },
    ],
  };
}

function migrateV0(value: ShaderDocumentV0): ShaderDocument {
  const document = createShaderDocument(
    typeof value.source === "string" ? value.source : DEFAULT_SHADER,
  );
  document.id = stringOr(value.id, document.id);
  document.title = stringOr(value.title, document.title);
  return document;
}

export function migrateShaderDocument(value: unknown): ShaderDocument {
  if (!isRecord(value)) return createShaderDocument();

  if (value.schemaVersion === undefined || value.schemaVersion === 0) {
    return migrateV0(value);
  }

  if (value.schemaVersion !== SHADER_DOCUMENT_VERSION || !Array.isArray(value.passes)) {
    return createShaderDocument();
  }

  const passes = value.passes.map(parsePass).filter((pass) => pass !== null);
  if (passes.length === 0) return createShaderDocument();

  const activePassId = stringOr(value.activePassId, passes[0].id);
  return {
    schemaVersion: SHADER_DOCUMENT_VERSION,
    id: stringOr(value.id, DEFAULT_DOCUMENT_ID),
    title: stringOr(value.title, "Untitled shader"),
    activePassId: passes.some((pass) => pass.id === activePassId) ? activePassId : passes[0].id,
    passes: passes as [ShaderPass, ...ShaderPass[]],
  };
}

export function parseShaderDocument(serialized: string): ShaderDocument {
  try {
    return migrateShaderDocument(JSON.parse(serialized));
  } catch {
    return createShaderDocument();
  }
}

export function getActivePass(document: ShaderDocument): ShaderPass {
  return document.passes.find((pass) => pass.id === document.activePassId) ?? document.passes[0];
}

export function updateActivePassSource(document: ShaderDocument, source: string): ShaderDocument {
  if (getActivePass(document).source === source) return document;

  return {
    ...document,
    passes: document.passes.map((pass) =>
      pass.id === document.activePassId ? { ...pass, source } : pass,
    ) as [ShaderPass, ...ShaderPass[]],
  };
}
