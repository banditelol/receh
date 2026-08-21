export const DEFAULT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_drag;
uniform float u_scroll;

out vec4 fragColor;

float palette(float t, float offset) {
  return 0.55 + 0.45 * cos(6.28318 * (t + offset));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);

  vec2 pointer = (u_mouse / max(u_resolution, vec2(1.0)) - 0.5) * 0.45;
  uv -= pointer;

  float radius = length(uv);
  float angle = atan(uv.y, uv.x);
  float wave = sin(radius * 12.0 - u_time * 1.8 + angle * 3.0);
  float halo = 0.035 / abs(radius - 0.42 - wave * 0.025);
  float glow = 0.018 / max(radius, 0.015);

  vec3 color = vec3(
    palette(radius + u_time * 0.035, 0.00),
    palette(radius + u_time * 0.035, 0.11),
    palette(radius + u_time * 0.035, 0.24)
  );

  color *= halo + glow;
  color += vec3(0.9, 0.2, 0.04) * max(0.0, wave) * 0.08;
  color *= 1.0 - smoothstep(0.7, 1.35, radius);

  fragColor = vec4(pow(color, vec3(0.82)), 1.0);
}`;
