import type { ShaderDiagnostic } from "../renderer/diagnostics.ts";

export type FunctionScope = "project" | "global";
export type EditorSourceView = "pass" | FunctionScope;

export type FunctionDefinition = {
  name: string;
  signature: string;
  line: number;
  scope: FunctionScope;
};

export type ShaderLineOrigin = {
  view: EditorSourceView;
  line: number;
};

export type ComposedShaderSource = {
  source: string;
  lineOrigins: ShaderLineOrigin[];
};

const FUNCTION_DEFINITION_PATTERN =
  /\b((?:void|float|int|uint|bool|[biu]?vec[234]|mat[234](?:x[234])?))\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/gu;

export function collectFunctionDefinitions(
  source: string,
  scope: FunctionScope,
): FunctionDefinition[] {
  return [...source.matchAll(FUNCTION_DEFINITION_PATTERN)]
    .filter((match) => match[2] !== "main")
    .map((match) => ({
      name: match[2]!,
      signature: `${match[1]} ${match[2]}(${match[3]?.trim() ?? ""})`,
      line: source.slice(0, match.index).split("\n").length,
      scope,
    }));
}

function sourceLines(source: string) {
  return source ? source.split("\n") : [];
}

function firstPassFunctionLine(source: string) {
  FUNCTION_DEFINITION_PATTERN.lastIndex = 0;
  const match = FUNCTION_DEFINITION_PATTERN.exec(source);
  FUNCTION_DEFINITION_PATTERN.lastIndex = 0;
  return match ? source.slice(0, match.index).split("\n").length - 1 : sourceLines(source).length;
}

export function composeShaderSource(
  passSource: string,
  projectFunctionsSource: string,
  globalFunctionsSource: string,
): ComposedShaderSource {
  const pass = sourceLines(passSource);
  const insertionLine = firstPassFunctionLine(passSource);
  const globalFunctions = sourceLines(globalFunctionsSource);
  const projectFunctions = sourceLines(projectFunctionsSource);
  const output: string[] = [];
  const lineOrigins: ShaderLineOrigin[] = [];

  const append = (lines: readonly string[], view: EditorSourceView, sourceLine = 1) => {
    lines.forEach((line, index) => {
      output.push(line);
      lineOrigins.push({ view, line: sourceLine + index });
    });
  };

  append(pass.slice(0, insertionLine), "pass");
  append(globalFunctions, "global");
  append(projectFunctions, "project");
  append(pass.slice(insertionLine), "pass", insertionLine + 1);

  return { source: output.join("\n"), lineOrigins };
}

export function mapComposedDiagnostics(
  diagnostics: readonly ShaderDiagnostic[],
  lineOrigins: readonly ShaderLineOrigin[],
): ShaderDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    const origin = lineOrigins[diagnostic.line - 1];
    return origin ? { ...diagnostic, line: origin.line, sourceView: origin.view } : diagnostic;
  });
}

export function appendFunctionTemplate(
  source: string,
  name = "helper",
  reservedNames: readonly string[] = [],
) {
  const usedNames = new Set([
    ...reservedNames,
    ...collectFunctionDefinitions(source, "project").map((item) => item.name),
  ]);
  let nextName = name;
  let suffix = 2;
  while (usedNames.has(nextName)) nextName = `${name}${suffix++}`;
  const template = `float ${nextName}(float value) {\n  return value;\n}`;
  return {
    source: source.trim() ? `${source.trimEnd()}\n\n${template}\n` : `${template}\n`,
    name: nextName,
  };
}
