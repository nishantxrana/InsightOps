import { normalizeAiError } from "./errors.js";

/**
 * Map normalizeAiError codes to the HTTP statuses required for AI feature routes.
 * Provider auth failures become 502 (AUTH_FAILED semantics for the org key).
 *
 * @param {{ code: string, httpStatus: number, retryAfterSeconds?: number }} normalized
 * @returns {number}
 */
export function mapAiHttpStatus(normalized) {
  const { code, httpStatus } = normalized;
  if (code === "AUTH_FAILED" || code === "NO_ACCESS") return 502;
  if (code === "RATE_LIMITED" || code === "QUOTA_EXCEEDED") return 429;
  if (code === "TIMEOUT") return 504;
  if (code === "EMPTY_RESPONSE") return 502;
  if (httpStatus === 401 || httpStatus === 403) return 502;
  return httpStatus >= 400 ? httpStatus : 500;
}

/**
 * Send a structured AI error response. Never includes raw provider messages.
 *
 * @param {import("express").Response} res
 * @param {unknown} err
 * @param {{ provider?: string }} [ctx]
 */
export function sendAiError(res, err, ctx = {}) {
  // Allow pre-normalized or code-tagged errors
  let normalized;
  if (err && typeof err === "object" && err.code && err.message && err.hint && err.httpStatus) {
    normalized = err;
  } else if (err && typeof err === "object" && err.aiCode === "EMPTY_RESPONSE") {
    normalized = {
      code: "EMPTY_RESPONSE",
      httpStatus: 502,
      message: "The AI provider returned an empty response.",
      hint: "Try again, or switch model/deployment in Settings → AI.",
    };
  } else {
    normalized = normalizeAiError(err, ctx);
  }

  const status = mapAiHttpStatus(normalized);
  if (normalized.retryAfterSeconds != null && status === 429) {
    res.setHeader("Retry-After", String(normalized.retryAfterSeconds));
  }

  return res.status(status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      hint: normalized.hint,
    },
  });
}

/**
 * Build an Error tagged as EMPTY_RESPONSE for sendAiError / normalize path.
 * @returns {Error}
 */
export function emptyResponseError() {
  const err = new Error("EMPTY_RESPONSE");
  err.aiCode = "EMPTY_RESPONSE";
  return err;
}
