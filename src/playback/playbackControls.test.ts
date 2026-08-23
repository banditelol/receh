import { describe, expect, it } from "vite-plus/test";
import { createPlaybackRestart, togglePlaybackToolbar } from "./playbackControls.ts";

describe("playback controls", () => {
  it("restarts from zero, resumes, and issues a new seek request", () => {
    expect(createPlaybackRestart({ time: 18.5, request: 4 })).toEqual({
      paused: false,
      playbackTime: 0,
      seekRequest: { time: 0, request: 5 },
    });
  });

  it("toggles the collapsed toolbar state", () => {
    expect(togglePlaybackToolbar(false)).toBe(true);
    expect(togglePlaybackToolbar(true)).toBe(false);
  });
});
