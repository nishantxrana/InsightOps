import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ui-density";
const VALUES = ["compact", "default", "comfortable"];

function readDensity() {
  if (typeof window === "undefined") return "default";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return VALUES.includes(stored) ? stored : "default";
}

function applyDensity(value) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = value;
}

/**
 * Persists UI density in localStorage (`ui-density`) and applies
 * `data-density` on `<html>` so `--row-height` updates.
 */
export function useDensity() {
  const [density, setDensityState] = useState(readDensity);

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const setDensity = useCallback((next) => {
    const value = VALUES.includes(next) ? next : "default";
    window.localStorage.setItem(STORAGE_KEY, value);
    setDensityState(value);
    applyDensity(value);
  }, []);

  const cycle = useCallback(() => {
    setDensityState((prev) => {
      const idx = VALUES.indexOf(prev);
      const next = VALUES[(idx + 1) % VALUES.length];
      window.localStorage.setItem(STORAGE_KEY, next);
      applyDensity(next);
      return next;
    });
  }, []);

  return { density, setDensity, cycle, values: VALUES };
}
