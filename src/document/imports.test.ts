import { describe, expect, it } from "vite-plus/test";
import { parseProjectImport } from "./imports.ts";
import { getActivePass } from "./shaderDocument.ts";

describe("project imports", () => {
  it("creates a titled project from a fragment source file", () => {
    const document = parseProjectImport("blue-orbit.frag", "fragment source");

    expect(document.title).toBe("blue-orbit");
    expect(getActivePass(document).name).toBe("blue-orbit.frag");
    expect(getActivePass(document).source).toBe("fragment source");
  });

  it("validates project extensions", () => {
    expect(() => parseProjectImport("shader.txt", "source")).toThrow(".receh.json");
  });

  it("parses complete receh projects", () => {
    const document = parseProjectImport(
      "portable.shaderpocket.json",
      JSON.stringify({ schemaVersion: 0, title: "Portable", source: "source" }),
    );
    expect(document.title).toBe("Portable");
  });
});
