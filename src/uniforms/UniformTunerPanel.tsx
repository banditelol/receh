import { useEffect, useState } from "react";
import { RgbColorPicker, RgbaColorPicker } from "react-colorful";
import { clamp, formatHexColor, hslToRgb, parseHexColor, rgbToHsl } from "./color.ts";
import { resolveUniformValue, UNIFORM_COMPONENT_LABELS } from "./uniformParser.ts";
import type {
  ShaderUniformValue,
  ShaderUniformValues,
  TunableUniformDefinition,
} from "./uniformTypes.ts";

type UniformTunerPanelProps = {
  definitions: TunableUniformDefinition[];
  values: ShaderUniformValues;
  onChange: (name: string, value: ShaderUniformValue) => void;
  onReset: () => void;
  onBake: () => Promise<void>;
  onOpenGuide: () => void;
  onClose: () => void;
};

type UniformControlProps = {
  definition: TunableUniformDefinition;
  value: ShaderUniformValue;
  onChange: (value: ShaderUniformValue) => void;
};

function NumberControl({ definition, value, onChange }: UniformControlProps) {
  const number = typeof value === "number" ? value : 0;
  const { min, max, step } = definition.range;
  const update = (next: number) => {
    if (!Number.isFinite(next)) return;
    onChange(definition.type === "int" ? Math.round(next) : next);
  };
  return (
    <div className="uniform-number-control">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(number, min, max)}
        onChange={(event) => update(Number(event.target.value))}
        aria-label={`${definition.label} slider`}
      />
      <input
        className="uniform-number-input"
        type="number"
        inputMode="decimal"
        step={step}
        value={number}
        onChange={(event) => update(Number(event.target.value))}
        aria-label={`${definition.label} value`}
      />
    </div>
  );
}

function VectorControl({ definition, value, onChange }: UniformControlProps) {
  const values = Array.isArray(value) ? value : [];
  const booleanVector = definition.type.startsWith("bvec");
  if (booleanVector) {
    return (
      <div className="uniform-boolean-vector">
        {Array.from({ length: definition.components }, (_, index) => (
          <label key={UNIFORM_COMPONENT_LABELS[index]}>
            <input
              type="checkbox"
              checked={Boolean(values[index])}
              onChange={(event) => {
                const next = Array.from({ length: definition.components }, (_, componentIndex) =>
                  Boolean(values[componentIndex]),
                );
                next[index] = event.target.checked;
                onChange(next);
              }}
            />
            <span>{UNIFORM_COMPONENT_LABELS[index]}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="uniform-vector-control">
      {Array.from({ length: definition.components }, (_, index) => {
        const component = Number(values[index] ?? 0);
        return (
          <label key={UNIFORM_COMPONENT_LABELS[index]}>
            <span>{UNIFORM_COMPONENT_LABELS[index]}</span>
            <input
              type="range"
              min={definition.range.min}
              max={definition.range.max}
              step={definition.range.step}
              value={clamp(component, definition.range.min, definition.range.max)}
              onChange={(event) => {
                const next = Array.from({ length: definition.components }, (_, componentIndex) =>
                  Number(values[componentIndex] ?? 0),
                );
                const parsed = Number(event.target.value);
                next[index] = definition.type.startsWith("ivec") ? Math.round(parsed) : parsed;
                onChange(next);
              }}
              aria-label={`${definition.label} ${UNIFORM_COMPONENT_LABELS[index]} slider`}
            />
            <input
              className="uniform-number-input"
              type="number"
              inputMode="decimal"
              step={definition.range.step}
              value={component}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (!Number.isFinite(parsed)) return;
                const next = Array.from({ length: definition.components }, (_, componentIndex) =>
                  Number(values[componentIndex] ?? 0),
                );
                next[index] = definition.type.startsWith("ivec") ? Math.round(parsed) : parsed;
                onChange(next);
              }}
              aria-label={`${definition.label} ${UNIFORM_COMPONENT_LABELS[index]} value`}
            />
          </label>
        );
      })}
    </div>
  );
}

function ColorControl({ definition, value, onChange }: UniformControlProps) {
  const [mode, setMode] = useState<"rgb" | "hsl">("rgb");
  const components = Array.isArray(value) ? value.map(Number) : [1, 1, 1];
  const rgba = [
    clamp(components[0] ?? 0, 0, 1),
    clamp(components[1] ?? 0, 0, 1),
    clamp(components[2] ?? 0, 0, 1),
    clamp(components[3] ?? 1, 0, 1),
  ] as const;
  const includeAlpha = definition.components === 4;
  const formattedHex = formatHexColor(rgba, includeAlpha);
  const rgbColor = {
    r: Math.round(rgba[0] * 255),
    g: Math.round(rgba[1] * 255),
    b: Math.round(rgba[2] * 255),
  };
  const [hex, setHex] = useState(formattedHex);

  useEffect(() => setHex(formattedHex), [formattedHex]);

  const updateRgba = (next: readonly number[]) => {
    onChange(Array.from({ length: definition.components }, (_, index) => next[index] ?? 1));
  };
  const applyHex = (nextHex: string) => {
    setHex(nextHex);
    const parsed = parseHexColor(nextHex);
    if (!parsed) return;
    const rawLength = nextHex.trim().replace(/^#/, "").length;
    if (includeAlpha && rawLength !== 4 && rawLength !== 8) parsed[3] = rgba[3];
    updateRgba(parsed);
  };
  const hsl = rgbToHsl(rgba);

  return (
    <div className="uniform-color-control">
      <div className="uniform-visual-picker">
        {includeAlpha ? (
          <RgbaColorPicker
            color={{ ...rgbColor, a: rgba[3] }}
            onChange={(next) => updateRgba([next.r / 255, next.g / 255, next.b / 255, next.a])}
          />
        ) : (
          <RgbColorPicker
            color={rgbColor}
            onChange={(next) => updateRgba([next.r / 255, next.g / 255, next.b / 255])}
          />
        )}
      </div>

      <div className="uniform-color-primary">
        <span
          className="uniform-color-swatch"
          style={{ background: formattedHex }}
          role="img"
          aria-label={`${definition.label} is ${formattedHex}`}
        >
          <span aria-hidden="true" />
        </span>
        <label className="uniform-hex-field">
          <span>Hex</span>
          <input
            value={hex}
            maxLength={includeAlpha ? 9 : 7}
            spellCheck={false}
            onChange={(event) => applyHex(event.target.value)}
            onBlur={() => setHex(formattedHex)}
            aria-label={`${definition.label} hexadecimal color`}
          />
        </label>
      </div>

      <details className="uniform-color-advanced">
        <summary>
          <span>Advanced channel values</span>
          <small>{mode.toUpperCase()}</small>
        </summary>
        <div className="uniform-color-mode" aria-label="Color input mode">
          <button type="button" aria-pressed={mode === "rgb"} onClick={() => setMode("rgb")}>
            RGB
          </button>
          <button type="button" aria-pressed={mode === "hsl"} onClick={() => setMode("hsl")}>
            HSL
          </button>
        </div>
        <div className="uniform-color-channels">
          {(mode === "rgb"
            ? ([
                ["R", Math.round(rgba[0] * 255), 255],
                ["G", Math.round(rgba[1] * 255), 255],
                ["B", Math.round(rgba[2] * 255), 255],
              ] as const)
            : ([
                ["H", Math.round(hsl[0]), 360],
                ["S", Math.round(hsl[1] * 100), 100],
                ["L", Math.round(hsl[2] * 100), 100],
              ] as const)
          ).map(([label, channel, maximum], index) => (
            <label key={label}>
              <span>{label}</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={maximum}
                value={channel}
                onChange={(event) => {
                  const next = clamp(Number(event.target.value), 0, maximum);
                  if (mode === "rgb") {
                    const nextRgba = [...rgba];
                    nextRgba[index] = next / 255;
                    updateRgba(nextRgba);
                  } else {
                    const nextHsl = [...hsl];
                    nextHsl[index] = index === 0 ? next : next / 100;
                    updateRgba(hslToRgb(nextHsl));
                  }
                }}
                aria-label={`${definition.label} ${label} channel`}
              />
            </label>
          ))}
          {includeAlpha && (
            <label>
              <span>A</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={Math.round(rgba[3] * 100)}
                onChange={(event) => {
                  const next = [...rgba];
                  next[3] = clamp(Number(event.target.value), 0, 100) / 100;
                  updateRgba(next);
                }}
                aria-label={`${definition.label} alpha channel`}
              />
            </label>
          )}
        </div>
      </details>
    </div>
  );
}

function UniformControl({ definition, value, onChange }: UniformControlProps) {
  if (definition.control === "color") {
    return <ColorControl definition={definition} value={value} onChange={onChange} />;
  }
  if (definition.control === "boolean") {
    return (
      <label className="uniform-boolean-control">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{value ? "Enabled" : "Disabled"}</span>
      </label>
    );
  }
  if (definition.control === "vector") {
    return <VectorControl definition={definition} value={value} onChange={onChange} />;
  }
  return <NumberControl definition={definition} value={value} onChange={onChange} />;
}

export function UniformTunerPanel({
  definitions,
  values,
  onChange,
  onReset,
  onBake,
  onOpenGuide,
  onClose,
}: UniformTunerPanelProps) {
  const [baking, setBaking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !baking) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [baking, onClose]);

  const bake = async () => {
    if (
      !window.confirm(
        "Bake the current values into GLSL constants? A recovery snapshot will be created first, and these uniforms will stop appearing in the tuner.",
      )
    ) {
      return;
    }
    setBaking(true);
    try {
      await onBake();
      onClose();
    } finally {
      setBaking(false);
    }
  };

  return (
    <div className="tuner-backdrop" role="presentation" onMouseDown={baking ? undefined : onClose}>
      <section
        className="tuner-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tuner-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="tuner-heading">
          <div>
            <span className="eyebrow">Live uniforms</span>
            <h2 id="tuner-title">Tune shader</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose} disabled={baking}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close uniform tuner</span>
          </button>
        </div>

        <div className="tuner-intro">
          <p>
            Controls update the preview and exports without recompiling. Values are saved with this
            pass in your portable project.
          </p>
          <button type="button" className="tuner-guide-button" onClick={onOpenGuide}>
            Uniform guide
          </button>
        </div>

        <div className="tuner-controls">
          {definitions.length === 0 ? (
            <div className="tuner-empty">
              <strong>No custom uniforms found</strong>
              <p>
                Declare one uniform per line. Use <code>// @range 0 1 0.01 @default 0.5</code> or
                <code> // @color #FF6A36</code> to customize its control.
              </p>
            </div>
          ) : (
            definitions.map((definition) => {
              const value = resolveUniformValue(definition, values[definition.name]);
              return (
                <section className="uniform-card" key={`${definition.name}-${definition.type}`}>
                  <div className="uniform-card-heading">
                    <span>
                      <strong>{definition.label}</strong>
                      <code>{definition.name}</code>
                    </span>
                    <small>{definition.control === "color" ? "color" : definition.type}</small>
                  </div>
                  <UniformControl
                    definition={definition}
                    value={value}
                    onChange={(nextValue) => onChange(definition.name, nextValue)}
                  />
                </section>
              );
            })
          )}
        </div>

        <div className="tuner-bake-note">
          <strong>Baking freezes these controls into source.</strong>
          <span>
            Receh creates a recovery snapshot, replaces each custom uniform with a GLSL constant,
            and removes it from Tune.
          </span>
        </div>

        <footer className="tuner-footer">
          <button
            className="secondary-button"
            type="button"
            onClick={onReset}
            disabled={baking || definitions.length === 0}
          >
            Reset values
          </button>
          <button
            className="secondary-button export-primary"
            type="button"
            onClick={() => void bake()}
            disabled={baking || definitions.length === 0}
          >
            {baking ? "Baking…" : "Bake into GLSL"}
          </button>
        </footer>
      </section>
    </div>
  );
}
