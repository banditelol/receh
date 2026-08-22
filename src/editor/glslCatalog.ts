export type GlslReferenceCategory =
  | "Angle and trigonometry"
  | "Exponential"
  | "Common"
  | "Geometric"
  | "Matrix"
  | "Vector relational"
  | "Derivatives"
  | "Texture";

export type GlslReferenceEntry = {
  name: string;
  category: GlslReferenceCategory;
  signatures: readonly string[];
  summary: string;
  example: string;
  snippet: string;
  keywords?: readonly string[];
  rank?: number;
};

const entry = (
  name: string,
  category: GlslReferenceCategory,
  signatures: readonly string[],
  summary: string,
  example: string,
  snippet: string,
  keywords?: readonly string[],
  rank?: number,
): GlslReferenceEntry => ({
  name,
  category,
  signatures,
  summary,
  example,
  snippet,
  keywords,
  rank,
});

export const GLSL_REFERENCE_SOURCE =
  "https://registry.khronos.org/OpenGL-Refpages/es3.0/html/start.html";

export const GLSL_REFERENCE_ENTRIES: readonly GlslReferenceEntry[] = [
  entry(
    "radians",
    "Angle and trigonometry",
    ["genType radians(genType degrees)"],
    "Converts an angle from degrees to radians component-wise.",
    "float angle = radians(45.0);",
    "radians(${degrees})",
    ["angle", "convert", "degrees"],
  ),
  entry(
    "degrees",
    "Angle and trigonometry",
    ["genType degrees(genType radians)"],
    "Converts an angle from radians to degrees component-wise.",
    "float angle = degrees(3.14159);",
    "degrees(${radians})",
    ["angle", "convert", "radians"],
  ),
  entry(
    "sin",
    "Angle and trigonometry",
    ["genType sin(genType angle)"],
    "Returns the sine of each angle, with input measured in radians.",
    "float wave = sin(uv.x * 8.0 + u_time);",
    "sin(${angle})",
    ["sine", "wave", "oscillation"],
    12,
  ),
  entry(
    "cos",
    "Angle and trigonometry",
    ["genType cos(genType angle)"],
    "Returns the cosine of each angle, with input measured in radians.",
    "vec3 palette = 0.5 + 0.5 * cos(t + vec3(0.0, 2.0, 4.0));",
    "cos(${angle})",
    ["cosine", "palette", "wave"],
    12,
  ),
  entry(
    "tan",
    "Angle and trigonometry",
    ["genType tan(genType angle)"],
    "Returns the tangent of each angle in radians.",
    "float slope = tan(radians(30.0));",
    "tan(${angle})",
    ["tangent", "angle"],
  ),
  entry(
    "asin",
    "Angle and trigonometry",
    ["genType asin(genType x)"],
    "Returns the inverse sine in radians for values in the range -1 to 1.",
    "float angle = asin(clamp(value, -1.0, 1.0));",
    "asin(${x})",
    ["inverse", "arcsine", "angle"],
  ),
  entry(
    "acos",
    "Angle and trigonometry",
    ["genType acos(genType x)"],
    "Returns the inverse cosine in radians for values in the range -1 to 1.",
    "float angle = acos(clamp(dot(a, b), -1.0, 1.0));",
    "acos(${x})",
    ["inverse", "arccosine", "angle"],
  ),
  entry(
    "atan",
    "Angle and trigonometry",
    ["genType atan(genType y, genType x)", "genType atan(genType y_over_x)"],
    "Returns an inverse tangent angle. The two-argument form preserves the quadrant.",
    "float angle = atan(uv.y, uv.x);",
    "atan(${y}, ${x})",
    ["inverse", "arctangent", "angle", "polar"],
    10,
  ),
  entry(
    "pow",
    "Exponential",
    ["genType pow(genType base, genType exponent)"],
    "Raises each base component to the corresponding exponent.",
    "vec3 corrected = pow(color, vec3(1.0 / 2.2));",
    "pow(${base}, ${exponent})",
    ["power", "gamma", "exponent"],
    10,
  ),
  entry(
    "exp",
    "Exponential",
    ["genType exp(genType x)"],
    "Returns the natural exponential of each component.",
    "float falloff = exp(-distance * 4.0);",
    "exp(${x})",
    ["exponential", "e", "falloff"],
  ),
  entry(
    "log",
    "Exponential",
    ["genType log(genType x)"],
    "Returns the natural logarithm of each positive component.",
    "float stops = log(max(luminance, 0.0001));",
    "log(${x})",
    ["logarithm", "natural"],
  ),
  entry(
    "exp2",
    "Exponential",
    ["genType exp2(genType x)"],
    "Returns 2 raised to each component.",
    "float exposure = exp2(stops);",
    "exp2(${x})",
    ["exponential", "power", "base two"],
  ),
  entry(
    "log2",
    "Exponential",
    ["genType log2(genType x)"],
    "Returns the base-2 logarithm of each positive component.",
    "float stops = log2(max(luminance, 0.0001));",
    "log2(${x})",
    ["logarithm", "base two"],
  ),
  entry(
    "sqrt",
    "Exponential",
    ["genType sqrt(genType x)"],
    "Returns the non-negative square root of each component.",
    "float radius = sqrt(dot(uv, uv));",
    "sqrt(${x})",
    ["square root", "root"],
    8,
  ),
  entry(
    "inversesqrt",
    "Exponential",
    ["genType inversesqrt(genType x)"],
    "Returns one divided by the square root of each component.",
    "vec3 unitNormal = normal * inversesqrt(dot(normal, normal));",
    "inversesqrt(${x})",
    ["reciprocal", "square root", "normalize"],
  ),
  entry(
    "abs",
    "Common",
    ["genType abs(genType x)", "genIType abs(genIType x)"],
    "Returns the absolute value of each component.",
    "vec2 mirrored = abs(uv);",
    "abs(${x})",
    ["absolute", "magnitude", "mirror"],
    12,
  ),
  entry(
    "sign",
    "Common",
    ["genType sign(genType x)", "genIType sign(genIType x)"],
    "Returns -1, 0, or 1 according to the sign of each component.",
    "vec2 direction = sign(uv);",
    "sign(${x})",
    ["positive", "negative", "direction"],
  ),
  entry(
    "floor",
    "Common",
    ["genType floor(genType x)"],
    "Rounds each component down to the nearest whole value.",
    "vec2 cell = floor(uv * 10.0);",
    "floor(${x})",
    ["round", "grid", "integer"],
    8,
  ),
  entry(
    "trunc",
    "Common",
    ["genType trunc(genType x)"],
    "Rounds each component toward zero to a whole value.",
    "vec2 whole = trunc(value);",
    "trunc(${x})",
    ["round", "integer"],
  ),
  entry(
    "round",
    "Common",
    ["genType round(genType x)"],
    "Rounds each component to the nearest whole value.",
    "vec2 pixel = round(uv * u_resolution);",
    "round(${x})",
    ["nearest", "integer"],
  ),
  entry(
    "roundEven",
    "Common",
    ["genType roundEven(genType x)"],
    "Rounds to the nearest whole value, resolving exact halves toward an even result.",
    "float unbiased = roundEven(value);",
    "roundEven(${x})",
    ["bankers rounding", "nearest", "integer"],
  ),
  entry(
    "ceil",
    "Common",
    ["genType ceil(genType x)"],
    "Rounds each component up to the nearest whole value.",
    "vec2 tiles = ceil(u_resolution / 16.0);",
    "ceil(${x})",
    ["round", "integer"],
  ),
  entry(
    "fract",
    "Common",
    ["genType fract(genType x)"],
    "Returns the fractional part of each component.",
    "vec2 repeatedUv = fract(uv * 5.0);",
    "fract(${x})",
    ["fraction", "repeat", "tile"],
    12,
  ),
  entry(
    "mod",
    "Common",
    ["genType mod(genType x, genType y)", "genType mod(genType x, float y)"],
    "Returns the component-wise remainder using x minus y times floor(x divided by y).",
    "float wrapped = mod(angle, 6.28318);",
    "mod(${x}, ${y})",
    ["modulo", "remainder", "wrap"],
    10,
  ),
  entry(
    "min",
    "Common",
    ["genType min(genType x, genType y)", "genType min(genType x, float y)"],
    "Returns the smaller value for each pair of components.",
    "float nearest = min(distanceA, distanceB);",
    "min(${x}, ${y})",
    ["minimum", "smaller"],
    12,
  ),
  entry(
    "max",
    "Common",
    ["genType max(genType x, genType y)", "genType max(genType x, float y)"],
    "Returns the larger value for each pair of components.",
    "float light = max(dot(normal, direction), 0.0);",
    "max(${x}, ${y})",
    ["maximum", "larger"],
    12,
  ),
  entry(
    "clamp",
    "Common",
    ["genType clamp(genType x, genType minValue, genType maxValue)"],
    "Constrains each component to a closed minimum and maximum range.",
    "vec3 displayColor = clamp(color, 0.0, 1.0);",
    "clamp(${x}, ${minValue}, ${maxValue})",
    ["limit", "range", "saturate"],
    15,
  ),
  entry(
    "mix",
    "Common",
    [
      "genType mix(genType x, genType y, genType amount)",
      "genType mix(genType x, genType y, float amount)",
    ],
    "Linearly blends between x and y using the amount component-wise.",
    "vec3 color = mix(background, glow, mask);",
    "mix(${x}, ${y}, ${amount})",
    ["lerp", "blend", "interpolate"],
    18,
  ),
  entry(
    "step",
    "Common",
    ["genType step(genType edge, genType x)", "genType step(float edge, genType x)"],
    "Returns zero below the edge and one at or above it.",
    "float mask = step(0.5, value);",
    "step(${edge}, ${x})",
    ["threshold", "mask"],
    12,
  ),
  entry(
    "smoothstep",
    "Common",
    [
      "genType smoothstep(genType edge0, genType edge1, genType x)",
      "genType smoothstep(float edge0, float edge1, genType x)",
    ],
    "Produces a smooth Hermite transition from zero to one between two edges.",
    "float circle = 1.0 - smoothstep(0.29, 0.31, length(uv));",
    "smoothstep(${edge0}, ${edge1}, ${x})",
    ["threshold", "hermite", "mask", "soft edge"],
    20,
  ),
  entry(
    "isnan",
    "Common",
    ["genBType isnan(genType x)"],
    "Reports which components contain a not-a-number value.",
    "bvec3 invalid = isnan(color);",
    "isnan(${x})",
    ["nan", "invalid", "debug"],
  ),
  entry(
    "isinf",
    "Common",
    ["genBType isinf(genType x)"],
    "Reports which components contain positive or negative infinity.",
    "bvec3 overflowed = isinf(color);",
    "isinf(${x})",
    ["infinity", "invalid", "debug"],
  ),
  entry(
    "length",
    "Geometric",
    ["float length(genType vector)"],
    "Returns the Euclidean magnitude of a vector.",
    "float radius = length(uv);",
    "length(${vector})",
    ["magnitude", "distance", "radius"],
    18,
  ),
  entry(
    "distance",
    "Geometric",
    ["float distance(genType point0, genType point1)"],
    "Returns the Euclidean distance between two points.",
    "float d = distance(uv, pointer);",
    "distance(${point0}, ${point1})",
    ["length", "points", "magnitude"],
    12,
  ),
  entry(
    "dot",
    "Geometric",
    ["float dot(genType x, genType y)"],
    "Returns the scalar dot product of two vectors.",
    "float diffuse = max(dot(normal, lightDir), 0.0);",
    "dot(${x}, ${y})",
    ["product", "lighting", "projection"],
    15,
  ),
  entry(
    "cross",
    "Geometric",
    ["vec3 cross(vec3 x, vec3 y)"],
    "Returns the vector perpendicular to two three-dimensional vectors.",
    "vec3 normal = normalize(cross(tangent, bitangent));",
    "cross(${x}, ${y})",
    ["perpendicular", "normal", "product"],
  ),
  entry(
    "normalize",
    "Geometric",
    ["genType normalize(genType vector)"],
    "Returns a vector with the same direction and unit length.",
    "vec3 direction = normalize(target - origin);",
    "normalize(${vector})",
    ["unit", "direction", "magnitude"],
    18,
  ),
  entry(
    "faceforward",
    "Geometric",
    ["genType faceforward(genType normal, genType incident, genType reference)"],
    "Orients a normal away from the direction identified by a reference normal.",
    "vec3 visibleNormal = faceforward(normal, viewDir, geometricNormal);",
    "faceforward(${normal}, ${incident}, ${reference})",
    ["normal", "orient"],
  ),
  entry(
    "reflect",
    "Geometric",
    ["genType reflect(genType incident, genType normal)"],
    "Returns the reflection direction for an incident vector and surface normal.",
    "vec3 bounce = reflect(rayDirection, normal);",
    "reflect(${incident}, ${normal})",
    ["ray", "normal", "bounce"],
  ),
  entry(
    "refract",
    "Geometric",
    ["genType refract(genType incident, genType normal, float eta)"],
    "Returns the refraction direction for an incident vector, normal, and index ratio.",
    "vec3 bent = refract(rayDirection, normal, 1.0 / 1.33);",
    "refract(${incident}, ${normal}, ${eta})",
    ["ray", "normal", "index", "ior"],
  ),
  entry(
    "matrixCompMult",
    "Matrix",
    ["mat matrixCompMult(mat x, mat y)"],
    "Multiplies matching matrix components without performing matrix multiplication.",
    "mat3 combined = matrixCompMult(a, b);",
    "matrixCompMult(${x}, ${y})",
    ["component", "hadamard"],
  ),
  entry(
    "outerProduct",
    "Matrix",
    ["mat outerProduct(vec column, vec row)"],
    "Builds a matrix from every pairwise product of a column and row vector.",
    "mat3 basis = outerProduct(a, b);",
    "outerProduct(${column}, ${row})",
    ["matrix", "vector", "product"],
  ),
  entry(
    "transpose",
    "Matrix",
    ["mat transpose(mat matrix)"],
    "Returns a matrix with its rows and columns exchanged.",
    "mat3 inverseRotation = transpose(rotation);",
    "transpose(${matrix})",
    ["rows", "columns"],
  ),
  entry(
    "determinant",
    "Matrix",
    ["float determinant(mat matrix)"],
    "Returns the determinant of a square matrix.",
    "float scale = determinant(transform);",
    "determinant(${matrix})",
    ["matrix", "invertible"],
  ),
  entry(
    "inverse",
    "Matrix",
    ["mat inverse(mat matrix)"],
    "Returns the inverse of a square matrix when the input is invertible.",
    "vec3 localPoint = inverse(transform) * worldPoint;",
    "inverse(${matrix})",
    ["matrix", "transform"],
  ),
  entry(
    "lessThan",
    "Vector relational",
    ["bvec lessThan(vec x, vec y)", "bvec lessThan(ivec x, ivec y)"],
    "Compares corresponding components and returns true where x is less than y.",
    "bvec3 below = lessThan(color, vec3(0.0));",
    "lessThan(${x}, ${y})",
    ["compare", "boolean"],
  ),
  entry(
    "lessThanEqual",
    "Vector relational",
    ["bvec lessThanEqual(vec x, vec y)", "bvec lessThanEqual(ivec x, ivec y)"],
    "Returns true where each x component is less than or equal to y.",
    "bvec2 inside = lessThanEqual(abs(uv), bounds);",
    "lessThanEqual(${x}, ${y})",
    ["compare", "boolean"],
  ),
  entry(
    "greaterThan",
    "Vector relational",
    ["bvec greaterThan(vec x, vec y)", "bvec greaterThan(ivec x, ivec y)"],
    "Returns true where each x component is greater than y.",
    "bvec3 over = greaterThan(color, vec3(1.0));",
    "greaterThan(${x}, ${y})",
    ["compare", "boolean"],
  ),
  entry(
    "greaterThanEqual",
    "Vector relational",
    ["bvec greaterThanEqual(vec x, vec y)", "bvec greaterThanEqual(ivec x, ivec y)"],
    "Returns true where each x component is greater than or equal to y.",
    "bvec2 outside = greaterThanEqual(abs(uv), bounds);",
    "greaterThanEqual(${x}, ${y})",
    ["compare", "boolean"],
  ),
  entry(
    "equal",
    "Vector relational",
    ["bvec equal(vec x, vec y)", "bvec equal(bvec x, bvec y)"],
    "Returns true where corresponding components are equal.",
    "bool same = all(equal(a, b));",
    "equal(${x}, ${y})",
    ["compare", "boolean", "same"],
  ),
  entry(
    "notEqual",
    "Vector relational",
    ["bvec notEqual(vec x, vec y)", "bvec notEqual(bvec x, bvec y)"],
    "Returns true where corresponding components differ.",
    "bool changed = any(notEqual(previous, current));",
    "notEqual(${x}, ${y})",
    ["compare", "boolean", "different"],
  ),
  entry(
    "any",
    "Vector relational",
    ["bool any(bvec x)"],
    "Returns true when at least one Boolean vector component is true.",
    "bool visible = any(greaterThan(color, vec3(0.0)));",
    "any(${x})",
    ["boolean", "some"],
  ),
  entry(
    "all",
    "Vector relational",
    ["bool all(bvec x)"],
    "Returns true only when every Boolean vector component is true.",
    "bool inside = all(lessThan(abs(uv), bounds));",
    "all(${x})",
    ["boolean", "every"],
  ),
  entry(
    "not",
    "Vector relational",
    ["bvec not(bvec x)"],
    "Logically negates each Boolean vector component.",
    "bvec3 enabled = not(disabled);",
    "not(${x})",
    ["boolean", "negate"],
  ),
  entry(
    "dFdx",
    "Derivatives",
    ["genType dFdx(genType expression)"],
    "Approximates the window-space partial derivative in the x direction.",
    "float edgeWidthX = abs(dFdx(distanceField));",
    "dFdx(${expression})",
    ["derivative", "gradient", "antialias"],
  ),
  entry(
    "dFdy",
    "Derivatives",
    ["genType dFdy(genType expression)"],
    "Approximates the window-space partial derivative in the y direction.",
    "float edgeWidthY = abs(dFdy(distanceField));",
    "dFdy(${expression})",
    ["derivative", "gradient", "antialias"],
  ),
  entry(
    "fwidth",
    "Derivatives",
    ["genType fwidth(genType expression)"],
    "Returns the sum of the absolute x and y window-space derivatives.",
    "float alpha = smoothstep(-fwidth(d), fwidth(d), -d);",
    "fwidth(${expression})",
    ["derivative", "gradient", "antialias", "edge"],
    10,
  ),
  entry(
    "texture",
    "Texture",
    [
      "gvec4 texture(gsampler sampler, vec coordinates)",
      "gvec4 texture(gsampler sampler, vec coordinates, float bias)",
    ],
    "Samples a texture using normalized coordinates and implicit level-of-detail selection.",
    "vec4 sampled = texture(u_texture, uv);",
    "texture(${sampler}, ${coordinates})",
    ["sample", "sampler", "image"],
    15,
  ),
  entry(
    "textureLod",
    "Texture",
    ["gvec4 textureLod(gsampler sampler, vec coordinates, float lod)"],
    "Samples a texture at an explicitly selected level of detail.",
    "vec4 blurred = textureLod(u_texture, uv, 2.0);",
    "textureLod(${sampler}, ${coordinates}, ${lod})",
    ["sample", "sampler", "mipmap"],
  ),
  entry(
    "textureOffset",
    "Texture",
    ["gvec4 textureOffset(gsampler sampler, vec coordinates, ivec offset)"],
    "Samples a texture with a constant integer texel offset.",
    "vec4 neighbor = textureOffset(u_texture, uv, ivec2(1, 0));",
    "textureOffset(${sampler}, ${coordinates}, ${offset})",
    ["sample", "sampler", "neighbor", "texel"],
  ),
  entry(
    "texelFetch",
    "Texture",
    ["gvec4 texelFetch(gsampler sampler, ivec coordinates, int lod)"],
    "Fetches one texel using integer coordinates without filtering.",
    "vec4 exact = texelFetch(u_texture, pixel, 0);",
    "texelFetch(${sampler}, ${coordinates}, ${lod})",
    ["sample", "sampler", "pixel", "unfiltered"],
  ),
  entry(
    "textureSize",
    "Texture",
    ["ivec textureSize(gsampler sampler, int lod)"],
    "Returns the texture dimensions for a selected level of detail.",
    "vec2 texel = 1.0 / vec2(textureSize(u_texture, 0));",
    "textureSize(${sampler}, ${lod})",
    ["dimensions", "resolution", "sampler"],
  ),
] as const;

const ENTRY_BY_NAME = new Map(GLSL_REFERENCE_ENTRIES.map((item) => [item.name, item]));

export function getGlslReference(name: string) {
  return ENTRY_BY_NAME.get(name);
}

function normalizeSearchValue(value: string) {
  return value.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, "");
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution =
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        substitution,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function scoreValue(query: string, value: string) {
  if (value === query) return 1_000;
  if (value.startsWith(query)) return 850 - Math.min(100, value.length - query.length);
  const includedAt = value.indexOf(query);
  if (includedAt >= 0) return 650 - includedAt * 5;
  const distance = editDistance(query, value);
  const tolerance = Math.max(1, Math.ceil(query.length * 0.34));
  return distance <= tolerance ? 480 - distance * 55 : 0;
}

export function searchGlslReferences(query: string, limit = 18) {
  const normalizedQuery = normalizeSearchValue(query);
  return GLSL_REFERENCE_ENTRIES.map((item) => {
    if (!normalizedQuery) return { item, score: 100 + (item.rank ?? 0) };
    const candidates = [item.name, item.category, ...(item.keywords ?? [])].map(
      normalizeSearchValue,
    );
    return {
      item,
      score: Math.max(...candidates.map((candidate) => scoreValue(normalizedQuery, candidate))),
    };
  })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}

export function getGlslReferenceUrl(entryName: string) {
  return `https://registry.khronos.org/OpenGL-Refpages/es3.0/html/${encodeURIComponent(entryName)}.xhtml`;
}
