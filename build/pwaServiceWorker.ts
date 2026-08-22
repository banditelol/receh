import type { Plugin, ResolvedConfig } from "vite-plus";

// Bump when a public asset changes without changing an emitted bundle filename.
const PUBLIC_ASSET_REVISION = "2026-08-22-1";

const PUBLIC_PWA_ASSETS = [
  "",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "app-icon.svg",
  "icons/app-icon-192.png",
  "icons/app-icon-512.png",
  "icons/app-icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

function normalizeBasePath(base: string) {
  return `/${base.replace(/^\/+|\/+$/gu, "")}${base === "/" ? "" : "/"}`;
}

function resolveAssetPath(base: string, file: string) {
  return `${base}${file.replace(/^\//u, "")}`;
}

function stableVersion(files: string[]) {
  let hash = 2_166_136_261;
  for (const character of files.join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

export function createServiceWorkerSource(inputFiles: string[], configuredBase = "/") {
  const base = normalizeBasePath(configuredBase);
  const files = Array.from(new Set([...PUBLIC_PWA_ASSETS, ...inputFiles]))
    .map((file) => resolveAssetPath(base, file))
    .sort();
  const indexUrl = resolveAssetPath(base, "index.html");
  const version = stableVersion([...files, PUBLIC_ASSET_REVISION]);
  return `const CACHE_PREFIX = "receh-shell-";
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)};
const PRECACHE_URLS = ${JSON.stringify(files)};
const INDEX_URL = ${JSON.stringify(indexUrl)};

function withIsolationHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = withIsolationHeaders(await fetch(request));
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(INDEX_URL, response.clone());
        }
        return response;
      } catch {
        const fallback = await caches.match(INDEX_URL);
        return fallback ? withIsolationHeaders(fallback) : Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return withIsolationHeaders(cached);
    const networkResponse = await fetch(request);
    const response = withIsolationHeaders(networkResponse);
    if (networkResponse.ok && networkResponse.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
`;
}

export function pwaServiceWorkerPlugin(): Plugin {
  let base = "/";
  return {
    name: "receh-pwa",
    apply: "build",
    configResolved(config: ResolvedConfig) {
      base = config.base;
    },
    generateBundle(_options, bundle) {
      const emittedFiles = Object.keys(bundle)
        .filter((fileName) => fileName !== "sw.js")
        .map((fileName) => fileName);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: createServiceWorkerSource(emittedFiles, base),
      });
    },
  };
}
