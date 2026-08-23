import { describe, expect, it } from "vite-plus/test";
import { getKeyboardOcclusion } from "./useVisualViewport.ts";

describe("getKeyboardOcclusion", () => {
  it("detects a keyboard from layout viewport occlusion", () => {
    expect(
      getKeyboardOcclusion({
        layoutHeight: 800,
        visualHeight: 470,
        visualOffsetTop: 0,
        largestVisualHeight: 800,
        editableFocused: true,
      }),
    ).toBe(330);
  });

  it("detects a keyboard when the layout viewport resizes with the visual viewport", () => {
    expect(
      getKeyboardOcclusion({
        layoutHeight: 470,
        visualHeight: 470,
        visualOffsetTop: 0,
        largestVisualHeight: 800,
        editableFocused: true,
      }),
    ).toBe(330);
  });

  it("does not classify browser chrome changes or an unfocused viewport as a keyboard", () => {
    expect(
      getKeyboardOcclusion({
        layoutHeight: 800,
        visualHeight: 750,
        visualOffsetTop: 0,
        largestVisualHeight: 800,
        editableFocused: true,
      }),
    ).toBe(0);
    expect(
      getKeyboardOcclusion({
        layoutHeight: 800,
        visualHeight: 470,
        visualOffsetTop: 0,
        largestVisualHeight: 800,
        editableFocused: false,
      }),
    ).toBe(0);
  });
});
