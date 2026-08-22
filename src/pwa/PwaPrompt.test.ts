import { describe, expect, it } from "vite-plus/test";
import {
  INSTALL_PROMPT_DISMISSED_KEY,
  loadInstallPromptDismissed,
  saveInstallPromptDismissed,
} from "./PwaPrompt.tsx";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("install prompt dismissal", () => {
  it("persists dismissal across component reloads", () => {
    const storage = memoryStorage();

    expect(loadInstallPromptDismissed(storage)).toBe(false);
    saveInstallPromptDismissed(storage);
    expect(loadInstallPromptDismissed(storage)).toBe(true);
  });

  it("ignores unrelated or stale values", () => {
    const storage = memoryStorage({ [INSTALL_PROMPT_DISMISSED_KEY]: "false" });

    expect(loadInstallPromptDismissed(storage)).toBe(false);
  });

  it("fails open when browser storage is blocked", () => {
    const storage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };

    expect(loadInstallPromptDismissed(storage)).toBe(false);
    expect(() => saveInstallPromptDismissed(storage)).not.toThrow();
  });
});
