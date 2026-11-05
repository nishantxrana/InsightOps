import { normalizeAzureEndpoint } from "./azureEndpoint.js";

describe("normalizeAzureEndpoint", () => {
  const originalEnv = process.env.AI_AZURE_ALLOWED_HOST_SUFFIXES;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_AZURE_ALLOWED_HOST_SUFFIXES;
    } else {
      process.env.AI_AZURE_ALLOWED_HOST_SUFFIXES = originalEnv;
    }
  });

  it("accepts openai.azure.com host and normalizes to /openai/v1/", () => {
    const r = normalizeAzureEndpoint("https://myres.openai.azure.com");
    expect(r).toEqual({
      ok: true,
      baseUrl: "https://myres.openai.azure.com/openai/v1/",
      host: "myres.openai.azure.com",
    });
  });

  it("accepts trailing slash and existing /openai/v1 path", () => {
    const r = normalizeAzureEndpoint("https://myres.openai.azure.com/openai/v1/");
    expect(r.ok).toBe(true);
    expect(r.baseUrl).toBe("https://myres.openai.azure.com/openai/v1/");
  });

  it("accepts services.ai.azure.com form", () => {
    const r = normalizeAzureEndpoint("https://myres.services.ai.azure.com/openai/v1");
    expect(r.ok).toBe(true);
    expect(r.host).toBe("myres.services.ai.azure.com");
    expect(r.baseUrl).toBe("https://myres.services.ai.azure.com/openai/v1/");
  });

  it("strips query and fragment", () => {
    const r = normalizeAzureEndpoint(
      "https://myres.openai.azure.com/openai/v1/?api-version=2024-01-01#frag"
    );
    expect(r.ok).toBe(true);
    expect(r.baseUrl).toBe("https://myres.openai.azure.com/openai/v1/");
  });

  it("accepts host without scheme", () => {
    const r = normalizeAzureEndpoint("myres.cognitiveservices.azure.com");
    expect(r.ok).toBe(true);
    expect(r.baseUrl).toBe("https://myres.cognitiveservices.azure.com/openai/v1/");
  });

  it("rejects http", () => {
    const r = normalizeAzureEndpoint("http://myres.openai.azure.com");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/https/i);
  });

  it("rejects IP literals", () => {
    expect(normalizeAzureEndpoint("https://127.0.0.1/openai/v1/").ok).toBe(false);
    expect(normalizeAzureEndpoint("https://[::1]/openai/v1/").ok).toBe(false);
  });

  it("rejects localhost", () => {
    expect(normalizeAzureEndpoint("https://localhost/openai/v1/").ok).toBe(false);
  });

  it("rejects credentials in URL", () => {
    const r = normalizeAzureEndpoint("https://user:pass@myres.openai.azure.com");
    expect(r.ok).toBe(false);
  });

  it("rejects non-443 ports", () => {
    const r = normalizeAzureEndpoint("https://myres.openai.azure.com:8443");
    expect(r.ok).toBe(false);
  });

  it("rejects disallowed host suffixes", () => {
    const r = normalizeAzureEndpoint("https://evil.example.com");
    expect(r.ok).toBe(false);
  });

  it("allows extra suffixes from env", () => {
    process.env.AI_AZURE_ALLOWED_HOST_SUFFIXES = ".openai.azure.cn";
    const r = normalizeAzureEndpoint("https://myres.openai.azure.cn");
    expect(r.ok).toBe(true);
    expect(r.host).toBe("myres.openai.azure.cn");
  });

  it("rejects empty input", () => {
    expect(normalizeAzureEndpoint("").ok).toBe(false);
    expect(normalizeAzureEndpoint(null).ok).toBe(false);
  });
});
