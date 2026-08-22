import { useEffect, useState } from "react";

export type StorageHealth = {
  supported: boolean;
  usage: number;
  quota: number;
  ratio: number;
  pressure: boolean;
};

export function classifyStorageEstimate(usage?: number, quota?: number): StorageHealth {
  const safeUsage = Number.isFinite(usage) && usage && usage > 0 ? usage : 0;
  const safeQuota = Number.isFinite(quota) && quota && quota > 0 ? quota : 0;
  const ratio = safeQuota > 0 ? safeUsage / safeQuota : 0;
  const remaining = Math.max(0, safeQuota - safeUsage);
  return {
    supported: safeQuota > 0,
    usage: safeUsage,
    quota: safeQuota,
    ratio,
    pressure: safeQuota > 0 && (ratio >= 0.85 || remaining < 25 * 1024 * 1024),
  };
}

export function formatStorageSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function useStorageHealth() {
  const [health, setHealth] = useState<StorageHealth>(() => classifyStorageEstimate());

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    let active = true;
    const refresh = async () => {
      try {
        const estimate = await navigator.storage.estimate();
        if (active) setHealth(classifyStorageEstimate(estimate.usage, estimate.quota));
      } catch {
        // Storage information is advisory; repository errors remain the durable status source.
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(timer);
    };
  }, []);

  return health;
}
