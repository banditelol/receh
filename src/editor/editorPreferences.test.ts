import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_EDITOR_PREFERENCES,
  EDITOR_PREFERENCES_STORAGE_KEY,
  loadEditorPreferences,
  normalizeEditorPreferences,
  saveEditorPreferences,
} from "./editorPreferences.ts";

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(EDITOR_PREFERENCES_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("editor preferences", () => {
  it("uses compact legible defaults", () => {
    expect(loadEditorPreferences()).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(DEFAULT_EDITOR_PREFERENCES.fontSize).toBe(13);
    expect(DEFAULT_EDITOR_PREFERENCES.lineHeight).toBe(1.5);
  });

  it("repairs unsupported and out-of-range values", () => {
    expect(
      normalizeEditorPreferences({
        theme: "unknown",
        fontFamily: "missing",
        fontSize: 40,
        lineHeight: 1.2,
        ligatures: true,
        phoneCodePresentation: "overlay",
      }),
    ).toMatchObject({
      theme: "pocket-night",
      fontFamily: "jetbrains-mono",
      fontSize: 18,
      lineHeight: 1.5,
      ligatures: true,
      phoneCodePresentation: "overlay",
    });
  });

  it("round-trips persisted settings and survives invalid JSON", () => {
    const storage = createStorage();
    const preferences = { ...DEFAULT_EDITOR_PREFERENCES, theme: "solarized-light" as const };
    expect(saveEditorPreferences(storage, preferences)).toBe(true);
    expect(loadEditorPreferences(storage)).toEqual(preferences);
    expect(loadEditorPreferences(createStorage("not-json"))).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("keeps the floating phone preview preference", () => {
    expect(normalizeEditorPreferences({ phoneCodePresentation: "floating" })).toMatchObject({
      phoneCodePresentation: "floating",
    });
  });
});
