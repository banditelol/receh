# FragCoord reproduction planning

Implementation status: [Slice 0 implementation handoff](./slice-0-implementation.md)

Product roadmap: [Shader Pocket V1 plan](../PlanV1.md)

This folder contains the clean-room investigation and implementation direction for a more mobile-friendly FragCoord-style shader editor.

- [Reverse-engineering research](./fragcoord-editor-research.md): deployed stack, editor features, responsive behavior, accessibility risks, evidence, and limits.
- [Mobile editor reproduction plan](./mobile-editor-reproduction-plan.md): architecture decision, mobile UX, packages, rendering strategy, delivery slices, acceptance criteria, and risks.

## Current recommendation

Start with a mobile-first React PWA using CodeMirror 6 and WebGL2. Keep the shader document/compiler/renderer in reusable TypeScript packages. Add an Expo/React Native shell after the phone web experience is proven; do not start with a fully native rewrite.

## First checkpoint

The first implementation should be a narrow device-tested spike: CodeMirror editing, one live WebGL2 shader, keyboard-safe Code/Preview navigation, and last-good-frame behavior on compile failure. No accounts, marketplace, tutorials, profiler, or WebGPU are needed to answer the architecture question.
