import { assertAiAvailable } from "./guard.js";

describe("assertAiAvailable", () => {
  it("returns not_configured when ai missing", () => {
    const r = assertAiAvailable({});
    expect(r.ok).toBe(false);
    expect(r.status).toBe("not_configured");
  });

  it("returns disabled when enabled is false", () => {
    const r = assertAiAvailable({
      ai: {
        enabled: false,
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKeys: { gemini: "key" },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe("disabled");
  });

  it("returns not_configured when key missing", () => {
    const r = assertAiAvailable({
      ai: { enabled: true, provider: "gemini", model: "gemini-2.0-flash", apiKeys: {} },
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe("not_configured");
  });

  it("returns ok with config when configured", () => {
    const r = assertAiAvailable({
      ai: {
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKeys: { gemini: "secret" },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.config.provider).toBe("gemini");
    expect(r.config.enabled).toBe(true);
    expect(r.config.useInNotifications).toBe(true);
  });
});
