export const EDITOR_PREFERENCES_STORAGE_KEY = "shader-pocket.editor-preferences.v1";

export const EDITOR_THEME_IDS = [
  "pocket-night",
  "catppuccin-mocha",
  "solarized-dark",
  "solarized-light",
] as const;

export const EDITOR_FONT_IDS = ["jetbrains-mono", "ibm-plex-mono", "system-mono"] as const;

export const EDITOR_LINE_HEIGHTS = [1.4, 1.5, 1.65] as const;

export const COMPLETION_MODES = ["typing", "manual", "off"] as const;

export const CODE_PRESENTATIONS = ["focus", "overlay"] as const;

export type EditorThemeId = (typeof EDITOR_THEME_IDS)[number];
export type EditorFontId = (typeof EDITOR_FONT_IDS)[number];
export type EditorLineHeight = (typeof EDITOR_LINE_HEIGHTS)[number];
export type CompletionMode = (typeof COMPLETION_MODES)[number];
export type CodePresentation = (typeof CODE_PRESENTATIONS)[number];

export type EditorPreferences = {
  theme: EditorThemeId;
  fontFamily: EditorFontId;
  fontSize: number;
  lineHeight: EditorLineHeight;
  ligatures: boolean;
  lineWrapping: boolean;
  completionMode: CompletionMode;
  inlineDocumentation: boolean;
  phoneCodePresentation: CodePresentation;
};

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  theme: "pocket-night",
  fontFamily: "jetbrains-mono",
  fontSize: 13,
  lineHeight: 1.5,
  ligatures: false,
  lineWrapping: true,
  completionMode: "typing",
  inlineDocumentation: true,
  phoneCodePresentation: "focus",
};

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function normalizeFontSize(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_EDITOR_PREFERENCES.fontSize;
  }
  return Math.min(18, Math.max(11, Math.round(value * 2) / 2));
}

function normalizeLineHeight(value: unknown): EditorLineHeight {
  return EDITOR_LINE_HEIGHTS.includes(value as EditorLineHeight)
    ? (value as EditorLineHeight)
    : DEFAULT_EDITOR_PREFERENCES.lineHeight;
}

export function normalizeEditorPreferences(value: unknown): EditorPreferences {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    theme: isOneOf(candidate.theme, EDITOR_THEME_IDS)
      ? candidate.theme
      : DEFAULT_EDITOR_PREFERENCES.theme,
    fontFamily: isOneOf(candidate.fontFamily, EDITOR_FONT_IDS)
      ? candidate.fontFamily
      : DEFAULT_EDITOR_PREFERENCES.fontFamily,
    fontSize: normalizeFontSize(candidate.fontSize),
    lineHeight: normalizeLineHeight(candidate.lineHeight),
    ligatures:
      typeof candidate.ligatures === "boolean"
        ? candidate.ligatures
        : DEFAULT_EDITOR_PREFERENCES.ligatures,
    lineWrapping:
      typeof candidate.lineWrapping === "boolean"
        ? candidate.lineWrapping
        : DEFAULT_EDITOR_PREFERENCES.lineWrapping,
    completionMode: isOneOf(candidate.completionMode, COMPLETION_MODES)
      ? candidate.completionMode
      : DEFAULT_EDITOR_PREFERENCES.completionMode,
    inlineDocumentation:
      typeof candidate.inlineDocumentation === "boolean"
        ? candidate.inlineDocumentation
        : DEFAULT_EDITOR_PREFERENCES.inlineDocumentation,
    phoneCodePresentation: isOneOf(candidate.phoneCodePresentation, CODE_PRESENTATIONS)
      ? candidate.phoneCodePresentation
      : DEFAULT_EDITOR_PREFERENCES.phoneCodePresentation,
  };
}

export function loadEditorPreferences(storage?: PreferenceStorage): EditorPreferences {
  if (!storage) return { ...DEFAULT_EDITOR_PREFERENCES };
  try {
    const stored = storage.getItem(EDITOR_PREFERENCES_STORAGE_KEY);
    return stored
      ? normalizeEditorPreferences(JSON.parse(stored))
      : { ...DEFAULT_EDITOR_PREFERENCES };
  } catch {
    return { ...DEFAULT_EDITOR_PREFERENCES };
  }
}

export function saveEditorPreferences(
  storage: PreferenceStorage | undefined,
  preferences: EditorPreferences,
) {
  if (!storage) return false;
  try {
    storage.setItem(EDITOR_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

export const EDITOR_FONT_STACKS: Record<EditorFontId, string> = {
  "jetbrains-mono": '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
  "ibm-plex-mono": '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
  "system-mono": 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
};
