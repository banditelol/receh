import { parseHexColor } from "./color.ts";
import {
  RESERVED_RUNTIME_UNIFORMS,
  type RuntimeUniform,
  type ShaderUniformValue,
  type ShaderUniformValues,
  type SupportedUniformType,
  type TunableUniformDefinition,
} from "./uniformTypes.ts";

const UNIFORM_PATTERN =
  /^([ \t]*)uniform\s+(?:(lowp|mediump|highp)\s+)?(float|int|bool|[ib]?vec[234])\s+([A-Za-z_]\w*)\s*;([^\r\n]*)/gm;
const COMPONENTS = ["x", "y", "z", "w"];

function titleFromUniformName(name: string) {
  const withoutPrefix = name.replace(/^u_?/, "");
  return withoutPrefix
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function componentCount(type: SupportedUniformType) {
  const count = Number(type.at(-1));
  return Number.isInteger(count) ? count : 1;
}

function parseNumbers(value: string) {
  return value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
}

function defaultRange(type: SupportedUniformType) {
  if (type === "int" || type.startsWith("ivec")) return { min: -10, max: 10, step: 1 };
  return { min: -1, max: 1, step: 0.01 };
}

function parseRange(annotation: string, type: SupportedUniformType) {
  const fallback = defaultRange(type);
  const match = annotation.match(
    /@range\s+(-?(?:\d+\.?\d*|\.\d+))\s+(-?(?:\d+\.?\d*|\.\d+))(?:\s+((?:\d+\.?\d*|\.\d+)))?/i,
  );
  if (!match) return fallback;
  const min = Number(match[1]);
  const max = Number(match[2]);
  const step = match[3] ? Number(match[3]) : fallback.step;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max || !(step > 0)) return fallback;
  return { min, max, step };
}

function inferColor(name: string, type: SupportedUniformType, annotation: string) {
  return (
    (type === "vec3" || type === "vec4") &&
    (/@color\b/i.test(annotation) || /(?:color|colour|tint|hue|albedo)/i.test(name))
  );
}

function defaultValueFor(
  type: SupportedUniformType,
  components: number,
  annotation: string,
  isColor: boolean,
): ShaderUniformValue {
  const colorHex = annotation.match(/@color(?:\s+(#[0-9a-f]{3,8}))?/i)?.[1];
  if (isColor) {
    const parsed = colorHex ? parseHexColor(colorHex) : null;
    const color = parsed ?? [1, 1, 1, 1];
    return color.slice(0, components);
  }

  const explicit = annotation.match(/@default\s+([^@]+)/i)?.[1] ?? "";
  if (type === "bool") return /^true\b/i.test(explicit);
  if (type.startsWith("bvec")) {
    const values = explicit.match(/\b(?:true|false)\b/gi)?.map((value) => value === "true") ?? [];
    return Array.from({ length: components }, (_, index) => values[index] ?? false);
  }
  const values = parseNumbers(explicit);
  if (components === 1) return values[0] ?? 0;
  return Array.from({ length: components }, (_, index) => values[index] ?? 0);
}

export function parseTunableUniforms(source: string): TunableUniformDefinition[] {
  const definitions: TunableUniformDefinition[] = [];
  for (const match of source.matchAll(UNIFORM_PATTERN)) {
    const name = match[4];
    if (RESERVED_RUNTIME_UNIFORMS.has(name)) continue;
    const type = match[3] as SupportedUniformType;
    const annotation = match[5].replace(/^\s*\/\/\s*/, "");
    const components = componentCount(type);
    const color = inferColor(name, type, annotation);
    definitions.push({
      name,
      label: titleFromUniformName(name),
      type,
      control: color ? "color" : type === "bool" ? "boolean" : components > 1 ? "vector" : "number",
      components,
      range: parseRange(annotation, type),
      defaultValue: defaultValueFor(type, components, annotation, color),
      sourceStart: match.index,
      sourceEnd: match.index + match[0].length,
      indentation: match[1],
      precision: (match[2] as TunableUniformDefinition["precision"]) || null,
    });
  }
  return definitions;
}

function isBooleanType(type: SupportedUniformType) {
  return type === "bool" || type.startsWith("bvec");
}

export function resolveUniformValue(
  definition: TunableUniformDefinition,
  stored: ShaderUniformValue | undefined,
): ShaderUniformValue {
  if (definition.components === 1) {
    if (isBooleanType(definition.type)) {
      return typeof stored === "boolean" ? stored : definition.defaultValue;
    }
    if (typeof stored !== "number" || !Number.isFinite(stored)) return definition.defaultValue;
    return definition.type === "int" ? Math.round(stored) : stored;
  }
  if (!Array.isArray(stored) || stored.length !== definition.components) {
    return definition.defaultValue;
  }
  if (isBooleanType(definition.type)) {
    return stored.map((component) => Boolean(component));
  }
  if (!stored.every((component) => typeof component === "number" && Number.isFinite(component))) {
    return definition.defaultValue;
  }
  const numbers = stored.map(Number);
  return definition.type.startsWith("ivec") ? numbers.map(Math.round) : numbers;
}

export function resolveRuntimeUniforms(
  definitions: TunableUniformDefinition[],
  stored: ShaderUniformValues,
): RuntimeUniform[] {
  return definitions.map((definition) => ({
    name: definition.name,
    type: definition.type,
    value: resolveUniformValue(definition, stored[definition.name]),
  }));
}

function numberLiteral(value: number, integer: boolean) {
  const finite = Number.isFinite(value) ? value : 0;
  if (integer) return String(Math.round(finite));
  if (Number.isInteger(finite)) return `${finite.toFixed(1)}`;
  return Number(finite.toPrecision(8)).toString();
}

function uniformLiteral(definition: TunableUniformDefinition, value: ShaderUniformValue) {
  const booleanType = isBooleanType(definition.type);
  if (definition.components === 1) {
    if (booleanType) return value ? "true" : "false";
    return numberLiteral(typeof value === "number" ? value : 0, definition.type === "int");
  }
  const values = Array.isArray(value) ? value : [];
  const components = Array.from({ length: definition.components }, (_, index) => {
    const component = values[index] ?? 0;
    if (booleanType) return component ? "true" : "false";
    return numberLiteral(Number(component), definition.type.startsWith("ivec"));
  });
  return `${definition.type}(${components.join(", ")})`;
}

export function bakeUniformValuesIntoSource(source: string, stored: ShaderUniformValues) {
  const definitions = parseTunableUniforms(source);
  return definitions
    .slice()
    .reverse()
    .reduce((nextSource, definition) => {
      const value = resolveUniformValue(definition, stored[definition.name]);
      const precision = definition.precision ? `${definition.precision} ` : "";
      const replacement = `${definition.indentation}const ${precision}${definition.type} ${definition.name} = ${uniformLiteral(definition, value)};`;
      return `${nextSource.slice(0, definition.sourceStart)}${replacement}${nextSource.slice(definition.sourceEnd)}`;
    }, source);
}

export const UNIFORM_COMPONENT_LABELS = COMPONENTS;
