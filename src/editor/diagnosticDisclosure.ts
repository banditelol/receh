import type { ShaderDiagnostic } from "../renderer/diagnostics.ts";

export type DiagnosticDisclosureState = {
  expandedLine: number | null;
  rawMessageOpen: boolean;
};

export type DiagnosticDisclosureResult = {
  state: DiagnosticDisclosureState;
  navigationLine: number | null;
};

export function getDiagnosticLines(diagnostics: readonly ShaderDiagnostic[]) {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.line))];
}

export function toggleDiagnosticDisclosure(
  current: DiagnosticDisclosureState,
  diagnostics: readonly ShaderDiagnostic[],
): DiagnosticDisclosureResult {
  const lines = getDiagnosticLines(diagnostics);
  if (lines.length === 0) {
    return {
      state: { expandedLine: null, rawMessageOpen: !current.rawMessageOpen },
      navigationLine: null,
    };
  }
  if (current.expandedLine !== null) {
    return {
      state: { expandedLine: null, rawMessageOpen: false },
      navigationLine: null,
    };
  }
  return {
    state: { expandedLine: lines[0] ?? null, rawMessageOpen: false },
    navigationLine: lines[0] ?? null,
  };
}

export function getAdjacentDiagnosticLine(
  diagnostics: readonly ShaderDiagnostic[],
  currentLine: number | null,
  direction: -1 | 1,
) {
  const lines = getDiagnosticLines(diagnostics);
  if (lines.length === 0) return null;
  const currentIndex = currentLine === null ? -1 : lines.indexOf(currentLine);
  if (currentIndex === -1) return direction === 1 ? (lines[0] ?? null) : (lines.at(-1) ?? null);
  return lines[(currentIndex + direction + lines.length) % lines.length] ?? null;
}
