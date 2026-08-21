import { describe, expect, it } from "vite-plus/test";
import {
  clampStoryDuration,
  storyFrameCount,
  storyFrameTimestamp,
  STORY_VIDEO_FPS,
  STORY_VIDEO_MAX_DURATION,
  STORY_VIDEO_MIN_DURATION,
} from "./storyVideo.ts";

describe("Story video settings", () => {
  it("clamps duration to the supported Story range", () => {
    expect(clampStoryDuration(0)).toBe(STORY_VIDEO_MIN_DURATION);
    expect(clampStoryDuration(12)).toBe(12);
    expect(clampStoryDuration(200)).toBe(STORY_VIDEO_MAX_DURATION);
    expect(clampStoryDuration(Number.NaN)).toBe(15);
  });

  it("calculates an exact 30 FPS frame timeline", () => {
    expect(storyFrameCount(2)).toBe(STORY_VIDEO_FPS * 2);
    expect(storyFrameTimestamp(15)).toBe(0.5);
  });

  it("rounds fractional durations to the nearest complete frame", () => {
    expect(storyFrameCount(1.51)).toBe(45);
  });
});
