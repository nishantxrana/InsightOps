import { normalizeAiError, redactSecrets } from "./errors.js";

describe("redactSecrets", () => {
  it("redacts Bearer tokens", () => {
    expect(redactSecrets("Authorization Bearer sk-abcdefghijklmnopqrstuvwxyz")).toContain(
      "[REDACTED]"
    );
    expect(redactSecrets("Authorization Bearer sk-abcdefghijklmnopqrstuvwxyz")).not.toContain(
      "sk-abc"
    );
  });

  it("redacts openai-style keys", () => {
    const out = redactSecrets("key=sk-proj-abcdefghijklmnopqrstuvwxyz1234");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts groq and gemini-style keys", () => {
    expect(redactSecrets("gsk_abcdefghijklmnopqrstuvwxyz")).toContain("[REDACTED]");
    expect(redactSecrets("AIzaSyAbcdefghijklmnopqrstuvwxyz012345")).toContain("[REDACTED]");
  });
});

describe("normalizeAiError", () => {
  it("maps 401 to AUTH_FAILED", () => {
    const r = normalizeAiError({ status: 401, message: "Incorrect API key sk-secretkey" });
    expect(r.code).toBe("AUTH_FAILED");
    expect(r.httpStatus).toBe(401);
    expect(r.message).not.toMatch(/sk-/);
    expect(r.hint).toBeTruthy();
  });

  it("maps deployment not found", () => {
    const r = normalizeAiError({
      status: 404,
      message: "DeploymentNotFound: The deployment does not exist",
      code: "DeploymentNotFound",
    });
    expect(r.code).toBe("DEPLOYMENT_NOT_FOUND");
    expect(r.hint).toMatch(/deployment name/i);
  });

  it("maps content_filter", () => {
    const r = normalizeAiError({
      status: 400,
      error: { code: "content_filter", message: "filtered" },
    });
    expect(r.code).toBe("CONTENT_FILTERED");
    expect(r.httpStatus).toBe(400);
  });

  it("maps 429 to RATE_LIMITED with retryAfter", () => {
    const r = normalizeAiError({
      status: 429,
      message: "Rate limit exceeded",
      headers: { "retry-after": "12" },
    });
    expect(r.code).toBe("RATE_LIMITED");
    expect(r.retryAfterSeconds).toBe(12);
  });

  it("maps timeout", () => {
    const r = normalizeAiError({ code: "ETIMEDOUT", message: "request timed out" });
    expect(r.code).toBe("TIMEOUT");
  });

  it("maps model not supported", () => {
    const r = normalizeAiError({ status: 400, message: "Model not supported" });
    expect(r.code).toBe("MODEL_NOT_SUPPORTED");
  });
});
