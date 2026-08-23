import { getActivePass, type ShaderDocument } from "../document/shaderDocument.ts";

const SHARE_FORMAT_VERSION = "v2";
const LEGACY_SHARE_FORMAT_VERSION = "v1";
const COMPRESSED_ENCODING = "g";
const UNCOMPRESSED_ENCODING = "u";
const MAX_SHARED_DOCUMENT_BYTES = 96 * 1024;
const MAX_SHARED_TITLE_CHARACTERS = 120;
const MAX_SHARED_PASS_NAME_CHARACTERS = 120;

export const MAX_SHARED_SOURCE_BYTES = 64 * 1024;
export const MAX_SHARE_PAYLOAD_CHARACTERS = 48 * 1024;

export type SharedShaderDocument = {
  title: string;
  passName: string;
  source: string;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("This share link is malformed.");
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("This share link is malformed.");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function readBytes(stream: ReadableStream<Uint8Array>, maximum: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > maximum) throw new Error("This shared shader is too large to open safely.");
      chunks.push(result.value);
    }
  } catch (reason) {
    await reader.cancel().catch(() => undefined);
    throw reason;
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function gzip(bytes: Uint8Array) {
  if (!("CompressionStream" in globalThis)) return null;
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return readBytes(stream, MAX_SHARE_PAYLOAD_CHARACTERS);
}

async function gunzip(bytes: Uint8Array, maximum: number) {
  if (!("DecompressionStream" in globalThis)) {
    throw new Error("This browser cannot open compressed receh links.");
  }
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return readBytes(stream, maximum);
}

function decodeUtf8(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("This share link does not contain valid shader text.");
  }
}

function validateSource(source: string) {
  if (new TextEncoder().encode(source).byteLength > MAX_SHARED_SOURCE_BYTES) {
    throw new Error("This shader is too large for a link. Export a project file instead.");
  }
  return source;
}

function validateLabel(value: unknown, fallback: string, maximum: number) {
  if (typeof value !== "string") throw new Error("This share link is malformed.");
  const label = value.trim() || fallback;
  if (label.length > maximum) throw new Error("This share link contains invalid project metadata.");
  return label;
}

async function encodeBytes(bytes: Uint8Array) {
  const compressed = await gzip(bytes);
  const encoding = compressed ? COMPRESSED_ENCODING : UNCOMPRESSED_ENCODING;
  const payload = `${SHARE_FORMAT_VERSION}.${encoding}.${bytesToBase64Url(compressed ?? bytes)}`;
  if (payload.length > MAX_SHARE_PAYLOAD_CHARACTERS) {
    throw new Error("This shader is too large for a link. Export a project file instead.");
  }
  return payload;
}

async function decodePayload(payload: string) {
  if (!payload || payload.length > MAX_SHARE_PAYLOAD_CHARACTERS) {
    throw new Error("This share link is invalid or too large.");
  }

  const [version, encoding, encoded, ...extra] = payload.split(".");
  if (
    (version !== SHARE_FORMAT_VERSION && version !== LEGACY_SHARE_FORMAT_VERSION) ||
    !encoded ||
    extra.length > 0
  ) {
    throw new Error("This receh share-link version is not supported.");
  }
  if (encoding !== COMPRESSED_ENCODING && encoding !== UNCOMPRESSED_ENCODING) {
    throw new Error("This receh share-link encoding is not supported.");
  }

  const maximum =
    version === LEGACY_SHARE_FORMAT_VERSION ? MAX_SHARED_SOURCE_BYTES : MAX_SHARED_DOCUMENT_BYTES;
  const bytes = base64UrlToBytes(encoded);
  const decoded = encoding === COMPRESSED_ENCODING ? await gunzip(bytes, maximum) : bytes;
  if (decoded.byteLength > maximum) {
    throw new Error("This shared shader is too large to open safely.");
  }
  return { version, text: decodeUtf8(decoded) };
}

export async function encodeSharedDocument(document: ShaderDocument) {
  const pass = getActivePass(document);
  const title = validateLabel(document.title, "Untitled shader", MAX_SHARED_TITLE_CHARACTERS);
  const passName = validateLabel(pass.name, "main.frag", MAX_SHARED_PASS_NAME_CHARACTERS);
  const source = validateSource(pass.source);
  const bytes = new TextEncoder().encode(JSON.stringify([title, passName, source]));
  if (bytes.byteLength > MAX_SHARED_DOCUMENT_BYTES) {
    throw new Error("This shader is too large for a link. Export a project file instead.");
  }
  return encodeBytes(bytes);
}

export async function decodeSharedDocument(payload: string): Promise<SharedShaderDocument> {
  const decoded = await decodePayload(payload);
  if (decoded.version === LEGACY_SHARE_FORMAT_VERSION) {
    return {
      title: "Shared shader",
      passName: "main.frag",
      source: validateSource(decoded.text),
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(decoded.text);
  } catch {
    throw new Error("This share link does not contain a valid receh document.");
  }
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error("This share link does not contain a valid receh document.");
  }
  if (typeof value[2] !== "string") throw new Error("This share link is malformed.");
  return {
    title: validateLabel(value[0], "Untitled shader", MAX_SHARED_TITLE_CHARACTERS),
    passName: validateLabel(value[1], "main.frag", MAX_SHARED_PASS_NAME_CHARACTERS),
    source: validateSource(value[2]),
  };
}

export async function createShareUrl(document: ShaderDocument, currentHref = window.location.href) {
  const url = new URL(currentHref);
  url.searchParams.set("code", await encodeSharedDocument(document));
  url.hash = "";
  return url.toString();
}

export function removeShareCodeFromUrl(currentHref = window.location.href) {
  const url = new URL(currentHref);
  url.searchParams.delete("code");
  return url.toString();
}
