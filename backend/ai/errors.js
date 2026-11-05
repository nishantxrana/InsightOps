/**
 * Strip key-like and Bearer strings before logging provider errors.
 * @param {unknown} value
 * @returns {string}
 */
export function redactSecrets(value) {
  if (value == null) return "";
  let s = typeof value === "string" ? value : String(value);

  // Bearer tokens
  s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]");
  // api-key style headers / assignments
  s = s.replace(
    /((?:api[_-]?key|apikey|x-api-key)\s*[:=]\s*)["']?([A-Za-z0-9_\-]{8,})["']?/gi,
    "$1[REDACTED]"
  );
  // OpenAI / Groq / Gemini-ish keys
  s = s.replace(/\bsk-[A-Za-z0-9_\-]{10,}\b/g, "[REDACTED]");
  s = s.replace(/\bgsk_[A-Za-z0-9_\-]{10,}\b/g, "[REDACTED]");
  s = s.replace(/\bAIza[A-Za-z0-9_\-]{10,}\b/g, "[REDACTED]");
  // Long opaque secrets (32+ alnum) that look like keys
  s = s.replace(/\b[A-Za-z0-9]{48,}\b/g, "[REDACTED]");

  return s;
}

function getStatus(err) {
  return err?.status || err?.statusCode || err?.response?.status || err?.httpStatus || null;
}

function getProviderCode(err) {
  const code =
    err?.code || err?.error?.code || err?.response?.data?.error?.code || err?.error?.type || "";
  return String(code).toLowerCase();
}

function getProviderMessage(err) {
  const raw = err?.error?.message || err?.response?.data?.error?.message || err?.message || "";
  return String(raw);
}

function isTimeout(err, message) {
  const code = String(err?.code || "").toUpperCase();
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT" || code === "ABORT_ERR") {
    return true;
  }
  if (/timeout|timed out|aborted/i.test(message)) return true;
  return false;
}

function isModelNotSupported(message, providerCode) {
  return (
    /model not supported/i.test(message) ||
    providerCode === "model_not_supported" ||
    /unsupported.*(route|api|endpoint)/i.test(message)
  );
}

function isDeploymentNotFound(status, message, providerCode) {
  if (providerCode === "deploymentnotfound" || providerCode === "deployment_not_found") {
    return true;
  }
  if (status === 404) return true;
  if (status === 400 && /deployment|model.*(not found|does not exist|invalid)/i.test(message)) {
    return true;
  }
  return false;
}

const HINTS = {
  AUTH_FAILED: "Check that the API key is correct and has not been rotated.",
  NO_ACCESS: "Confirm this key has access to the selected resource or project.",
  DEPLOYMENT_NOT_FOUND: "Use the deployment name from Foundry, not the base model name.",
  INVALID_ENDPOINT:
    "Use an https Azure OpenAI/Foundry host ending in /openai/v1/ (for example https://YOUR-RESOURCE.openai.azure.com/openai/v1/).",
  MODEL_NOT_SUPPORTED:
    "This deployment may not support the selected API style. Try Chat Completions, or switch API style to Auto.",
  RATE_LIMITED: "Wait a moment and try again. Your provider is rate limiting requests.",
  QUOTA_EXCEEDED: "Check your provider quota or billing limits, then try again.",
  CONTENT_FILTERED:
    "The prompt was blocked by the provider content filter. Adjust the input and retry.",
  TIMEOUT: "The provider did not respond in time. Try again, or check network connectivity.",
  PROVIDER_UNAVAILABLE: "The provider appears temporarily unavailable. Try again shortly.",
  UNKNOWN: "Check your provider settings and try again.",
};

const MESSAGES = {
  AUTH_FAILED: "Authentication failed. The API key was rejected.",
  NO_ACCESS: "Access denied for this API key or resource.",
  DEPLOYMENT_NOT_FOUND: "Deployment or model was not found.",
  INVALID_ENDPOINT: "The Azure endpoint is invalid.",
  MODEL_NOT_SUPPORTED: "This model does not support the requested API.",
  RATE_LIMITED: "Rate limit exceeded.",
  QUOTA_EXCEEDED: "Provider quota exceeded.",
  CONTENT_FILTERED: "The request was blocked by a content filter.",
  TIMEOUT: "The request timed out.",
  PROVIDER_UNAVAILABLE: "The AI provider is temporarily unavailable.",
  UNKNOWN: "The AI request failed.",
};

/**
 * Map a provider SDK/HTTP error to a user-safe shape.
 * Never includes raw provider text (keys may be echoed).
 *
 * @param {unknown} err
 * @param {{ provider?: string }} [ctx]
 * @returns {{ code: string, httpStatus: number, message: string, hint: string, retryAfterSeconds?: number }}
 */
export function normalizeAiError(err, ctx = {}) {
  const provider = ctx.provider || "unknown";
  const status = getStatus(err);
  const providerCode = getProviderCode(err);
  const rawMessage = getProviderMessage(err);
  // Redact for any internal inspection; never return rawMessage to the client
  void redactSecrets(rawMessage);
  void provider;

  let code = "UNKNOWN";
  let httpStatus = typeof status === "number" ? status : 500;
  let retryAfterSeconds;

  if (providerCode === "content_filter" || /content[_ ]?filter/i.test(rawMessage)) {
    code = "CONTENT_FILTERED";
    httpStatus = 400;
  } else if (isTimeout(err, rawMessage)) {
    code = "TIMEOUT";
    httpStatus = 504;
  } else if (status === 401 || providerCode === "invalid_api_key") {
    code = "AUTH_FAILED";
    httpStatus = 401;
  } else if (status === 403) {
    code = "NO_ACCESS";
    httpStatus = 403;
  } else if (status === 429 || providerCode === "rate_limit_exceeded") {
    const retryHeader =
      err?.headers?.["retry-after"] ||
      err?.response?.headers?.["retry-after"] ||
      err?.headers?.get?.("retry-after");
    const parsed = retryHeader != null ? Number(retryHeader) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      retryAfterSeconds = Math.round(parsed);
    }
    if (
      /quota|insufficient_quota|billing/i.test(rawMessage) ||
      providerCode === "insufficient_quota"
    ) {
      code = "QUOTA_EXCEEDED";
    } else {
      code = "RATE_LIMITED";
    }
    httpStatus = 429;
  } else if (
    /invalid.?endpoint|endpoint.*(invalid|must)|hostname|ssrf|not allowed/i.test(rawMessage) ||
    providerCode === "invalid_endpoint"
  ) {
    code = "INVALID_ENDPOINT";
    httpStatus = 400;
  } else if (isDeploymentNotFound(status, rawMessage, providerCode)) {
    code = "DEPLOYMENT_NOT_FOUND";
    httpStatus = status === 404 ? 404 : 400;
  } else if (isModelNotSupported(rawMessage, providerCode)) {
    code = "MODEL_NOT_SUPPORTED";
    httpStatus = 400;
  } else if (status === 502 || status === 503 || status === 504) {
    code = "PROVIDER_UNAVAILABLE";
    httpStatus = status;
  } else if (status != null && status >= 500) {
    code = "PROVIDER_UNAVAILABLE";
    httpStatus = status;
  }

  const result = {
    code,
    httpStatus,
    message: MESSAGES[code] || MESSAGES.UNKNOWN,
    hint: HINTS[code] || HINTS.UNKNOWN,
  };
  if (retryAfterSeconds != null) {
    result.retryAfterSeconds = retryAfterSeconds;
  }
  return result;
}

/**
 * Whether an error indicates Responses API is unsupported for this deployment.
 */
export function isResponsesUnsupportedError(err) {
  const message = getProviderMessage(err);
  const providerCode = getProviderCode(err);
  return isModelNotSupported(message, providerCode);
}

/**
 * Whether Chat Completions rejected a parameter (e.g. max_completion_tokens).
 */
export function isUnsupportedParameterError(err) {
  const message = getProviderMessage(err);
  const providerCode = getProviderCode(err);
  return (
    providerCode === "unsupported_parameter" ||
    /unsupported[_ ]parameter|unknown parameter|unrecognized.*parameter/i.test(message)
  );
}
