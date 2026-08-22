export const SUPPORTED_UNIFORM_TYPES = [
  "float",
  "int",
  "bool",
  "vec2",
  "vec3",
  "vec4",
  "ivec2",
  "ivec3",
  "ivec4",
  "bvec2",
  "bvec3",
  "bvec4",
] as const;

export type SupportedUniformType = (typeof SUPPORTED_UNIFORM_TYPES)[number];
export type ShaderUniformValue = number | boolean | number[] | boolean[];
export type ShaderUniformValues = Record<string, ShaderUniformValue>;

export type UniformRange = {
  min: number;
  max: number;
  step: number;
};

export type TunableUniformDefinition = {
  name: string;
  label: string;
  type: SupportedUniformType;
  control: "number" | "boolean" | "vector" | "color";
  components: number;
  range: UniformRange;
  defaultValue: ShaderUniformValue;
  sourceStart: number;
  sourceEnd: number;
  indentation: string;
  precision: "lowp" | "mediump" | "highp" | null;
};

export type RuntimeUniform = {
  name: string;
  type: SupportedUniformType;
  value: ShaderUniformValue;
};

export const RESERVED_RUNTIME_UNIFORMS = new Set([
  "u_resolution",
  "u_time",
  "u_time_delta",
  "u_frame",
  "u_mouse",
  "u_drag",
  "u_scroll",
]);

export function isShaderUniformValue(value: unknown): value is ShaderUniformValue {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 4 &&
    (value.every((component) => typeof component === "number" && Number.isFinite(component)) ||
      value.every((component) => typeof component === "boolean"))
  );
}

export function parseShaderUniformValues(value: unknown): ShaderUniformValues {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, ShaderUniformValue] =>
        /^[A-Za-z_]\w*$/.test(entry[0]) && isShaderUniformValue(entry[1]),
    ),
  );
}
