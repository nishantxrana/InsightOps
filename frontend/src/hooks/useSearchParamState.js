import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Sync one URL search param without clobbering sibling params.
 *
 * @param {string} key
 * @param {string|string[]|null} defaultValue
 * @param {{ multiple?: boolean, replace?: boolean }} [options]
 */
export function useSearchParamState(key, defaultValue = "", options = {}) {
  const { multiple = false, replace = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => {
    if (multiple) {
      const all = searchParams.getAll(key);
      if (all.length === 0) {
        return Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [];
      }
      return all;
    }
    const raw = searchParams.get(key);
    return raw === null ? defaultValue : raw;
  }, [searchParams, key, multiple, defaultValue]);

  const setValue = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.delete(key);

          if (multiple) {
            const list = Array.isArray(next) ? next : next == null || next === "" ? [] : [next];
            const defaults = Array.isArray(defaultValue)
              ? defaultValue
              : defaultValue
                ? [defaultValue]
                : [];
            const same = list.length === defaults.length && list.every((v, i) => v === defaults[i]);
            if (!same) {
              list.forEach((v) => {
                if (v !== "" && v != null) params.append(key, String(v));
              });
            }
          } else {
            const str = next == null ? "" : String(next);
            if (str !== "" && str !== String(defaultValue ?? "")) {
              params.set(key, str);
            }
          }

          return params;
        },
        { replace }
      );
    },
    [key, multiple, defaultValue, replace, setSearchParams]
  );

  return [value, setValue];
}
