export const DIAGNOSTIC_CONTEXT_LINES = 3;

export function getDiagnosticScrollMargin(lineHeight: number, viewportHeight: number) {
  const safeLineHeight = Math.max(0, lineHeight);
  const desiredMargin = safeLineHeight * DIAGNOSTIC_CONTEXT_LINES;
  const availableMargin = Math.max(0, viewportHeight - safeLineHeight);
  return Math.min(desiredMargin, availableMargin);
}
