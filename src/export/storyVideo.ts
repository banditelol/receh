import { renderShaderFrame } from "../renderer/webgl.ts";
import type { RuntimeUniform } from "../uniforms/uniformTypes.ts";
import { createExportRenderer } from "./renderExport.ts";

export const STORY_VIDEO_WIDTH = 1080;
export const STORY_VIDEO_HEIGHT = 1920;
export const STORY_VIDEO_FPS = 30;
export const STORY_VIDEO_MIN_DURATION = 1;
export const STORY_VIDEO_MAX_DURATION = 60;

export type StoryVideoOptions = {
  durationSeconds: number;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  uniforms?: RuntimeUniform[];
};

export type StoryVideoResult = {
  blob: Blob;
  mimeType: "video/mp4";
  extension: "mp4";
  label: "MP4";
  frameRateMode: "constant" | "variable";
};

export type StoryVideoCapability = {
  supported: boolean;
  frameRateMode: "constant" | "variable" | null;
};

export function clampStoryDuration(value: number) {
  if (!Number.isFinite(value)) return 15;
  return Math.min(STORY_VIDEO_MAX_DURATION, Math.max(STORY_VIDEO_MIN_DURATION, value));
}

export function storyFrameCount(durationSeconds: number) {
  return Math.max(1, Math.round(clampStoryDuration(durationSeconds) * STORY_VIDEO_FPS));
}

export function storyFrameTimestamp(frame: number) {
  return frame / STORY_VIDEO_FPS;
}

export async function canRenderStoryVideo() {
  const { canEncodeVideo, Quality } = await import("mediabunny");
  return canEncodeVideo("avc", {
    width: STORY_VIDEO_WIDTH,
    height: STORY_VIDEO_HEIGHT,
    quality: new Quality("high"),
    hardwareAcceleration: "no-preference",
  });
}

function getRealtimeMp4MimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["video/mp4;codecs=avc1.42E01E", "video/mp4"];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}

export async function getStoryVideoCapability(): Promise<StoryVideoCapability> {
  if (await canRenderStoryVideo()) return { supported: true, frameRateMode: "constant" };
  const canCaptureCanvas =
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function";
  const mimeType = getRealtimeMp4MimeType();
  return {
    supported: canCaptureCanvas && mimeType !== null,
    frameRateMode: canCaptureCanvas && mimeType ? "variable" : null,
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Story recording canceled.", "AbortError");
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function renderDeterministicStoryVideo(
  source: string,
  options: StoryVideoOptions,
): Promise<StoryVideoResult> {
  throwIfAborted(options.signal);
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } =
    await import("mediabunny");
  const renderer = createExportRenderer(source, STORY_VIDEO_WIDTH, STORY_VIDEO_HEIGHT);
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const videoSource = new CanvasSource(renderer.canvas, {
    codec: "avc",
    quality: new Quality("high"),
    keyFrameInterval: 2,
    latencyMode: "quality",
    hardwareAcceleration: "no-preference",
  });
  output.addVideoTrack(videoSource, { name: "Shader Pocket Story" });

  try {
    await output.start();
    const totalFrames = storyFrameCount(options.durationSeconds);
    const frameDuration = 1 / STORY_VIDEO_FPS;

    for (let frame = 0; frame < totalFrames; frame += 1) {
      throwIfAborted(options.signal);
      const time = storyFrameTimestamp(frame);
      renderShaderFrame(renderer.gl, renderer.program, renderer.buffer, {
        time,
        timeDelta: frame === 0 ? 0 : frameDuration,
        frame,
        mouse: [STORY_VIDEO_WIDTH / 2, STORY_VIDEO_HEIGHT / 2],
        drag: [0, 0],
        scroll: 0,
        uniforms: options.uniforms,
      });
      renderer.gl.finish();
      await videoSource.add(time, frameDuration, {
        keyFrame: frame % (STORY_VIDEO_FPS * 2) === 0,
      });
      options.onProgress?.((frame + 1) / totalFrames);
      if (frame % 4 === 3) await yieldToBrowser();
    }

    throwIfAborted(options.signal);
    await output.finalize();
    if (!target.buffer) throw new Error("The video encoder produced an empty MP4 file.");
    return {
      blob: new Blob([target.buffer], { type: "video/mp4" }),
      mimeType: "video/mp4",
      extension: "mp4",
      label: "MP4",
      frameRateMode: "constant",
    };
  } catch (error) {
    if (output.state === "started") await output.cancel();
    throw error;
  } finally {
    renderer.dispose();
  }
}

async function renderRealtimeStoryVideo(
  source: string,
  options: StoryVideoOptions,
  mimeType: string,
): Promise<StoryVideoResult> {
  const durationSeconds = clampStoryDuration(options.durationSeconds);
  const renderer = createExportRenderer(source, STORY_VIDEO_WIDTH, STORY_VIDEO_HEIGHT);
  const stream = renderer.canvas.captureStream(STORY_VIDEO_FPS);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 10_000_000,
  });
  const chunks: Blob[] = [];

  return await new Promise<StoryVideoResult>((resolve, reject) => {
    let animationFrame = 0;
    let startedAt = 0;
    let lastFrameAt = 0;
    let frame = 0;
    let aborted = false;

    const cleanup = () => {
      cancelAnimationFrame(animationFrame);
      options.signal?.removeEventListener("abort", handleAbort);
      for (const track of stream.getTracks()) track.stop();
      renderer.dispose();
    };
    const stopRecorder = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };
    const handleAbort = () => {
      aborted = true;
      stopRecorder();
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error("The browser video recorder failed."));
    };
    recorder.onstop = () => {
      cleanup();
      if (aborted) {
        reject(new DOMException("Story recording canceled.", "AbortError"));
        return;
      }
      if (chunks.length === 0) {
        reject(new Error("The browser produced an empty video recording."));
        return;
      }
      resolve({
        blob: new Blob(chunks, { type: mimeType }),
        mimeType: "video/mp4",
        extension: "mp4",
        label: "MP4",
        frameRateMode: "variable",
      });
    };

    const render = (now: number) => {
      const time = Math.min((now - startedAt) / 1000, durationSeconds);
      renderShaderFrame(renderer.gl, renderer.program, renderer.buffer, {
        time,
        timeDelta: frame === 0 ? 0 : Math.max(0, (now - lastFrameAt) / 1000),
        frame: frame++,
        mouse: [STORY_VIDEO_WIDTH / 2, STORY_VIDEO_HEIGHT / 2],
        drag: [0, 0],
        scroll: 0,
        uniforms: options.uniforms,
      });
      renderer.gl.flush();
      lastFrameAt = now;
      options.onProgress?.(time / durationSeconds);

      if (time >= durationSeconds) {
        stopRecorder();
        return;
      }
      animationFrame = requestAnimationFrame(render);
    };

    if (options.signal?.aborted) {
      cleanup();
      reject(new DOMException("Story recording canceled.", "AbortError"));
      return;
    }
    options.signal?.addEventListener("abort", handleAbort, { once: true });
    recorder.start(250);
    startedAt = performance.now();
    lastFrameAt = startedAt;
    animationFrame = requestAnimationFrame(render);
  });
}

export async function renderStoryVideo(
  source: string,
  options: StoryVideoOptions,
): Promise<StoryVideoResult> {
  if (await canRenderStoryVideo()) return renderDeterministicStoryVideo(source, options);

  const mimeType = getRealtimeMp4MimeType();
  if (mimeType && typeof HTMLCanvasElement.prototype.captureStream === "function") {
    return renderRealtimeStoryVideo(source, options, mimeType);
  }
  throw new Error("This browser cannot encode the H.264 MP4 required for Story export.");
}
