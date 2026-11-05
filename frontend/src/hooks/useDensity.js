import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ui-density";
const VALUES = ["compact", "default", "comfortable"];

function normalizeDensity(value, fallback = "default") {
  return VALUES.includes(value) ? value : fallback;
}

/**
 * Read stored density. Returns null when the user has never chosen a valid value
 * (missing or invalid localStorage entry).
 */
function readStoredDensity() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored == null) return null;
  return VALUES.includes(stored) ? stored : null;
}

function applyDensity(value) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = value;
}

/**
 * Persists UI density in localStorage (`ui-density`) and applies
 * `data-density` on `<html>` so `--row-height` updates.
 *
 * @param {"compact"|"default"|"comfortable"} [pageDefault]
 *   Optional page default. Used only when the user has never stored a choice;
 *   does not write to localStorage until the user toggles density.
 */
export function useDensity(pageDefault) {
  const [density, setDensityState] = useState(() => {
    const stored = readStoredDensity();
    if (stored) return stored;
    if (VALUES.includes(pageDefault)) return pageDefault;
    return "default";
  });

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const setDensity = useCallback((next) => {
    const value = normalizeDensity(next, "default");
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
