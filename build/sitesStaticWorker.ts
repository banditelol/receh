import type { Plugin } from "vite-plus";

export function createSitesStaticWorkerSource() {
  return `function withIsolationHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (request.method === "GET" && response.status === 404 && acceptsHtml) {
      const indexUrl = new URL("/index.html", request.url);
      response = await env.ASSETS.fetch(new Request(indexUrl, request));
    }
    return withIsolationHeaders(response);
  },
};
`;
}

export function sitesStaticWorkerPlugin(): Plugin {
  return {
    name: "shader-pocket-sites-static-worker",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "server/index.js",
        source: createSitesStaticWorkerSource(),
      });
    },
  };
}
