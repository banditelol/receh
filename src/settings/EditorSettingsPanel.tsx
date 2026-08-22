import { useEffect, useState } from "react";
import {
  DEFAULT_EDITOR_PREFERENCES,
  EDITOR_FONT_STACKS,
  type EditorFontId,
  type EditorLineHeight,
  type EditorPreferences,
  type EditorThemeId,
} from "../editor/editorPreferences.ts";
import { EDITOR_THEMES, getEditorTheme } from "../editor/editorThemes.ts";
import type { usePwa } from "../pwa/usePwa.ts";

type PwaState = ReturnType<typeof usePwa>;

type EditorSettingsPanelProps = {
  preferences: EditorPreferences;
  pwa: PwaState;
  onChange: (patch: Partial<EditorPreferences>) => void;
  onClose: () => void;
};

const FONT_OPTIONS: readonly { id: EditorFontId; label: string }[] = [
  { id: "jetbrains-mono", label: "JetBrains Mono" },
  { id: "ibm-plex-mono", label: "IBM Plex Mono" },
  { id: "system-mono", label: "System monospace" },
];

const LINE_HEIGHT_OPTIONS: readonly { value: EditorLineHeight; label: string }[] = [
  { value: 1.4, label: "Compact" },
  { value: 1.5, label: "Standard" },
  { value: 1.65, label: "Relaxed" },
];

export function EditorSettingsPanel({
  preferences,
  pwa,
  onChange,
  onClose,
}: EditorSettingsPanelProps) {
  const theme = getEditorTheme(preferences.theme);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const installApp = async () => {
    setInstalling(true);
    try {
      await pwa.install();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-heading">
          <div>
            <span className="eyebrow">Config</span>
            <h2 id="settings-title">Editor</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close editor settings</span>
          </button>
        </div>

        <p className="settings-intro">
          These preferences stay on this device and do not travel inside project or SQLite backups.
        </p>

        <section className="settings-install" aria-labelledby="settings-install-title">
          <span className="settings-install-mark" aria-hidden="true">
            ƒ
          </span>
          <span className="settings-install-copy">
            <strong id="settings-install-title">
              {pwa.installed ? "Receh is installed" : "Install receh as an app"}
            </strong>
            <small>
              {pwa.installed
                ? "This device is already using the standalone app."
                : pwa.manualIosInstall
                  ? "Open Share and choose Add to Home Screen. These steps stay available here."
                  : pwa.canInstall
                    ? "Open faster and keep editing offline. This option stays here after you dismiss the startup reminder."
                    : "Use your browser menu’s Install app or Add to Home Screen action. This reminder stays available here."}
            </small>
          </span>
          {pwa.canInstall ? (
            <button
              className="settings-install-button"
              type="button"
              disabled={installing}
              onClick={() => void installApp()}
            >
              {installing ? "Opening…" : "Install app"}
            </button>
          ) : (
            <span className="settings-install-state">
              {pwa.installed ? "Installed" : pwa.manualIosInstall ? "Share menu" : "Browser menu"}
            </span>
          )}
        </section>

        <div
          className="editor-setting-preview"
          style={{
            color: theme.palette.foreground,
            background: theme.palette.background,
            borderColor: theme.palette.border,
            fontFamily: EDITOR_FONT_STACKS[preferences.fontFamily],
            fontSize: `${preferences.fontSize}px`,
            lineHeight: preferences.lineHeight,
            fontFeatureSettings: preferences.ligatures
              ? '"calt" 1, "liga" 1'
              : '"calt" 0, "liga" 0',
          }}
          aria-label="Editor appearance preview"
        >
          <span style={{ color: theme.palette.type }}>vec3</span>
          <span>&nbsp;color&nbsp;=&nbsp;</span>
          <span style={{ color: theme.palette.function }}>mix</span>(warm, cool, 0.5);
        </div>

        <div className="settings-grid">
          <label className="settings-field">
            <span>Color scheme</span>
            <select
              value={preferences.theme}
              onChange={(event) => onChange({ theme: event.target.value as EditorThemeId })}
            >
              {EDITOR_THEMES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Font</span>
            <select
              value={preferences.fontFamily}
              onChange={(event) => onChange({ fontFamily: event.target.value as EditorFontId })}
            >
              {FONT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field settings-field--range">
            <span>
              Font size <strong>{preferences.fontSize}px</strong>
            </span>
            <input
              type="range"
              min="11"
              max="18"
              step="0.5"
              value={preferences.fontSize}
              onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
            />
          </label>

          <label className="settings-field">
            <span>Line spacing</span>
            <select
              value={preferences.lineHeight}
              onChange={(event) =>
                onChange({ lineHeight: Number(event.target.value) as EditorLineHeight })
              }
            >
              {LINE_HEIGHT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {option.value}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Phone Code view</span>
            <select
              value={preferences.phoneCodePresentation}
              onChange={(event) =>
                onChange({
                  phoneCodePresentation: event.target.value === "overlay" ? "overlay" : "focus",
                })
              }
            >
              <option value="focus">Focus</option>
              <option value="overlay">Overlay preview</option>
            </select>
          </label>

          <label className="settings-field">
            <span>Suggestions</span>
            <select
              value={preferences.completionMode}
              onChange={(event) => {
                const mode = event.target.value;
                onChange({ completionMode: mode === "off" || mode === "manual" ? mode : "typing" });
              }}
            >
              <option value="typing">While typing</option>
              <option value="manual">Manual only</option>
              <option value="off">Off</option>
            </select>
          </label>
        </div>

        <div className="settings-toggles">
          <label>
            <input
              type="checkbox"
              checked={preferences.lineWrapping}
              onChange={(event) => onChange({ lineWrapping: event.target.checked })}
            />
            <span>Wrap long lines</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.ligatures}
              onChange={(event) => onChange({ ligatures: event.target.checked })}
            />
            <span>Font ligatures</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.inlineDocumentation}
              onChange={(event) => onChange({ inlineDocumentation: event.target.checked })}
            />
            <span>Function help at the cursor</span>
          </label>
        </div>

        <div className="settings-footer">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onChange(DEFAULT_EDITOR_PREFERENCES)}
          >
            Restore defaults
          </button>
          <button className="run-button" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
