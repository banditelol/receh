# receh product glossary

This glossary defines the names used in plans, issues, UI feedback, code reviews, and agent work.
Search this file before inventing a new name for an existing feature or component. UI labels may be
shorter, but documentation should use the canonical term first.

## Application structure

| Term                        | Meaning                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **App shell**               | The complete receh interface, including the topbar, workspace, mobile navigation, panels, prompts, and dialogs.             |
| **Topbar**                  | The application header containing the receh/library trigger and global actions such as Reset, Export, Config, and collapse. |
| **Topbar collapse control** | The right-edge control that hides the expanded topbar.                                                                      |
| **Topbar restore control**  | The left-edge in-context control that restores a collapsed topbar. Do not call this the collapse control.                   |
| **Workspace**               | The main area containing the Preview pane and Code pane. It is split on larger screens and switches presentation on phones. |
| **Preview pane**            | The live WebGL viewport and its playback toolbar. “Viewport” refers specifically to its rendered shader area.               |
| **Code pane**               | The pass strip, editor heading/action row, diagnostics, source editor, and inline reference chip.                           |
| **Mobile navigation**       | The bottom Preview/Code switch used by the dedicated phone interaction model.                                               |

## Preview and playback

| Term                              | Meaning                                                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Viewport**                      | The visible WebGL render surface. Its current width-to-height ratio is the **viewport aspect ratio**.                                                |
| **Playback toolbar**              | The overlay containing Live/error status, timeline, Tune, restart, play/pause, fullscreen, and its collapse control.                                 |
| **Live/error indicator**          | The compile/render status shown in the playback toolbar. Use “status” when also referring to Compiling or WebGL-unavailable states.                  |
| **Collapsed playback affordance** | The small overlay button that restores a collapsed playback toolbar. It is distinct from the topbar restore control.                                 |
| **Fullscreen preview**            | Browser fullscreen applied to the Preview pane. This is not the same as phone Focus mode.                                                            |
| **Floating preview**              | The small live viewport shown above the Code pane in the Floating code presentation. It may be resizable, but must retain the viewport aspect ratio. |
| **Tuner preview thumbnail**       | The small live viewport kept visible while the Uniform Tuner is open. It should show the whole viewport without cropping or stretching.              |
| **Pixel probe**                   | An on-demand inspection of the current composed shader pipeline at a chosen `gl_FragCoord`, returning the sampled pixel output and runtime values.   |

## Editing and source organization

| Term                       | Meaning                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pass strip**             | The ordered filename tabs at the top of the Code pane, plus Add pass. Function-library controls do not belong in this hierarchy.                                                            |
| **Fragment pass**          | One ordered GLSL fragment stage. Earlier passes render to framebuffer textures consumed by later passes; the final pass renders at output resolution.                                       |
| **Active pass**            | The fragment pass currently selected for editing, tuning, pass management, and active-source export.                                                                                        |
| **Pass options menu**      | The ellipsis menu attached to the active pass filename, containing Rename, Move, Render resolution, and Delete pass.                                                                        |
| **Editor action row**      | The icon-led controls beside the source heading: Find, Docs, source scope/functions, function jump/add, and code presentation.                                                              |
| **Source scope**           | The authored source currently open in the editor: active fragment pass, Project functions, or Global functions.                                                                             |
| **Project functions**      | Reusable GLSL included in every pass of one project. It is stored in the portable document and travels with project/share exports.                                                          |
| **Global functions**       | Reusable GLSL stored once in the local library and available across local projects. Share imports bundle required globals into the imported project instead of modifying recipient globals. |
| **Composed shader source** | Renderer input produced by combining Global functions, Project functions, and one authored fragment pass. Compiler diagnostics are mapped back to the authored source scope.                |
| **Code presentation**      | The phone Code-mode relationship between editor and viewport: Focus, Overlay, or Floating.                                                                                                  |
| **Focus**                  | Code presentation with an opaque editor and no visible live viewport.                                                                                                                       |
| **Overlay**                | Code presentation with the editor layered over the full live Preview pane.                                                                                                                  |
| **Floating**               | Code presentation with an opaque editor and a small live Floating preview.                                                                                                                  |
| **Uniform Tuner**          | The panel that edits parsed custom uniform values without changing GLSL source or recompiling until Bake into GLSL is explicitly used.                                                      |
| **GLSL Docs**              | The bundled offline GLSL function reference. Do not use “Docs” for repository documentation when the UI feature is meant.                                                                   |

## Documents, history, and storage

| Term                   | Meaning                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**            | The user-facing saved shader work in the local library. A project owns one versioned Shader document and its recovery history.                                                                                   |
| **Shader document**    | The portable, versioned data model containing project metadata, project functions, ordered passes, active pass, sources, resolution scales, and tuned values.                                                    |
| **Local library**      | The browser SQLite/OPFS store containing projects, snapshots, and Global functions.                                                                                                                              |
| **Portable project**   | One validated `.receh.json` Shader document intended for transfer without the rest of the local library.                                                                                                         |
| **Library backup**     | A whole-library SQLite export/import containing multiple projects, snapshots, and global source.                                                                                                                 |
| **Snapshot**           | A durable recovery copy of a Shader document, created automatically or manually and optionally named/protected. It is not editor undo history.                                                                   |
| **Revision**           | A logical document state in an ordered history. Compile revisions are short-lived ownership tokens; retained project revisions are a planned durable lineage and must be named explicitly when ambiguity exists. |
| **Undo/redo history**  | Short-term navigation through edits. A future **undo tree** may preserve branches created by undoing and then editing. It remains separate from snapshots.                                                       |
| **Lineage root**       | The first retained revision for a project. New project and Import project create new roots unless a future import explicitly preserves lineage.                                                                  |
| **New project**        | An explicit action that creates a blank/starter project and begins a new lineage root.                                                                                                                           |
| **Import project**     | An explicit action that validates external project/source data, creates a safe local project, and begins or imports a lineage according to revision policy.                                                      |
| **Compile checkpoint** | A durable successful-compile event in a Project lineage, including the complete Shader document state and optional preview metadata. It is distinct from a recovery Snapshot.                                    |

## Rendering and reliability

| Term                   | Meaning                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Compile request**    | A request identified by document, pass, source revision, and explicit generation so stale results can be rejected.                         |
| **Last-good program**  | The most recent successfully compiled WebGL program retained for the same owner while a newer edit has compiler errors.                    |
| **Compile diagnostic** | A parsed compiler error mapped to an authored source scope and line.                                                                       |
| **Render resolution**  | A pass output scale: full, half, or quarter for intermediate passes; always output resolution for the final pass.                          |
| **Share link**         | A versioned URL payload that imports a safe local copy and may include source-view query context. It does not replace the current project. |
