export type ShaderDiagnostic = {
  line: number;
  message: string;
  sourceView?: "pass" | "project" | "global";
};

const WEBGL_ERROR = /ERROR:\s*\d+:(\d+):\s*(.*)/i;
const ANGLE_ERROR = /(?:^|\s)0\((\d+)\)\s*:\s*(?:error[^:]*:\s*)?(.*)/i;

export function parseShaderDiagnostics(log: string): ShaderDiagnostic[] {
  const diagnostics: ShaderDiagnostic[] = [];

  for (const rawLine of log.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = WEBGL_ERROR.exec(line) ?? ANGLE_ERROR.exec(line);
    if (!match) continue;

    diagnostics.push({
      line: Math.max(1, Number(match[1]) || 1),
      message: match[2]?.trim().replace(/^error\s+/i, "") || "Shader compilation failed",
    });
  }

  return diagnostics;
}
