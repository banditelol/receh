import { describe, expect, it } from "vite-plus/test";
import {
  getAdjacentDiagnosticLine,
  getDiagnosticLines,
  toggleDiagnosticDisclosure,
} from "./diagnosticDisclosure.ts";

const diagnostics = [
  { line: 5, message: "first" },
  { line: 5, message: "same line" },
  { line: 9, message: "second line" },
];

describe("diagnostic disclosure", () => {
  it("opens the raw compiler message when no source line can be parsed", () => {
    expect(toggleDiagnosticDisclosure({ expandedLine: null, rawMessageOpen: false }, [])).toEqual({
      state: { expandedLine: null, rawMessageOpen: true },
      navigationLine: null,
    });
  });

  it("opens and navigates to the first source diagnostic", () => {
    expect(
      toggleDiagnosticDisclosure({ expandedLine: null, rawMessageOpen: false }, diagnostics),
    ).toEqual({
      state: { expandedLine: 5, rawMessageOpen: false },
      navigationLine: 5,
    });
  });

  it("deduplicates diagnostic lines and wraps keyboard navigation", () => {
    expect(getDiagnosticLines(diagnostics)).toEqual([5, 9]);
    expect(getAdjacentDiagnosticLine(diagnostics, 5, 1)).toBe(9);
    expect(getAdjacentDiagnosticLine(diagnostics, 9, 1)).toBe(5);
    expect(getAdjacentDiagnosticLine(diagnostics, 5, -1)).toBe(9);
  });
});
