import type { PassResolutionScale, ShaderPass } from "../document/shaderDocument.ts";
import type {
  EditorSourceView,
  FunctionDefinition,
  FunctionScope,
} from "../functions/functionLibrary.ts";

type PassToolbarProps = {
  passes: readonly ShaderPass[];
  activePassId: string;
  sourceView: EditorSourceView;
  functions: readonly FunctionDefinition[];
  onActivate: (passId: string) => void;
  onAdd: () => void;
  onRename: (name: string) => void;
  onMove: (direction: -1 | 1) => void;
  onResolutionScaleChange: (scale: PassResolutionScale) => void;
  onDelete: () => Promise<void>;
  onOpenFunctions: (scope: FunctionScope) => void;
  onJumpToFunction: (definition: FunctionDefinition) => void;
  onAddFunction: () => void;
};

export function PassToolbar({
  passes,
  activePassId,
  sourceView,
  functions,
  onActivate,
  onAdd,
  onRename,
  onMove,
  onResolutionScaleChange,
  onDelete,
  onOpenFunctions,
  onJumpToFunction,
  onAddFunction,
}: PassToolbarProps) {
  const activeIndex = Math.max(
    0,
    passes.findIndex((pass) => pass.id === activePassId),
  );
  const activePass = passes[activeIndex] ?? passes[0];
  const isOutputPass = activeIndex === passes.length - 1;

  return (
    <div className="pass-toolbar" aria-label="Shader sources">
      <div className="pass-tabs" role="tablist" aria-label="Shader sources">
        {passes.map((pass, index) => (
          <button
            type="button"
            role="tab"
            key={pass.id}
            aria-selected={sourceView === "pass" && pass.id === activePassId}
            className={sourceView === "pass" && pass.id === activePassId ? "active" : ""}
            onClick={() => onActivate(pass.id)}
          >
            <span>{index + 1}</span>
            {pass.name}
          </button>
        ))}
        <button className="pass-add" type="button" onClick={onAdd} aria-label="Add fragment pass">
          <span aria-hidden="true">＋</span>
          Pass
        </button>
        <button
          className={
            sourceView === "project" ? "active function-source-tab" : "function-source-tab"
          }
          type="button"
          role="tab"
          onClick={() => onOpenFunctions("project")}
          aria-selected={sourceView === "project"}
        >
          <span aria-hidden="true">ƒ</span>
          Project
        </button>
        <button
          className={sourceView === "global" ? "active function-source-tab" : "function-source-tab"}
          type="button"
          role="tab"
          onClick={() => onOpenFunctions("global")}
          aria-selected={sourceView === "global"}
        >
          <span aria-hidden="true">ƒ</span>
          Global
        </button>
      </div>
      {sourceView === "pass" ? (
        <div className="pass-actions">
          <button
            type="button"
            onClick={() => {
              const name = window.prompt("Rename this fragment pass", activePass.name);
              if (name !== null) onRename(name);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => onMove(-1)}
            aria-label={`Move ${activePass.name} earlier`}
          >
            ←
          </button>
          <button
            type="button"
            disabled={activeIndex === passes.length - 1}
            onClick={() => onMove(1)}
            aria-label={`Move ${activePass.name} later`}
          >
            →
          </button>
          <label>
            <span className="sr-only">
              {isOutputPass
                ? `${activePass.name} renders at output resolution`
                : `Intermediate resolution for ${activePass.name}`}
            </span>
            <select
              value={isOutputPass ? 1 : activePass.resolutionScale}
              disabled={isOutputPass}
              onChange={(event) =>
                onResolutionScaleChange(Number(event.target.value) as PassResolutionScale)
              }
              aria-label={
                isOutputPass
                  ? `${activePass.name} renders at output resolution`
                  : `Intermediate resolution for ${activePass.name}`
              }
              title={
                isOutputPass ? "The final pass always renders at output resolution." : undefined
              }
            >
              {isOutputPass ? (
                <option value={1}>Output res</option>
              ) : (
                <>
                  <option value={1}>Full res</option>
                  <option value={0.5}>Half res</option>
                  <option value={0.25}>Quarter res</option>
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
            }}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="pass-actions function-actions">
          <label>
            <span className="sr-only">Jump to a {sourceView} function</span>
            <select
              value=""
              aria-label={`Jump to a ${sourceView} function`}
              onChange={(event) => {
                const definition = functions.find((item) => item.name === event.target.value);
                if (definition) onJumpToFunction(definition);
              }}
            >
              <option value="">
                {functions.length ? `${functions.length} functions` : "No functions"}
              </option>
              {functions.map((definition) => (
                <option value={definition.name} key={`${definition.name}:${definition.line}`}>
                  {definition.name} · line {definition.line}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onAddFunction}>
            ＋ Function
          </button>
        </div>
      )}
    </div>
  );
}
