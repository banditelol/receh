import { cpp } from "@codemirror/lang-cpp";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
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
import { highlightSelectionMatches, openSearchPanel, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  hoverTooltip,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { ShaderDiagnostic } from "../renderer/diagnostics.ts";
import type { EditorPreferences } from "./editorPreferences.ts";
import { createEditorAppearance, getEditorTheme } from "./editorThemes.ts";
import { type GlslReferenceEntry, getGlslReference } from "./glslCatalog.ts";
import { findGlslReferenceAtCursor, glslCompletions } from "./glslLanguage.ts";

type ShaderEditorProps = {
  value: string;
  diagnostics: ShaderDiagnostic[];
  onChange: (value: string) => void;
  onRun: () => void;
  navigationTarget: { line: number; request: number } | null;
  preferences: EditorPreferences;
  searchRequest: number;
  onReferenceChange: (reference: GlslReferenceEntry | null) => void;
};

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

function referenceRangeAt(view: EditorView, position: number) {
  const line = view.state.doc.lineAt(position);
  const offset = position - line.from;
  const before = line.text.slice(0, offset).match(/[A-Za-z_]\w*$/)?.[0] ?? "";
  const after = line.text.slice(offset).match(/^\w*/)?.[0] ?? "";
  const name = `${before}${after}`;
  const reference = getGlslReference(name);
  return reference
    ? { reference, from: position - before.length, to: position + after.length }
    : null;
}

function createInlineDocumentationExtension(enabled: boolean): Extension {
  if (!enabled || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return [];
  return hoverTooltip((view, position) => {
    const match = referenceRangeAt(view, position);
    if (!match) return null;
    return {
      pos: match.from,
      end: match.to,
      above: true,
      create: () => {
        const dom = document.createElement("div");
        dom.className = "cm-glsl-hover";
        const name = document.createElement("strong");
        name.textContent = match.reference.name;
        const signature = document.createElement("small");
        signature.textContent = match.reference.signatures[0];
        const summary = document.createElement("div");
        summary.textContent = match.reference.summary;
        dom.append(name, document.createElement("br"), signature, summary);
        return { dom };
      },
    };
  });
}

export function ShaderEditor({
  value,
  diagnostics,
  onChange,
  onRun,
  navigationTarget,
  preferences,
  searchRequest,
  onReferenceChange,
}: ShaderEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onReferenceChangeRef = useRef(onReferenceChange);
  const preferencesRef = useRef(preferences);
  const appearanceCompartment = useRef(new Compartment());
  const wrappingCompartment = useRef(new Compartment());
  const completionCompartment = useRef(new Compartment());
  const inlineDocumentationCompartment = useRef(new Compartment());
  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onReferenceChangeRef.current = onReferenceChange;
  preferencesRef.current = preferences;
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
        inlineDocumentationCompartment.current.of(
          createInlineDocumentationExtension(preferences.inlineDocumentation),
        ),
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
          if (update.docChanged || update.selectionSet) {
            const selection = update.state.selection.main;
            const selectedText = update.state.doc.sliceString(selection.from, selection.to);
            onReferenceChangeRef.current(
              preferencesRef.current.inlineDocumentation
                ? (findGlslReferenceAtCursor(
                    update.state.doc.toString(),
                    selection.head,
                    selectedText,
                  ) ?? null)
                : null,
            );
          }
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
        inlineDocumentationCompartment.current.reconfigure(
          createInlineDocumentationExtension(preferences.inlineDocumentation),
        ),
      ],
    });
    if (!preferences.inlineDocumentation) onReferenceChangeRef.current(null);
  }, [preferences]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || searchRequest === 0) return;
    openSearchPanel(view);
  }, [searchRequest]);

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
