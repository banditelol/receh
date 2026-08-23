import { DEFAULT_COMPOSITE_PASS, DEFAULT_SHADER } from "../defaultShader.ts";
import {
  parseShaderUniformValues,
  type ShaderUniformValue,
  type ShaderUniformValues,
} from "../uniforms/uniformTypes.ts";

export const SHADER_DOCUMENT_VERSION = 3 as const;

export type ShaderLanguage = "glsl";
export type ShaderPassKind = "fragment";
export type PassResolutionScale = 0.25 | 0.5 | 1;

export type ShaderPass = {
  id: string;
  name: string;
  kind: ShaderPassKind;
  language: ShaderLanguage;
  source: string;
  uniformValues: ShaderUniformValues;
  resolutionScale: PassResolutionScale;
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

export type IdFactory = () => string;

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
    uniformValues: parseShaderUniformValues(value.uniformValues),
    resolutionScale:
      value.resolutionScale === 0.25 || value.resolutionScale === 0.5 ? value.resolutionScale : 1,
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
        uniformValues: {},
        resolutionScale: 1,
      },
    ],
  };
}

export function createPortableShaderDocument(
  source = DEFAULT_SHADER,
  title = "Untitled shader",
  createId: IdFactory = () => crypto.randomUUID(),
): ShaderDocument {
  const documentId = createId();
  const passId = createId();
  return {
    schemaVersion: SHADER_DOCUMENT_VERSION,
    id: documentId,
    title,
    activePassId: passId,
    passes: [
      {
        id: passId,
        name: "main.frag",
        kind: "fragment",
        language: "glsl",
        source,
        uniformValues: {},
        resolutionScale: 1,
      },
    ],
  };
}

export function cloneShaderDocumentWithNewIds(
  document: ShaderDocument,
  createId: IdFactory = () => crypto.randomUUID(),
): ShaderDocument {
  const passIds = new Map(document.passes.map((pass) => [pass.id, createId()]));
  const passes = document.passes.map((pass) => ({
    ...pass,
    id: passIds.get(pass.id) ?? createId(),
  })) as [ShaderPass, ...ShaderPass[]];

  return {
    ...document,
    id: createId(),
    activePassId: passIds.get(document.activePassId) ?? passes[0].id,
    passes,
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

  if (
    (value.schemaVersion !== 1 && value.schemaVersion !== 2 && value.schemaVersion !== 3) ||
    !Array.isArray(value.passes)
  ) {
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

export function parseImportedShaderDocument(serialized: string): ShaderDocument {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error("This project file does not contain valid JSON.");
  }

  if (!isRecord(value)) throw new Error("This project file is not a receh document.");
  if (
    value.schemaVersion !== undefined &&
    value.schemaVersion !== 0 &&
    value.schemaVersion !== 1 &&
    value.schemaVersion !== 2 &&
    value.schemaVersion !== SHADER_DOCUMENT_VERSION
  ) {
    const version =
      typeof value.schemaVersion === "string" || typeof value.schemaVersion === "number"
        ? value.schemaVersion
        : "unknown";
    throw new Error(`Shader document version ${version} is not supported.`);
  }
  if (
    value.schemaVersion === 1 ||
    value.schemaVersion === 2 ||
    value.schemaVersion === SHADER_DOCUMENT_VERSION
  ) {
    if (!Array.isArray(value.passes) || value.passes.length === 0) {
      throw new Error("This project does not contain a fragment pass.");
    }
    if (value.passes.some((pass) => parsePass(pass) === null)) {
      throw new Error("One or more fragment passes are invalid.");
    }
  } else if (typeof value.source !== "string") {
    throw new Error("This legacy project does not contain shader source.");
  }

  return migrateShaderDocument(value);
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

export function updateActivePassName(document: ShaderDocument, name: string): ShaderDocument {
  const nextName = name.trim() || "main.frag";
  if (getActivePass(document).name === nextName) return document;

  return {
    ...document,
    passes: document.passes.map((pass) =>
      pass.id === document.activePassId ? { ...pass, name: nextName } : pass,
    ) as [ShaderPass, ...ShaderPass[]],
  };
}

export function setActivePass(document: ShaderDocument, passId: string): ShaderDocument {
  if (document.activePassId === passId) return document;
  return document.passes.some((pass) => pass.id === passId)
    ? { ...document, activePassId: passId }
    : document;
}

export function addFragmentPass(
  document: ShaderDocument,
  createId: IdFactory = () => crypto.randomUUID(),
): ShaderDocument {
  const passNames = new Set(document.passes.map((pass) => pass.name));
  let passNumber = document.passes.length + 1;
  while (passNames.has(`pass-${passNumber}.frag`)) passNumber += 1;
  const pass: ShaderPass = {
    id: createId(),
    name: `pass-${passNumber}.frag`,
    kind: "fragment",
    language: "glsl",
    source: DEFAULT_COMPOSITE_PASS,
    uniformValues: {},
    resolutionScale: 1,
  };
  return {
    ...document,
    activePassId: pass.id,
    passes: [...document.passes, pass],
  };
}

export function deleteFragmentPass(document: ShaderDocument, passId: string): ShaderDocument {
  if (document.passes.length === 1) return document;
  const index = document.passes.findIndex((pass) => pass.id === passId);
  if (index < 0) return document;
  const passes = document.passes.filter((pass) => pass.id !== passId) as [
    ShaderPass,
    ...ShaderPass[],
  ];
  const activePassId =
    document.activePassId === passId
      ? (passes[Math.min(index, passes.length - 1)]?.id ?? passes[0].id)
      : document.activePassId;
  return { ...document, activePassId, passes };
}

export function moveFragmentPass(
  document: ShaderDocument,
  passId: string,
  direction: -1 | 1,
): ShaderDocument {
  const index = document.passes.findIndex((pass) => pass.id === passId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= document.passes.length) return document;
  const passes = [...document.passes];
  [passes[index], passes[nextIndex]] = [passes[nextIndex], passes[index]];
  return { ...document, passes: passes as [ShaderPass, ...ShaderPass[]] };
}

export function updatePassResolutionScale(
  document: ShaderDocument,
  passId: string,
  resolutionScale: PassResolutionScale,
): ShaderDocument {
  const pass = document.passes.find((candidate) => candidate.id === passId);
  if (!pass || pass.resolutionScale === resolutionScale) return document;
  return {
    ...document,
    passes: document.passes.map((candidate) =>
      candidate.id === passId ? { ...candidate, resolutionScale } : candidate,
    ) as [ShaderPass, ...ShaderPass[]],
  };
}

export function updateActivePassUniformValue(
  document: ShaderDocument,
  name: string,
  value: ShaderUniformValue,
): ShaderDocument {
  const activePass = getActivePass(document);
  if (Object.is(activePass.uniformValues[name], value)) return document;

  return {
    ...document,
    passes: document.passes.map((pass) =>
      pass.id === document.activePassId
        ? { ...pass, uniformValues: { ...pass.uniformValues, [name]: value } }
        : pass,
    ) as [ShaderPass, ...ShaderPass[]],
  };
}

export function resetActivePassUniformValues(document: ShaderDocument): ShaderDocument {
  if (Object.keys(getActivePass(document).uniformValues).length === 0) return document;
  return {
    ...document,
    passes: document.passes.map((pass) =>
      pass.id === document.activePassId ? { ...pass, uniformValues: {} } : pass,
    ) as [ShaderPass, ...ShaderPass[]],
  };
}

export function updateDocumentTitle(document: ShaderDocument, title: string): ShaderDocument {
  const nextTitle = title.trim() || "Untitled shader";
  return document.title === nextTitle ? document : { ...document, title: nextTitle };
}
