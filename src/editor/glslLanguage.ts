import {
  snippet,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import {
  GLSL_REFERENCE_ENTRIES,
  getGlslReference,
  type GlslReferenceEntry,
} from "./glslCatalog.ts";

export type GlslSourceSymbol = {
  name: string;
  kind: "function" | "variable";
  detail: string;
};

const GLSL_TYPES = [
  "void",
  "float",
  "int",
  "uint",
  "bool",
  "vec2",
  "vec3",
  "vec4",
  "ivec2",
  "ivec3",
  "ivec4",
  "uvec2",
  "uvec3",
  "uvec4",
  "bvec2",
  "bvec3",
  "bvec4",
  "mat2",
  "mat3",
  "mat4",
  "sampler2D",
  "sampler3D",
  "samplerCube",
] as const;

const GLSL_KEYWORDS = [
  "const",
  "uniform",
  "in",
  "out",
  "inout",
  "precision",
  "highp",
  "mediump",
  "lowp",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "return",
  "discard",
  "struct",
] as const;

const PLATFORM_VARIABLES: readonly Completion[] = [
  { label: "u_resolution", type: "variable", detail: "vec2 · viewport size", boost: 95 },
  { label: "u_time", type: "variable", detail: "float · elapsed seconds", boost: 95 },
  { label: "u_time_delta", type: "variable", detail: "float · frame delta", boost: 90 },
  { label: "u_frame", type: "variable", detail: "int · frame number", boost: 90 },
  { label: "u_mouse", type: "variable", detail: "vec2 · pointer position", boost: 95 },
  { label: "u_drag", type: "variable", detail: "vec2 · pointer drag delta", boost: 90 },
  { label: "u_scroll", type: "variable", detail: "float · wheel delta", boost: 90 },
  { label: "gl_FragCoord", type: "variable", detail: "vec4 · fragment coordinates", boost: 95 },
  { label: "gl_FrontFacing", type: "variable", detail: "bool · front-facing fragment", boost: 75 },
  { label: "gl_PointCoord", type: "variable", detail: "vec2 · point sprite coordinate", boost: 70 },
];

const TYPE_COMPLETIONS: readonly Completion[] = GLSL_TYPES.map((label) => ({
  label,
  type: "type",
  boost: 35,
}));

const KEYWORD_COMPLETIONS: readonly Completion[] = GLSL_KEYWORDS.map((label) => ({
  label,
  type: "keyword",
  boost: 20,
}));

const PRECISION_COMPLETIONS: readonly Completion[] = ["highp", "mediump", "lowp"].map((label) => ({
  label,
  type: "keyword",
  boost: 80,
}));

const SWIZZLE_COMPLETIONS: readonly Completion[] = [
  "x",
  "y",
  "z",
  "w",
  "xy",
  "xyz",
  "xyzw",
  "yx",
  "yz",
  "zw",
  "rgb",
  "rgba",
  "r",
  "g",
  "b",
  "a",
  "st",
  "stp",
  "stpq",
].map((label) => ({ label, type: "property", detail: "vector swizzle", boost: 80 }));

function referenceCompletion(reference: GlslReferenceEntry): Completion {
  return {
    label: reference.name,
    type: "function",
    detail: reference.signatures[0],
    info: `${reference.signatures.join("\n")}\n\n${reference.summary}\n\nExample\n${reference.example}`,
    apply: snippet(reference.snippet),
    boost: 45 + (reference.rank ?? 0),
  };
}

const REFERENCE_COMPLETIONS = GLSL_REFERENCE_ENTRIES.map(referenceCompletion);

const TYPE_PATTERN =
  "(?:float|int|uint|bool|[biu]?vec[234]|mat[234](?:x[234])?|sampler(?:2D|3D|Cube))";

export function collectGlslSourceSymbols(source: string): GlslSourceSymbol[] {
  const symbols = new Map<string, GlslSourceSymbol>();
  const functionPattern = new RegExp(
    `\\b(${TYPE_PATTERN}|void)\\s+([A-Za-z_]\\w*)\\s*\\(([^)]*)\\)\\s*\\{`,
    "g",
  );
  for (const match of source.matchAll(functionPattern)) {
    const returnType = match[1];
    const name = match[2];
    if (!name || !returnType || name === "main") continue;
    const parameters = match[3]?.trim() || "";
    symbols.set(name, {
      name,
      kind: "function",
      detail: `${returnType} ${name}(${parameters})`,
    });
  }

  const variablePattern = new RegExp(
    `\\b(?:(uniform|in|out|const)\\s+)?(${TYPE_PATTERN})\\s+([A-Za-z_]\\w*)\\b(?!\\s*\\()`,
    "g",
  );
  for (const match of source.matchAll(variablePattern)) {
    const qualifier = match[1];
    const variableType = match[2];
    const name = match[3];
    if (!name || !variableType || symbols.has(name)) continue;
    symbols.set(name, {
      name,
      kind: "variable",
      detail: [qualifier, variableType, "· local source"].filter(Boolean).join(" "),
    });
  }
  return [...symbols.values()];
}

function isInsideComment(source: string, position: number) {
  const before = source.slice(0, position);
  const lastBlockStart = before.lastIndexOf("/*");
  const lastBlockEnd = before.lastIndexOf("*/");
  if (lastBlockStart > lastBlockEnd) return true;
  const currentLine = before.slice(before.lastIndexOf("\n") + 1);
  return currentLine.includes("//");
}

function uniqueCompletions(completions: readonly Completion[]) {
  const unique = new Map<string, Completion>();
  for (const completion of completions) {
    if (!unique.has(completion.label)) unique.set(completion.label, completion);
  }
  return [...unique.values()];
}

export function glslCompletions(context: CompletionContext): CompletionResult | null {
  const source = context.state.doc.toString();
  if (isInsideComment(source, context.pos)) return null;

  const word = context.matchBefore(/[A-Za-z_]\w*/);
  const from = word?.from ?? context.pos;
  if (!word && !context.explicit) return null;
  if (word && word.from === word.to && !context.explicit) return null;

  const beforeWord = source.slice(Math.max(0, from - 40), from);
  if (/#[A-Za-z_]*$/.test(beforeWord)) return null;
  if (source[from - 1] === ".") {
    return { from, options: SWIZZLE_COMPLETIONS, validFor: /^\w*$/ };
  }

  let contextual: readonly Completion[] = [];
  if (/\bprecision\s+$/.test(beforeWord)) {
    contextual = PRECISION_COMPLETIONS;
  } else if (/\b(?:uniform|in|out|inout|const)\s+$/.test(beforeWord)) {
    contextual = TYPE_COMPLETIONS;
  } else {
    const sourceSymbols = collectGlslSourceSymbols(source).map<Completion>((symbol) => ({
      label: symbol.name,
      type: symbol.kind,
      detail: symbol.detail,
      boost: 110,
    }));
    contextual = uniqueCompletions([
      ...sourceSymbols,
      ...PLATFORM_VARIABLES,
      ...REFERENCE_COMPLETIONS,
      ...TYPE_COMPLETIONS,
      ...KEYWORD_COMPLETIONS,
    ]);
  }

  return { from, options: contextual, validFor: /^[A-Za-z_]\w*$/ };
}

function wordAround(source: string, position: number) {
  const before = source.slice(0, position).match(/[A-Za-z_]\w*$/)?.[0] ?? "";
  const after = source.slice(position).match(/^\w*/)?.[0] ?? "";
  return `${before}${after}`;
}

function callBefore(source: string, position: number) {
  const start = Math.max(0, position - 320);
  const before = source.slice(start, position);
  let depth = 0;
  for (let index = before.length - 1; index >= 0; index -= 1) {
    const character = before[index];
    if (character === ")") {
      depth += 1;
    } else if (character === "(") {
      if (depth === 0) {
        return before.slice(0, index).match(/([A-Za-z_]\w*)\s*$/)?.[1] ?? "";
      }
      depth -= 1;
    } else if (depth === 0 && (character === ";" || character === "{" || character === "}")) {
      return "";
    }
  }
  return "";
}

export function findGlslReferenceAtCursor(source: string, position: number, selectedText = "") {
  const selected = selectedText.trim();
  const directName = selected && selected.length < 64 ? selected : wordAround(source, position);
  return getGlslReference(directName) ?? getGlslReference(callBefore(source, position));
}
