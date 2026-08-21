import { cpp } from "@codemirror/lang-cpp";
import { autocompletion, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import { setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import type { ShaderDiagnostic } from "../renderer/diagnostics.ts";

type ShaderEditorProps = {
  value: string;
  diagnostics: ShaderDiagnostic[];
  onChange: (value: string) => void;
  onRun: () => void;
  navigationTarget: { line: number; request: number } | null;
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

const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      color: "#e6e4df",
      backgroundColor: "#0d0d10",
      fontSize: "14px",
    },
    ".cm-content": {
      padding: "18px 0 90px",
      caretColor: "#ff7340",
      fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
      lineHeight: "1.65",
    },
    ".cm-scroller": { overflow: "auto" },
    ".cm-gutters": {
      backgroundColor: "#0d0d10",
      color: "#55545c",
      border: "none",
      paddingLeft: "6px",
    },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#17161b" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "#633c7a80",
    },
    ".cm-cursor": { borderLeftColor: "#ff7340", borderLeftWidth: "2px" },
    ".cm-tooltip": {
      backgroundColor: "#1b1a20",
      border: "1px solid #33313b",
      color: "#f2f0eb",
    },
    ".cm-diagnostic-error": { borderLeftColor: "#ff5e57" },
  },
  { dark: true },
);

export function ShaderEditor({
  value,
  diagnostics,
  onChange,
  onRun,
  navigationTarget,
}: ShaderEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        cpp(),
        autocompletion({ override: [glslCompletions], activateOnTyping: true }),
        editorTheme,
        EditorView.lineWrapping,
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

  return <div ref={hostRef} className="editor-host" />;
}
