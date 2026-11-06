import { mapAiHttpStatus, sendAiError } from "./http.js";

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

describe("mapAiHttpStatus", () => {
  it("maps AUTH_FAILED to 502", () => {
    expect(mapAiHttpStatus({ code: "AUTH_FAILED", httpStatus: 401 })).toBe(502);
  });

  it("maps TIMEOUT to 504", () => {
    expect(mapAiHttpStatus({ code: "TIMEOUT", httpStatus: 504 })).toBe(504);
  });

  it("maps RATE_LIMITED to 429", () => {
    expect(mapAiHttpStatus({ code: "RATE_LIMITED", httpStatus: 429 })).toBe(429);
  });
});

describe("sendAiError", () => {
  it("returns structured error without details.message leak", () => {
    const res = mockRes();
    sendAiError(
      res,
      { status: 401, message: "Incorrect API key sk-secret" },
      { provider: "openai" }
    );
    expect(res.statusCode).toBe(502);
    expect(res.body.error.code).toBe("AUTH_FAILED");
    expect(res.body.error.message).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/sk-secret/);
    expect(res.body.details).toBeUndefined();
  });

  it("sets Retry-After for rate limits", () => {
    const res = mockRes();
    sendAiError(res, {
      status: 429,
      message: "Rate limit exceeded",
      headers: { "retry-after": "8" },
    });
    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBe("8");
  });
});
