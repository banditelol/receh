import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import {
  EDITOR_FONT_STACKS,
  type EditorPreferences,
  type EditorThemeId,
} from "./editorPreferences.ts";

export type EditorPalette = {
  background: string;
  backgroundOverlay: string;
  raised: string;
  activeLine: string;
  selection: string;
  foreground: string;
  muted: string;
  gutter: string;
  border: string;
  accent: string;
  keyword: string;
  type: string;
  function: string;
  variable: string;
  number: string;
  string: string;
  comment: string;
  operator: string;
  invalid: string;
};

export type EditorThemeDefinition = {
  id: EditorThemeId;
  label: string;
  mode: "dark" | "light";
  palette: EditorPalette;
};

export const EDITOR_THEMES: readonly EditorThemeDefinition[] = [
  {
    id: "pocket-night",
    label: "Pocket Night",
    mode: "dark",
    palette: {
      background: "#071317",
      backgroundOverlay: "rgb(7 19 23 / 88%)",
      raised: "#10252c",
      activeLine: "#0d2026",
      selection: "#146f8580",
      foreground: "#eefafa",
      muted: "#9bb2b7",
      gutter: "#829da3",
      border: "#284049",
      accent: "#38d4df",
      keyword: "#67e8ed",
      type: "#80e4c7",
      function: "#82a8ff",
      variable: "#e8e4de",
      number: "#f3c36b",
      string: "#b6d878",
      comment: "#918e98",
      operator: "#d7d2dc",
      invalid: "#ff6861",
    },
  },
  {
    id: "catppuccin-mocha",
    label: "Catppuccin Mocha",
    mode: "dark",
    palette: {
      background: "#1e1e2e",
      backgroundOverlay: "rgb(30 30 46 / 88%)",
      raised: "#313244",
      activeLine: "#262637",
      selection: "#585b7080",
      foreground: "#cdd6f4",
      muted: "#a6adc8",
      gutter: "#9399b2",
      border: "#45475a",
      accent: "#f38ba8",
      keyword: "#cba6f7",
      type: "#89dceb",
      function: "#89b4fa",
      variable: "#cdd6f4",
      number: "#fab387",
      string: "#a6e3a1",
      comment: "#9399b2",
      operator: "#89dceb",
      invalid: "#f38ba8",
    },
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    mode: "dark",
    palette: {
      background: "#002b36",
      backgroundOverlay: "rgb(0 43 54 / 90%)",
      raised: "#073642",
      activeLine: "#073642",
      selection: "#586e7580",
      foreground: "#93a1a1",
      muted: "#839496",
      gutter: "#839496",
      border: "#31505a",
      accent: "#cb4b16",
      keyword: "#859900",
      type: "#2aa198",
      function: "#268bd2",
      variable: "#93a1a1",
      number: "#d33682",
      string: "#b58900",
      comment: "#839496",
      operator: "#6c71c4",
      invalid: "#dc322f",
    },
  },
  {
    id: "solarized-light",
    label: "Solarized Light",
    mode: "light",
    palette: {
      background: "#fdf6e3",
      backgroundOverlay: "rgb(253 246 227 / 92%)",
      raised: "#eee8d5",
      activeLine: "#eee8d5",
      selection: "#93a1a180",
      foreground: "#586e75",
      muted: "#657b83",
      gutter: "#657b83",
      border: "#d5cfbd",
      accent: "#cb4b16",
      keyword: "#859900",
      type: "#2aa198",
      function: "#268bd2",
      variable: "#586e75",
      number: "#d33682",
      string: "#b58900",
      comment: "#657b83",
      operator: "#6c71c4",
      invalid: "#dc322f",
    },
  },
];

export function getEditorTheme(themeId: EditorThemeId) {
  return EDITOR_THEMES.find((theme) => theme.id === themeId) ?? EDITOR_THEMES[0];
}

export function createEditorAppearance(preferences: EditorPreferences) {
  const theme = getEditorTheme(preferences.theme);
  const { palette } = theme;
  const viewTheme = EditorView.theme(
    {
      "&": {
        height: "100%",
        color: palette.foreground,
        backgroundColor: `var(--sp-editor-background, ${palette.background})`,
        fontSize: `${preferences.fontSize}px`,
      },
      ".cm-content": {
        padding: "14px 0 90px",
        caretColor: palette.accent,
        fontFamily: EDITOR_FONT_STACKS[preferences.fontFamily],
        fontFeatureSettings: preferences.ligatures ? '"calt" 1, "liga" 1' : '"calt" 0, "liga" 0',
        lineHeight: String(preferences.lineHeight),
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: EDITOR_FONT_STACKS[preferences.fontFamily],
      },
      ".cm-gutters": {
        backgroundColor: `var(--sp-editor-background, ${palette.background})`,
        color: palette.gutter,
        border: "none",
        paddingLeft: "4px",
      },
      ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: palette.activeLine },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
        backgroundColor: palette.selection,
      },
      ".cm-cursor": { borderLeftColor: palette.accent, borderLeftWidth: "2px" },
      ".cm-tooltip": {
        color: palette.foreground,
        backgroundColor: palette.raised,
        border: `1px solid ${palette.border}`,
      },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        color: palette.foreground,
        backgroundColor: palette.activeLine,
      },
      ".cm-completionDetail": { color: palette.muted },
      ".cm-panels": {
        color: palette.foreground,
        backgroundColor: palette.raised,
      },
      ".cm-panel.cm-search": {
        padding: "8px",
      },
      ".cm-panel.cm-search input": {
        minHeight: "36px",
        color: palette.foreground,
        backgroundColor: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: "6px",
      },
      ".cm-panel.cm-search button": {
        minWidth: "36px",
        minHeight: "36px",
        color: palette.foreground,
        backgroundColor: palette.activeLine,
        border: `1px solid ${palette.border}`,
        borderRadius: "6px",
      },
      ".cm-diagnostic-error": { borderLeftColor: palette.invalid },
      ".cm-matchingBracket": {
        color: palette.foreground,
        backgroundColor: palette.selection,
        outline: `1px solid ${palette.accent}`,
      },
      ".cm-glsl-hover": {
        maxWidth: "320px",
        padding: "9px 11px",
        fontFamily: EDITOR_FONT_STACKS[preferences.fontFamily],
        fontSize: "11px",
        lineHeight: "1.45",
      },
      ".cm-glsl-hover strong": { color: palette.accent },
      ".cm-glsl-hover small": { color: palette.muted },
    },
    { dark: theme.mode === "dark" },
  );

  const highlightStyle = HighlightStyle.define([
    { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: palette.keyword },
    { tag: [tags.typeName, tags.className, tags.bool], color: palette.type },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      color: palette.function,
    },
    { tag: [tags.variableName, tags.propertyName], color: palette.variable },
    { tag: [tags.number, tags.integer, tags.float], color: palette.number },
    { tag: [tags.string, tags.special(tags.string)], color: palette.string },
    {
      tag: [tags.lineComment, tags.blockComment, tags.docComment],
      color: palette.comment,
      fontStyle: "italic",
    },
    { tag: [tags.operator, tags.punctuation], color: palette.operator },
    { tag: tags.meta, color: palette.muted },
    { tag: tags.invalid, color: palette.invalid, textDecoration: "underline wavy" },
  ]);

  return [viewTheme, syntaxHighlighting(highlightStyle)];
}
