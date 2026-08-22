import { cpp } from "@codemirror/lang-cpp";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type Completion,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { ShaderDiagnostic } from "../renderer/diagnostics.ts";
import type { EditorPreferences } from "./editorPreferences.ts";
import { createEditorAppearance, getEditorTheme } from "./editorThemes.ts";

type ShaderEditorProps = {
  value: string;
  diagnostics: ShaderDiagnostic[];
  onChange: (value: string) => void;
  onRun: () => void;
  navigationTarget: { line: number; request: number } | null;
  preferences: EditorPreferences;
};

const GLSL_COMPLETIONS: Completion[] = [
  { label: "u_resolution", type: "variable", detail: "vec2 · viewport size" },
  { label: "u_time", type: "variable", detail: "float · elapsed seconds" },
  { label: "u_time_delta", type: "variable", detail: "float · frame delta" },
  { label: "u_frame", type: "variable", detail: "int · frame number" },
  { label: "u_mouse", type: "variable", detail: "vec2 · pointer position" },
  { label: "u_drag", type: "variable", detail: "vec2 · pointer drag delta" },
  { label: "u_scroll", type: "variable", detail: "float · wheel delta" },
  { label: "gl_FragCoord", type: "variable", detail: "vec4 · fragment coordinates" },
  { label: "float", type: "type" },
  { label: "int", type: "type" },
  { label: "bool", type: "type" },
  { label: "vec2", type: "type" },
  { label: "vec3", type: "type" },
  { label: "vec4", type: "type" },
  { label: "mat2", type: "type" },
  { label: "mat3", type: "type" },
  { label: "mat4", type: "type" },
  { label: "uniform", type: "keyword" },
  { label: "precision", type: "keyword" },
  { label: "highp", type: "keyword" },
  { label: "in", type: "keyword" },
  { label: "out", type: "keyword" },
  { label: "return", type: "keyword" },
  { label: "if", type: "keyword" },
  { label: "else", type: "keyword" },
  { label: "for", type: "keyword" },
  { label: "sin", type: "function" },
  { label: "cos", type: "function" },
  { label: "tan", type: "function" },
  { label: "atan", type: "function" },
  { label: "pow", type: "function" },
  { label: "exp", type: "function" },
  { label: "sqrt", type: "function" },
  { label: "abs", type: "function" },
  { label: "min", type: "function" },
  { label: "max", type: "function" },
  { label: "clamp", type: "function" },
  { label: "mix", type: "function" },
  { label: "step", type: "function" },
  { label: "smoothstep", type: "function" },
  { label: "length", type: "function" },
  { label: "distance", type: "function" },
  { label: "dot", type: "function" },
  { label: "normalize", type: "function" },
];

function glslCompletions(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z_]\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return { from: word.from, options: GLSL_COMPLETIONS, validFor: /^\w*$/ };
}

const editorCore: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
  ]),
];

function createCompletionExtension(preferences: EditorPreferences): Extension {
  if (preferences.completionMode === "off") return [];
  return autocompletion({
    override: [glslCompletions],
    activateOnTyping: preferences.completionMode === "typing",
  });
}

export function ShaderEditor({
  value,
  diagnostics,
  onChange,
  onRun,
  navigationTarget,
  preferences,
}: ShaderEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const appearanceCompartment = useRef(new Compartment());
  const wrappingCompartment = useRef(new Compartment());
  const completionCompartment = useRef(new Compartment());
  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  const palette = getEditorTheme(preferences.theme).palette;
  const hostStyle = useMemo(
    () =>
      ({
        "--sp-editor-base-background": palette.background,
        "--sp-editor-overlay-background": palette.backgroundOverlay,
      }) as CSSProperties,
    [palette.background, palette.backgroundOverlay],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        editorCore,
        cpp(),
        appearanceCompartment.current.of(createEditorAppearance(preferences)),
        wrappingCompartment.current.of(preferences.lineWrapping ? EditorView.lineWrapping : []),
        completionCompartment.current.of(createCompletionExtension(preferences)),
        EditorView.contentAttributes.of({
          "aria-label": "GLSL shader code editor",
          autocapitalize: "off",
          autocomplete: "off",
          autocorrect: "off",
          spellcheck: "false",
        }),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRunRef.current();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        appearanceCompartment.current.reconfigure(createEditorAppearance(preferences)),
        wrappingCompartment.current.reconfigure(
          preferences.lineWrapping ? EditorView.lineWrapping : [],
        ),
        completionCompartment.current.reconfigure(createCompletionExtension(preferences)),
      ],
    });
  }, [preferences]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const mapped: Diagnostic[] = diagnostics.map((diagnostic) => {
      const safeLine = Math.min(Math.max(diagnostic.line, 1), view.state.doc.lines);
      const line = view.state.doc.line(safeLine);
      return {
        from: line.from,
        to: Math.max(line.from, line.to),
        severity: "error",
        message: diagnostic.message,
      };
    });
    view.dispatch(setDiagnostics(view.state, mapped));
  }, [diagnostics]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !navigationTarget) return;

    const safeLine = Math.min(Math.max(navigationTarget.line, 1), view.state.doc.lines);
    const line = view.state.doc.line(safeLine);
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    view.focus();
  }, [navigationTarget]);

  return <div ref={hostRef} className="editor-host" style={hostStyle} />;
}
