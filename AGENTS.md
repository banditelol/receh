# Repository agent guide

These instructions apply to the entire repository.

## Toolchain

- Use VitePlus through `vp` for package management and project tasks.
- Install dependencies with `vp install` or `vp add`.
- Run development with `vp dev`.
- Before handing off implementation changes, run `vp check`, `vp test --run`, and `vp build` when relevant.
- The registered development service is `fragcoord-re` on port `37005`. Keep `vite.config.ts` bound to `0.0.0.0` with `strictPort: true` so it remains reachable over Tailscale without silently moving to another port.

## Frontend browser verification

Every change that affects frontend behavior or presentation must be verified in a real browser after implementation. This includes UI, styling, responsive layout, interaction, rendering, routing, accessibility, and other browser-visible changes.

1. Use the Microsoft-maintained Playwright CLI package, `@playwright/cli`, through VitePlus:

   ```bash
   vp exec playwright-cli --help
   ```

2. If that command is unavailable, install it in this repository rather than relying on a global package:

   ```bash
   vp add -D @playwright/cli
   ```

   If the required browser is missing, install it with:

   ```bash
   vp exec playwright-cli install-browser chrome
   ```

3. Start or reuse the app server, then exercise the changed flow with `playwright-cli`. Verify both a desktop viewport and a representative phone viewport for responsive work. Prefer Chrome unless the change is browser-specific. Example:

   ```bash
   vp exec playwright-cli -s=fragcoord-qa open http://127.0.0.1:37005 --browser chrome
   vp exec playwright-cli -s=fragcoord-qa resize 1440 900
   vp exec playwright-cli -s=fragcoord-qa screenshot --filename=.artifacts/playwright/desktop.png
   vp exec playwright-cli -s=fragcoord-mobile open http://127.0.0.1:37005 --browser chrome --device="iPhone 15"
   vp exec playwright-cli -s=fragcoord-mobile screenshot --filename=.artifacts/playwright/mobile.png
   ```

4. Use a video when motion, gestures, timing, animation, or a multi-step interaction cannot be demonstrated well by still images:

   ```bash
   vp exec playwright-cli -s=fragcoord-qa video-start .artifacts/playwright/interaction.webm
   # Perform the interaction with playwright-cli.
   vp exec playwright-cli -s=fragcoord-qa video-stop
   ```

5. Inspect browser console output after exercising the flow. Treat new uncaught errors, failed resources, and relevant warnings as implementation failures.

6. Save screenshots and videos under `.artifacts/playwright/`. Keep this directory untracked. In the final response, embed or link the absolute local artifact paths so the user can review the visual result directly. State which viewports and interactions were verified. Do not claim visual verification when capture failed; report the failure and its cause.

7. Close named Playwright sessions after capturing artifacts unless the user asked to keep the browser open:

   ```bash
   vp exec playwright-cli -s=fragcoord-qa close
   vp exec playwright-cli -s=fragcoord-mobile close
   ```

## Implementation notes

- Preserve the browser-first React and WebGL2 architecture unless a task explicitly changes that direction.
- Keep mobile editing as a dedicated interaction model, not a compressed desktop split view.
- Preserve the last-good WebGL program when a shader edit fails to compile.
- Keep generated browser artifacts, build output, and dependencies out of version control.
