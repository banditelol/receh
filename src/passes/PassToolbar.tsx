import { useRef } from "react";
import type { PassResolutionScale, ShaderPass } from "../document/shaderDocument.ts";
import type { EditorSourceView } from "../functions/functionLibrary.ts";

type PassToolbarProps = {
  passes: readonly ShaderPass[];
  activePassId: string;
  sourceView: EditorSourceView;
  onActivate: (passId: string) => void;
  onAdd: () => void;
  onRename: (name: string) => void;
  onMove: (direction: -1 | 1) => void;
  onResolutionScaleChange: (scale: PassResolutionScale) => void;
  onDelete: () => Promise<void>;
};

export function PassToolbar({
  passes,
  activePassId,
  sourceView,
  onActivate,
  onAdd,
  onRename,
  onMove,
  onResolutionScaleChange,
  onDelete,
}: PassToolbarProps) {
  const activeIndex = Math.max(
    0,
    passes.findIndex((pass) => pass.id === activePassId),
  );
  const activePass = passes[activeIndex] ?? passes[0];
  const isOutputPass = activeIndex === passes.length - 1;
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => menuRef.current?.removeAttribute("open");

  return (
    <div className="pass-toolbar" aria-label="Shader sources">
      <div className="pass-tabs" role="tablist" aria-label="Shader sources">
        {passes.map((pass, index) => {
          const active = pass.id === activePassId;
          return (
            <div className="pass-tab-shell" key={pass.id}>
              <button
                type="button"
                role="tab"
                aria-selected={sourceView === "pass" && active}
                className={sourceView === "pass" && active ? "active" : ""}
                onClick={() => onActivate(pass.id)}
              >
                <span>{index + 1}</span>
                {pass.name}
              </button>
              {active && (
                <details className="pass-menu" ref={menuRef}>
                  <summary aria-label={`Pass options for ${activePass.name}`} title="Pass options">
                    <span aria-hidden="true">•••</span>
                  </summary>
                  <div className="pass-menu-popover">
                    <button
                      type="button"
                      onClick={() => {
                        const name = window.prompt("Rename this fragment pass", activePass.name);
                        if (name !== null) onRename(name);
                        closeMenu();
                      }}
                    >
                      Rename
                    </button>
                    <div className="pass-menu-row">
                      <button
                        type="button"
                        disabled={activeIndex === 0}
                        onClick={() => {
                          onMove(-1);
                          closeMenu();
                        }}
                      >
                        Move earlier
                      </button>
                      <button
                        type="button"
                        disabled={activeIndex === passes.length - 1}
                        onClick={() => {
                          onMove(1);
                          closeMenu();
                        }}
                      >
                        Move later
                      </button>
                    </div>
                    <label>
                      <span>Render resolution</span>
                      <select
                        value={isOutputPass ? 1 : activePass.resolutionScale}
                        disabled={isOutputPass}
                        onChange={(event) => {
                          onResolutionScaleChange(
                            Number(event.target.value) as PassResolutionScale,
                          );
                          closeMenu();
                        }}
                      >
                        {isOutputPass ? (
                          <option value={1}>Output resolution</option>
                        ) : (
                          <>
                            <option value={1}>Full resolution</option>
                            <option value={0.5}>Half resolution</option>
                            <option value={0.25}>Quarter resolution</option>
                          </>
                        )}
                      </select>
                    </label>
                    <button
                      className="pass-delete"
                      type="button"
                      disabled={passes.length === 1}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete ${activePass.name}? A recovery snapshot will be created first.`,
                          )
                        ) {
                          void onDelete();
                        }
                        closeMenu();
                      }}
                    >
                      Delete pass
                    </button>
                  </div>
                </details>
              )}
            </div>
          );
        })}
        <button className="pass-add" type="button" onClick={onAdd} aria-label="Add fragment pass">
          <span aria-hidden="true">＋</span>
          Pass
        </button>
      </div>
    </div>
  );
}
