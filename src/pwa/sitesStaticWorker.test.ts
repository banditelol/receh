import { describe, expect, it } from "vite-plus/test";
import { createSitesStaticWorkerSource } from "../../build/sitesStaticWorker.ts";

describe("Sites static worker", () => {
  it("serves bundled assets with a single-page fallback", () => {
    const source = createSitesStaticWorkerSource();
    expect(source).toContain("env.ASSETS.fetch(request)");
    expect(source).toContain('new URL("/index.html", request.url)');
  });

  it("preserves the isolation headers required by SQLite OPFS", () => {
    const source = createSitesStaticWorkerSource();
    expect(source).toContain('"Cross-Origin-Opener-Policy", "same-origin"');
    expect(source).toContain('"Cross-Origin-Embedder-Policy", "require-corp"');
  });
});
