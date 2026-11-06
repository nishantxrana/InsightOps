/**
 * De-duplicate concurrent identical async work by key.
 * Same key in flight → one call, shared result.
 */

const inflight = new Map();

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function runInFlight(key, fn) {
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise;
}

/** Test helper — clear all in-flight entries. */
export function clearInFlight() {
  inflight.clear();
}

/** Test helper — current in-flight size. */
export function inflightSize() {
  return inflight.size;
}
