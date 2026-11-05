const DEFAULT_ALLOWED_SUFFIXES = [
  ".openai.azure.com",
  ".services.ai.azure.com",
  ".cognitiveservices.azure.com",
];

function getAllowedSuffixes() {
  const fromEnv = process.env.AI_AZURE_ALLOWED_HOST_SUFFIXES;
  const extras = fromEnv
    ? fromEnv
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .map((s) => (s.startsWith(".") ? s : `.${s}`))
    : [];
  return [...DEFAULT_ALLOWED_SUFFIXES, ...extras];
}

function isIpLiteral(hostname) {
  if (!hostname) return true;
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  // IPv6 (URL hostname may be bracketed)
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (bare.includes(":")) return true;
  return false;
}

function isLocalhost(hostname) {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "localhost." || h.endsWith(".localhost");
}

function hostAllowed(hostname, suffixes) {
  const h = hostname.toLowerCase();
  return suffixes.some((suffix) => h === suffix.slice(1) || h.endsWith(suffix));
}

/**
 * Normalize an Azure OpenAI / Foundry endpoint for the OpenAI v1 SDK.
 * SECURITY: SSRF-safe — https only, allowlisted host suffixes, no IP/localhost/credentials/non-443.
 *
 * @param {string} input
 * @returns {{ ok: true, baseUrl: string, host: string } | { ok: false, reason: string }}
 */
export function normalizeAzureEndpoint(input) {
  if (input == null || typeof input !== "string" || !input.trim()) {
    return { ok: false, reason: "Endpoint is required" };
  }

  let raw = input.trim();

  // Reject credentials embedded before parsing would strip them inconsistently
  if (/^https?:\/\/[^/@]*@/i.test(raw)) {
    return { ok: false, reason: "Endpoint must not include credentials" };
  }

  try {
    // Allow bare host-like input without scheme by prefixing https
    if (!/^https?:\/\//i.test(raw)) {
      raw = `https://${raw}`;
    }

    const url = new URL(raw);

    if (url.protocol !== "https:") {
      return { ok: false, reason: "Endpoint must use https" };
    }

    if (url.username || url.password) {
      return { ok: false, reason: "Endpoint must not include credentials" };
    }

    const port = url.port;
    if (port && port !== "443") {
      return { ok: false, reason: "Endpoint must use port 443" };
    }

    const host = url.hostname.toLowerCase();
    if (!host) {
      return { ok: false, reason: "Endpoint host is missing" };
    }

    if (isIpLiteral(host)) {
      return { ok: false, reason: "Endpoint must use a hostname, not an IP address" };
    }

    if (isLocalhost(host)) {
      return { ok: false, reason: "Localhost endpoints are not allowed" };
    }

    const suffixes = getAllowedSuffixes();
    if (!hostAllowed(host, suffixes)) {
      return {
        ok: false,
        reason:
          "Endpoint host must end with an allowed Azure suffix (.openai.azure.com, .services.ai.azure.com, or .cognitiveservices.azure.com)",
      };
    }

    const baseUrl = `https://${host}/openai/v1/`;
    return { ok: true, baseUrl, host };
  } catch {
    return { ok: false, reason: "Endpoint is not a valid URL" };
  }
}

export { DEFAULT_ALLOWED_SUFFIXES, getAllowedSuffixes };
