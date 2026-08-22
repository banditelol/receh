import { useEffect, useMemo, useState } from "react";
import {
  GLSL_REFERENCE_ENTRIES,
  GLSL_REFERENCE_SOURCE,
  getGlslReference,
  getGlslReferenceUrl,
  searchGlslReferences,
} from "./glslCatalog.ts";

type GlslDocsPanelProps = {
  initialName?: string;
  initialSection?: "functions" | "uniforms";
  onClose: () => void;
};

function UniformGuide() {
  return (
    <article className="uniform-docs">
      <header>
        <span className="docs-category">Receh controls</span>
        <h3>Uniforms and tuning</h3>
        <p>
          Uniforms are values supplied to your shader from outside GLSL. Receh owns the runtime
          uniforms below and turns other supported declarations into live controls automatically.
        </p>
      </header>

      <section>
        <h4>Current runtime uniforms</h4>
        <dl className="uniform-runtime-list">
          <div>
            <dt>
              <code>u_resolution</code>
            </dt>
            <dd>Canvas width and height in pixels.</dd>
          </div>
          <div>
            <dt>
              <code>u_time</code> / <code>u_time_delta</code>
            </dt>
            <dd>Playback time in seconds and time since the previous frame.</dd>
          </div>
          <div>
            <dt>
              <code>u_frame</code>
            </dt>
            <dd>Rendered frame number since the last compile.</dd>
          </div>
          <div>
            <dt>
              <code>u_mouse</code> / <code>u_drag</code>
            </dt>
            <dd>Pointer position and drag distance in preview pixels.</dd>
          </div>
          <div>
            <dt>
              <code>u_scroll</code>
            </dt>
            <dd>Accumulated wheel or trackpad movement.</dd>
          </div>
        </dl>
      </section>

      <section>
        <h4>Add a control</h4>
        <p>
          Declare one custom uniform per line. Open <strong>Tune</strong> and receh will create the
          matching slider, toggle, vector fields, or color picker. Values are saved per shader pass
          and update the preview without recompiling.
        </p>
        <pre>
          <code>{`uniform float u_intensity; // @range 0.2 2.0 0.01 @default 1.0
uniform vec3 u_tint;       // @color #FFD0BF
uniform bool u_glow;       // @default true
uniform vec2 u_offset;     // @range -1 1 0.01 @default 0, 0`}</code>
        </pre>
        <ul>
          <li>
            Supported types: <code>float</code>, <code>int</code>, <code>bool</code>, and two- to
            four-component float, integer, or boolean vectors.
          </li>
          <li>
            <code>@range min max step</code> sets slider bounds; <code>@default</code> provides the
            reset value.
          </li>
          <li>
            Use <code>@color #RRGGBB</code> or <code>#RRGGBBAA</code> on a <code>vec3</code> or
            <code>vec4</code>. Names containing color, tint, hue, or albedo are also inferred.
          </li>
        </ul>
      </section>

      <section className="uniform-bake-docs">
        <h4>What “Bake into GLSL” means</h4>
        <p>
          Baking freezes every tuned value into the shader source. Receh first creates a recovery
          snapshot, then replaces each custom <code>uniform</code> declaration with a GLSL
          <code> const</code> containing its current value.
        </p>
        <div className="uniform-bake-example">
          <code>uniform float u_intensity;</code>
          <span aria-hidden="true">→</span>
          <code>const float u_intensity = 1.35;</code>
        </div>
        <p>
          The result is portable GLSL with no external value required, but that value disappears
          from Tune. Restore the recovery snapshot or change the constant in code to tune it again.
        </p>
      </section>
    </article>
  );
}

export function GlslDocsPanel({
  initialName,
  initialSection = "functions",
  onClose,
}: GlslDocsPanelProps) {
  const [section, setSection] = useState(initialSection);
  const [query, setQuery] = useState(initialName ?? "");
  const [selectedName, setSelectedName] = useState(initialName ?? "");
  const results = useMemo(
    () => searchGlslReferences(query, GLSL_REFERENCE_ENTRIES.length),
    [query],
  );
  const selected =
    (selectedName && results.some((item) => item.name === selectedName)
      ? getGlslReference(selectedName)
      : undefined) ?? results[0];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="docs-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="docs-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="glsl-docs-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="docs-heading">
          <div>
            <span className="eyebrow">Offline reference</span>
            <h2 id="glsl-docs-title">GLSL guide</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close GLSL reference</span>
          </button>
        </div>

        <div className="docs-tabs" role="tablist" aria-label="GLSL guide sections">
          <button
            type="button"
            role="tab"
            aria-selected={section === "functions"}
            onClick={() => setSection("functions")}
          >
            Function reference
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === "uniforms"}
            onClick={() => setSection("uniforms")}
          >
            Uniform controls
          </button>
        </div>

        <div className={`docs-content docs-content--${section}`}>
          {section === "functions" ? (
            <>
              <div className="docs-search">
                <label className="sr-only" htmlFor="glsl-docs-search">
                  Search GLSL functions
                </label>
                <input
                  id="glsl-docs-search"
                  type="search"
                  autoFocus
                  value={query}
                  placeholder="Try smoothstep, lerp, derivative…"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedName("");
                  }}
                />
                <span>{results.length} found</span>
              </div>

              <div className="docs-body">
                <div className="docs-results" aria-label="GLSL search results">
                  {results.length === 0 ? (
                    <p className="docs-empty">
                      No local function matches. Try a shorter name or concept.
                    </p>
                  ) : (
                    results.map((item) => (
                      <button
                        className="docs-result"
                        type="button"
                        key={item.name}
                        aria-pressed={selected?.name === item.name}
                        onClick={() => setSelectedName(item.name)}
                      >
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.category}</small>
                        </span>
                        <code>{item.signatures[0]}</code>
                      </button>
                    ))
                  )}
                </div>

                <article className="docs-detail" aria-live="polite">
                  {selected ? (
                    <>
                      <span className="docs-category">{selected.category}</span>
                      <h3>{selected.name}</h3>
                      <div className="docs-signatures">
                        {selected.signatures.map((signature) => (
                          <code key={signature}>{signature}</code>
                        ))}
                      </div>
                      <p>{selected.summary}</p>
                      <h4>Example</h4>
                      <pre>
                        <code>{selected.example}</code>
                      </pre>
                      <a href={getGlslReferenceUrl(selected.name)} target="_blank" rel="noreferrer">
                        Open Khronos reference
                      </a>
                    </>
                  ) : (
                    <p className="docs-empty">Choose a function to inspect its local reference.</p>
                  )}
                </article>
              </div>

              <p className="docs-source-note">
                Signatures target GLSL ES 3.00. Summaries and examples are stored locally;
                authoritative details remain available from{" "}
                <a href={GLSL_REFERENCE_SOURCE} target="_blank" rel="noreferrer">
                  Khronos
                </a>
                .
              </p>
            </>
          ) : (
            <UniformGuide />
          )}
        </div>
      </section>
    </div>
  );
}
