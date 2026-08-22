export const VERTEX_SHADER = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export type ShaderFrame = {
  time: number;
  timeDelta: number;
  frame: number;
  mouse: [number, number];
  drag: [number, number];
  scroll: number;
  uniforms?: RuntimeUniform[];
};

export type ProgramResult = { program: WebGLProgram; log: "" } | { program: null; log: string };

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return { shader: null, log: "Unable to create shader" };

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || "Shader compilation failed";
    gl.deleteShader(shader);
    return { shader: null, log };
  }

  return { shader, log: "" };
}

export function createProgram(gl: WebGL2RenderingContext, fragmentSource: string): ProgramResult {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  if (!vertex.shader) return { program: null, log: vertex.log };

  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!fragment.shader) {
    gl.deleteShader(vertex.shader);
    return { program: null, log: fragment.log };
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex.shader);
    gl.deleteShader(fragment.shader);
    return { program: null, log: "Unable to create shader program" };
  }

  gl.attachShader(program, vertex.shader);
  gl.attachShader(program, fragment.shader);
  gl.linkProgram(program);
  gl.deleteShader(vertex.shader);
  gl.deleteShader(fragment.shader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || "Shader link failed";
    gl.deleteProgram(program);
    return { program: null, log };
  }

  return { program, log: "" };
}

export function createFullscreenTriangle(gl: WebGL2RenderingContext) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Unable to create the shader geometry buffer.");

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  return buffer;
}

export function renderShaderFrame(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  buffer: WebGLBuffer,
  frame: ShaderFrame,
) {
  const canvas = gl.canvas;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const position = gl.getAttribLocation(program, "a_position");
  if (position >= 0) {
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), canvas.width, canvas.height);
  gl.uniform1f(gl.getUniformLocation(program, "u_time"), frame.time);
  gl.uniform1f(gl.getUniformLocation(program, "u_time_delta"), frame.timeDelta);
  gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), frame.mouse[0], frame.mouse[1]);
  gl.uniform2f(gl.getUniformLocation(program, "u_drag"), frame.drag[0], frame.drag[1]);
  gl.uniform1f(gl.getUniformLocation(program, "u_scroll"), frame.scroll);
  gl.uniform1i(gl.getUniformLocation(program, "u_frame"), frame.frame);
  for (const uniform of frame.uniforms ?? []) {
    const location = gl.getUniformLocation(program, uniform.name);
    if (!location) continue;
    if (uniform.type === "float" && typeof uniform.value === "number") {
      gl.uniform1f(location, uniform.value);
    } else if (uniform.type === "int" && typeof uniform.value === "number") {
      gl.uniform1i(location, Math.round(uniform.value));
    } else if (uniform.type === "bool" && typeof uniform.value === "boolean") {
      gl.uniform1i(location, uniform.value ? 1 : 0);
    } else if (Array.isArray(uniform.value)) {
      if (uniform.type.startsWith("bvec")) {
        const values = uniform.value.map((value) => (value ? 1 : 0));
        if (values.length === 2) gl.uniform2iv(location, values);
        else if (values.length === 3) gl.uniform3iv(location, values);
        else gl.uniform4iv(location, values);
      } else if (uniform.type.startsWith("ivec")) {
        const values = uniform.value.map((value) => Math.round(Number(value)));
        if (values.length === 2) gl.uniform2iv(location, values);
        else if (values.length === 3) gl.uniform3iv(location, values);
        else gl.uniform4iv(location, values);
      } else {
        const values = uniform.value.map(Number);
        if (values.length === 2) gl.uniform2fv(location, values);
        else if (values.length === 3) gl.uniform3fv(location, values);
        else gl.uniform4fv(location, values);
      }
    }
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
import type { RuntimeUniform } from "../uniforms/uniformTypes.ts";
