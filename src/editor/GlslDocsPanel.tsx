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
  onClose: () => void;
};

export function GlslDocsPanel({ initialName, onClose }: GlslDocsPanelProps) {
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
            <h2 id="glsl-docs-title">GLSL function search</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close GLSL reference</span>
          </button>
        </div>

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
          Signatures target GLSL ES 3.00. Summaries and examples are stored locally; authoritative
          details remain available from{" "}
          <a href={GLSL_REFERENCE_SOURCE} target="_blank" rel="noreferrer">
            Khronos
          </a>
          .
        </p>
      </section>
    </div>
  );
}
