import { useState } from "react";
import type { usePwa } from "./usePwa.ts";

type PwaState = ReturnType<typeof usePwa>;

type PwaPromptProps = {
  pwa: PwaState;
};

export const INSTALL_PROMPT_DISMISSED_KEY = "receh.install-prompt-dismissed.v1";

export function loadInstallPromptDismissed(storage: Pick<Storage, "getItem">) {
  try {
    return storage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveInstallPromptDismissed(storage: Pick<Storage, "setItem">) {
  try {
    storage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
  } catch {
    // The prompt still dismisses for this session when browser storage is unavailable.
  }
}

export function PwaPrompt({ pwa }: PwaPromptProps) {
  const [installDismissed, setInstallDismissed] = useState(() =>
    loadInstallPromptDismissed(window.localStorage),
  );
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const dismissInstallPrompt = () => {
    setInstallDismissed(true);
    saveInstallPromptDismissed(window.localStorage);
  };

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
      aria-label="Install receh"
    >
      <span className="pwa-prompt-mark" aria-hidden="true">
        ƒ
      </span>
      <span className="pwa-prompt-copy">
        <strong>Install receh</strong>
        <small>
          {pwa.manualIosInstall
            ? "In Share, choose Add to Home Screen. You can find these steps later in Config."
            : "Open faster and keep editing offline. Choose Not now to install later from Config."}
        </small>
      </span>
      <button
        className="pwa-prompt-secondary"
        type="button"
        title="Dismiss — you can install later from Config"
        onClick={dismissInstallPrompt}
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
