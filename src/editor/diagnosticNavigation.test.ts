import { describe, expect, it } from "vite-plus/test";
import { getDiagnosticScrollMargin } from "./diagnosticNavigation.ts";

describe("diagnostic navigation", () => {
  it("places the error three lines below the top when space allows", () => {
    expect(getDiagnosticScrollMargin(24, 400)).toBe(72);
  });

  it("keeps the error visible when the editor is shorter than the desired context", () => {
    expect(getDiagnosticScrollMargin(24, 64)).toBe(40);
  });
});
