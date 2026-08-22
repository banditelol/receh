import { useCallback, useEffect, useRef, useState } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
}

function isStandaloneDisplay() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone
  );
}

function isIosBrowser() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function usePwa() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneDisplay);
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const reloadForUpdateRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | null = null;

    const markWaiting = (worker: ServiceWorker | null) => {
      if (!active || !worker) return;
      waitingWorkerRef.current = worker;
      setUpdateReady(true);
    };
    const trackInstalling = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) markWaiting(worker);
      });
    };
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        markWaiting(registration.waiting);
        registration.addEventListener("updatefound", () =>
          trackInstalling(registration?.installing ?? null),
        );
        void registration.update().catch(() => undefined);
      } catch {
        // A service worker can be blocked by private browsing or an insecure development origin.
      }
    };
    const checkForUpdate = () => {
      if (document.visibilityState === "visible")
        void registration?.update().catch(() => undefined);
    };
    const handleControllerChange = () => {
      if (reloadForUpdateRef.current) window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", checkForUpdate);
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });
    const updateTimer = window.setInterval(checkForUpdate, 60 * 60 * 1000);

    return () => {
      active = false;
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", checkForUpdate);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.clearInterval(updateTimer);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    return choice.outcome === "accepted";
  }, [installPrompt]);

  const applyUpdate = useCallback(() => {
    const waiting = waitingWorkerRef.current;
    if (!waiting) return;
    reloadForUpdateRef.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return {
    online,
    installed,
    canInstall: !installed && installPrompt !== null,
    manualIosInstall: !installed && installPrompt === null && isIosBrowser(),
    updateReady,
    install,
    applyUpdate,
  };
}
