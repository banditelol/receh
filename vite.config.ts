import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { pwaServiceWorkerPlugin } from "./build/pwaServiceWorker.ts";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/receh/" : "/",
  plugins: [react(), pwaServiceWorkerPlugin()],
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  server: {
    host: "0.0.0.0",
    port: 37005,
    strictPort: true,
    allowedHosts: ["ishineko.banteng-ratio.ts.net"],
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 37005,
    strictPort: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
