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
import { Compartment, EditorState, RangeSet, type Extension } from "@codemirror/state";
import {
  Decoration,
  drawSelection,
  dropCursor,
  EditorView,
  GutterMarker,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  hoverTooltip,
  keymap,
  lineNumberMarkers,
  lineNumbers,
  WidgetType,
} from "@codemirror/view";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { ShaderDiagnostic } from "../renderer/diagnostics.ts";
import { getDiagnosticLines } from "./diagnosticDisclosure.ts";
import { getDiagnosticScrollMargin } from "./diagnosticNavigation.ts";
import type { EditorPreferences } from "./editorPreferences.ts";
import { createEditorAppearance, getEditorTheme } from "./editorThemes.ts";
import { type GlslReferenceEntry, getGlslReference } from "./glslCatalog.ts";
import {
  createGlslCompletions,
  findGlslReferenceAtCursor,
  findGlslSymbolAtCursor,
} from "./glslLanguage.ts";

type ShaderEditorProps = {
  value: string;
  additionalSource: string;
  diagnostics: ShaderDiagnostic[];
  onChange: (value: string) => void;
  onRun: () => void;
  navigationTarget: { line: number; request: number } | null;
  preferences: EditorPreferences;
  searchRequest: number;
  onReferenceChange: (reference: GlslReferenceEntry | null) => void;
  onSymbolChange: (name: string | null) => void;
  expandedDiagnosticLine: number | null;
  onDiagnosticLineClick: (line: number) => void;
  onNavigateDiagnostic: (direction: -1 | 1) => void;
  onCloseDiagnostic: () => void;
};

const editorCore: Extension = [
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

class ErrorLineNumberMarker extends GutterMarker {
  elementClass = "cm-errorLineNumber";
}

const errorLineNumberMarker = new ErrorLineNumberMarker();

class InlineDiagnosticWidget extends WidgetType {
  readonly line: number;
  readonly messages: readonly string[];
  readonly position: number;
  readonly total: number;
  readonly onNavigate: (direction: -1 | 1) => void;
  readonly onClose: () => void;

  constructor(
    line: number,
    messages: readonly string[],
    position: number,
    total: number,
    onNavigate: (direction: -1 | 1) => void,
    onClose: () => void,
  ) {
    super();
    this.line = line;
    this.messages = messages;
    this.position = position;
    this.total = total;
    this.onNavigate = onNavigate;
    this.onClose = onClose;
  }

  eq(other: InlineDiagnosticWidget) {
    return (
      this.line === other.line &&
      this.position === other.position &&
      this.total === other.total &&
      this.messages.length === other.messages.length &&
      this.messages.every((message, index) => message === other.messages[index])
    );
  }

  toDOM() {
    const section = document.createElement("section");
    section.className = "cm-inline-diagnostics";
    section.setAttribute("role", "status");

    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = `Line ${this.line}`;
    const count = document.createElement("span");
    count.className = "cm-inline-diagnostics-count";
    count.textContent = `${this.position + 1} of ${this.total} · ${this.messages.length} ${
      this.messages.length === 1 ? "error" : "errors"
    }`;
    const navigation = document.createElement("span");
    navigation.className = "cm-inline-diagnostics-navigation";
    navigation.setAttribute("role", "group");
    navigation.setAttribute("aria-label", "Shader error navigation");
    const previous = document.createElement("button");
    previous.type = "button";
    previous.disabled = this.total < 2;
    previous.setAttribute("aria-label", "Show previous shader error");
    previous.setAttribute("aria-keyshortcuts", "Shift+F8");
    previous.title = "Previous error (Shift+F8)";
    previous.textContent = "‹";
    previous.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onNavigate(-1);
    });
    const next = document.createElement("button");
    next.type = "button";
    next.disabled = this.total < 2;
    next.setAttribute("aria-label", "Show next shader error");
    next.setAttribute("aria-keyshortcuts", "F8");
    next.title = "Next error (F8)";
    next.textContent = "›";
    next.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onNavigate(1);
    });
    navigation.append(previous, next);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "cm-inline-diagnostics-close";
    close.setAttribute("aria-label", `Hide errors for line ${this.line}`);
    close.textContent = "×";
    close.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onClose();
    });
    header.append(title, count, navigation, close);

    const list = document.createElement("div");
    list.className = "cm-inline-diagnostics-list";
    for (const message of this.messages) {
      const item = document.createElement("p");
      item.textContent = message;
      list.append(item);
    }

    section.append(header, list);
    return section;
  }
}

function createDiagnosticLineMarkers(
  view: EditorView,
  diagnostics: readonly ShaderDiagnostic[],
): Extension {
  const lines = [...new Set(diagnostics.map((diagnostic) => diagnostic.line))].sort(
    (left, right) => left - right,
  );
  const markers = lines.map((lineNumber) => {
    const safeLine = Math.min(Math.max(lineNumber, 1), view.state.doc.lines);
    return errorLineNumberMarker.range(view.state.doc.line(safeLine).from);
  });
  return lineNumberMarkers.of(RangeSet.of(markers, true));
}

function createInlineDiagnostic(
  view: EditorView,
  lineNumber: number | null,
  diagnostics: readonly ShaderDiagnostic[],
  onNavigate: (direction: -1 | 1) => void,
  onClose: () => void,
): Extension {
  if (lineNumber === null) return [];
  const messages = diagnostics
    .filter((diagnostic) => diagnostic.line === lineNumber)
    .map((diagnostic) => diagnostic.message);
  if (messages.length === 0) return [];

  const safeLine = Math.min(Math.max(lineNumber, 1), view.state.doc.lines);
  const line = view.state.doc.line(safeLine);
  const diagnosticLines = getDiagnosticLines(diagnostics);
  const position = Math.max(0, diagnosticLines.indexOf(lineNumber));
  const decorations = Decoration.set([
    Decoration.widget({
      widget: new InlineDiagnosticWidget(
        lineNumber,
        messages,
        position,
        diagnosticLines.length,
        onNavigate,
        onClose,
      ),
      block: true,
      side: 1,
    }).range(line.to),
  ]);
  return EditorView.decorations.of(decorations);
}

function createCompletionExtension(
  preferences: EditorPreferences,
  additionalSource: string,
): Extension {
  if (preferences.completionMode === "off") return [];
  return autocompletion({
    override: [createGlslCompletions(additionalSource)],
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
  additionalSource,
  diagnostics,
  onChange,
  onRun,
  navigationTarget,
  preferences,
  searchRequest,
  onReferenceChange,
  onSymbolChange,
  expandedDiagnosticLine,
  onDiagnosticLineClick,
  onNavigateDiagnostic,
  onCloseDiagnostic,
}: ShaderEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onReferenceChangeRef = useRef(onReferenceChange);
  const onSymbolChangeRef = useRef(onSymbolChange);
  const onDiagnosticLineClickRef = useRef(onDiagnosticLineClick);
  const onNavigateDiagnosticRef = useRef(onNavigateDiagnostic);
  const onCloseDiagnosticRef = useRef(onCloseDiagnostic);
  const diagnosticsRef = useRef(diagnostics);
  const preferencesRef = useRef(preferences);
  const appearanceCompartment = useRef(new Compartment());
  const wrappingCompartment = useRef(new Compartment());
  const completionCompartment = useRef(new Compartment());
  const inlineDocumentationCompartment = useRef(new Compartment());
  const diagnosticLineMarkersCompartment = useRef(new Compartment());
  const inlineDiagnosticCompartment = useRef(new Compartment());
  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onReferenceChangeRef.current = onReferenceChange;
  onSymbolChangeRef.current = onSymbolChange;
  onDiagnosticLineClickRef.current = onDiagnosticLineClick;
  onNavigateDiagnosticRef.current = onNavigateDiagnostic;
  onCloseDiagnosticRef.current = onCloseDiagnostic;
  diagnosticsRef.current = diagnostics;
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
        lineNumbers({
          domEventHandlers: {
            click: (view, line, event) => {
              const lineNumber = view.state.doc.lineAt(line.from).number;
              if (!diagnosticsRef.current.some((diagnostic) => diagnostic.line === lineNumber)) {
                return false;
              }
              event.preventDefault();
              onDiagnosticLineClickRef.current(lineNumber);
              return true;
            },
          },
        }),
        cpp(),
        appearanceCompartment.current.of(createEditorAppearance(preferences)),
        wrappingCompartment.current.of(preferences.lineWrapping ? EditorView.lineWrapping : []),
        completionCompartment.current.of(createCompletionExtension(preferences, additionalSource)),
        inlineDocumentationCompartment.current.of(
          createInlineDocumentationExtension(preferences.inlineDocumentation),
        ),
        diagnosticLineMarkersCompartment.current.of([]),
        inlineDiagnosticCompartment.current.of([]),
        EditorView.contentAttributes.of({
          "aria-label": "GLSL shader code editor",
          autocapitalize: "off",
          autocomplete: "off",
          autocorrect: "off",
          spellcheck: "false",
          "aria-keyshortcuts": "F8 Shift+F8",
        }),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRunRef.current();
              return true;
            },
          },
          {
            key: "F8",
            run: () => {
              if (diagnosticsRef.current.length === 0) return false;
              onNavigateDiagnosticRef.current(1);
              return true;
            },
          },
          {
            key: "Shift-F8",
            run: () => {
              if (diagnosticsRef.current.length === 0) return false;
              onNavigateDiagnosticRef.current(-1);
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
            onSymbolChangeRef.current(
              findGlslSymbolAtCursor(update.state.doc.toString(), selection.head, selectedText),
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
        completionCompartment.current.reconfigure(
          createCompletionExtension(preferences, additionalSource),
        ),
        inlineDocumentationCompartment.current.reconfigure(
          createInlineDocumentationExtension(preferences.inlineDocumentation),
        ),
      ],
    });
    if (!preferences.inlineDocumentation) onReferenceChangeRef.current(null);
  }, [additionalSource, preferences]);

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
    view.dispatch({
      effects: diagnosticLineMarkersCompartment.current.reconfigure(
        createDiagnosticLineMarkers(view, diagnostics),
      ),
    });
  }, [diagnostics, value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: inlineDiagnosticCompartment.current.reconfigure(
        createInlineDiagnostic(
          view,
          expandedDiagnosticLine,
          diagnostics,
          (direction) => onNavigateDiagnosticRef.current(direction),
          () => onCloseDiagnosticRef.current(),
        ),
      ),
    });
  }, [diagnostics, expandedDiagnosticLine, value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !navigationTarget) return;

    const safeLine = Math.min(Math.max(navigationTarget.line, 1), view.state.doc.lines);
    const line = view.state.doc.line(safeLine);
    const yMargin = getDiagnosticScrollMargin(view.defaultLineHeight, view.scrollDOM.clientHeight);
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "start", yMargin }),
    });
    view.focus();
  }, [navigationTarget]);

  return <div ref={hostRef} className="editor-host" style={hostStyle} />;
}
