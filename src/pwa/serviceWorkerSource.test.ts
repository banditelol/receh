import { describe, expect, it } from "vite-plus/test";
import { createServiceWorkerSource } from "../../build/pwaServiceWorker.ts";

describe("generated PWA service worker", () => {
  it("precaches compiled assets and the portable offline runtime", () => {
    const source = createServiceWorkerSource([
      "/assets/application-123.js",
      "/assets/sqlite-worker-123.js",
    ]);
    expect(source).toContain('"/assets/application-123.js"');
    expect(source).toContain('"/assets/sqlite-worker-123.js"');
    expect(source).toContain('"/manifest.webmanifest"');
    expect(source).toContain('caches.match("/index.html")');
  });

  it("waits for explicit approval before activating an update", () => {
    const source = createServiceWorkerSource([]);
    expect(source).toContain('event.data?.type === "SKIP_WAITING"');
    expect(source).toContain("if (!self.registration.active) await self.skipWaiting()");
  });
});
