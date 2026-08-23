import { useEffect } from "react";

const KEYBOARD_THRESHOLD = 80;

type KeyboardViewportMetrics = {
  layoutHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
  largestVisualHeight: number;
  editableFocused: boolean;
};

export function getKeyboardOcclusion({
  layoutHeight,
  visualHeight,
  visualOffsetTop,
  largestVisualHeight,
  editableFocused,
}: KeyboardViewportMetrics) {
  if (!editableFocused) return 0;
  const layoutOcclusion = Math.max(0, layoutHeight - visualHeight - visualOffsetTop);
  const viewportShrink = Math.max(0, largestVisualHeight - visualHeight);
  const occlusion = Math.max(layoutOcclusion, viewportShrink);
  return occlusion >= KEYBOARD_THRESHOLD ? occlusion : 0;
}

function hasEditableFocus(activeElement: Element | null) {
  if (!(activeElement instanceof HTMLElement)) return false;
  return (
    activeElement.isContentEditable ||
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  );
}

export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let largestVisualHeight = viewport.height;

    const update = () => {
      const editableFocused = hasEditableFocus(document.activeElement);
      if (!editableFocused) largestVisualHeight = Math.max(largestVisualHeight, viewport.height);
      const keyboardHeight = getKeyboardOcclusion({
        layoutHeight: window.innerHeight,
        visualHeight: viewport.height,
        visualOffsetTop: viewport.offsetTop,
        largestVisualHeight,
        editableFocused,
      });
      root.style.setProperty("--app-height", `${viewport.height}px`);
      root.style.setProperty("--viewport-top", `${viewport.offsetTop}px`);
      root.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
      root.toggleAttribute("data-keyboard-open", keyboardHeight > 0);
    };

    const updateAfterFocusChange = () => window.requestAnimationFrame(update);
    const handleOrientationChange = () => {
      largestVisualHeight = viewport.height;
      update();
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", updateAfterFocusChange);
    document.addEventListener("focusout", updateAfterFocusChange);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", updateAfterFocusChange);
      document.removeEventListener("focusout", updateAfterFocusChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
      root.removeAttribute("data-keyboard-open");
    };
  }, []);
}
