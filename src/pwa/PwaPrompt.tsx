import { useState } from "react";
import type { usePwa } from "./usePwa.ts";

type PwaState = ReturnType<typeof usePwa>;

type PwaPromptProps = {
  pwa: PwaState;
};

export function PwaPrompt({ pwa }: PwaPromptProps) {
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  if (pwa.updateReady && !updateDismissed) {
    return (
      <aside className="pwa-prompt" role="status" aria-label="Application update available">
        <span className="pwa-prompt-mark" aria-hidden="true">
          ↻
        </span>
        <span className="pwa-prompt-copy">
          <strong>Update ready</strong>
          <small>Your local projects stay on this device.</small>
        </span>
        <button
          className="pwa-prompt-secondary"
          type="button"
          onClick={() => setUpdateDismissed(true)}
        >
          Later
        </button>
        <button className="pwa-prompt-primary" type="button" onClick={pwa.applyUpdate}>
          Reload
        </button>
      </aside>
    );
  }

  if (!pwa.online) {
    return (
      <aside className="pwa-prompt pwa-prompt--offline" role="status">
        <span className="pwa-prompt-mark" aria-hidden="true">
          ↓
        </span>
        <span className="pwa-prompt-copy">
          <strong>Working offline</strong>
          <small>The editor and local SQLite library remain available.</small>
        </span>
      </aside>
    );
  }

  if (installDismissed || (!pwa.canInstall && !pwa.manualIosInstall)) return null;

  return (
    <aside
      className={`pwa-prompt ${pwa.manualIosInstall ? "pwa-prompt--install-guide" : ""}`}
      role="status"
      aria-label="Install Shader Pocket"
    >
      <span className="pwa-prompt-mark" aria-hidden="true">
        ƒ
      </span>
      <span className="pwa-prompt-copy">
        <strong>Install Shader Pocket</strong>
        <small>
          {pwa.manualIosInstall
            ? "In Share, choose Add to Home Screen."
            : "Open faster and keep editing offline."}
        </small>
      </span>
      <button
        className="pwa-prompt-secondary"
        type="button"
        onClick={() => setInstallDismissed(true)}
      >
        Not now
      </button>
      {pwa.canInstall && (
        <button className="pwa-prompt-primary" type="button" onClick={() => void pwa.install()}>
          Install
        </button>
      )}
    </aside>
  );
}
