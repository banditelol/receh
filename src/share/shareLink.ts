const SHARE_FORMAT_VERSION = "v1";
const COMPRESSED_ENCODING = "g";
const UNCOMPRESSED_ENCODING = "u";

export const MAX_SHARED_SOURCE_BYTES = 64 * 1024;
export const MAX_SHARE_PAYLOAD_CHARACTERS = 48 * 1024;

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

async function gunzip(bytes: Uint8Array) {
  if (!("DecompressionStream" in globalThis)) {
    throw new Error("This browser cannot open compressed receh links.");
  }
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return readBytes(stream, MAX_SHARED_SOURCE_BYTES);
}

export async function encodeSharedSource(source: string) {
  const bytes = new TextEncoder().encode(source);
  if (bytes.byteLength > MAX_SHARED_SOURCE_BYTES) {
    throw new Error("This shader is too large for a link. Export a project file instead.");
  }

  const compressed = await gzip(bytes);
  const encoding = compressed ? COMPRESSED_ENCODING : UNCOMPRESSED_ENCODING;
  const payload = `${SHARE_FORMAT_VERSION}.${encoding}.${bytesToBase64Url(compressed ?? bytes)}`;
  if (payload.length > MAX_SHARE_PAYLOAD_CHARACTERS) {
    throw new Error("This shader is too large for a link. Export a project file instead.");
  }
  return payload;
}

export async function decodeSharedSource(payload: string) {
  if (!payload || payload.length > MAX_SHARE_PAYLOAD_CHARACTERS) {
    throw new Error("This share link is invalid or too large.");
  }

  const [version, encoding, encoded, ...extra] = payload.split(".");
  if (version !== SHARE_FORMAT_VERSION || !encoded || extra.length > 0) {
    throw new Error("This receh share-link version is not supported.");
  }

  const bytes = base64UrlToBytes(encoded);
  const decoded = encoding === COMPRESSED_ENCODING ? await gunzip(bytes) : bytes;
  if (encoding !== COMPRESSED_ENCODING && encoding !== UNCOMPRESSED_ENCODING) {
    throw new Error("This receh share-link encoding is not supported.");
  }
  if (decoded.byteLength > MAX_SHARED_SOURCE_BYTES) {
    throw new Error("This shared shader is too large to open safely.");
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(decoded);
  } catch {
    throw new Error("This share link does not contain valid shader text.");
  }
}

export async function createShareUrl(source: string, currentHref = window.location.href) {
  const url = new URL(currentHref);
  url.searchParams.set("code", await encodeSharedSource(source));
  url.hash = "";
  return url.toString();
}

export function removeShareCodeFromUrl(currentHref = window.location.href) {
  const url = new URL(currentHref);
  url.searchParams.delete("code");
  return url.toString();
}
