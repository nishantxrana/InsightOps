import {
  redactForPrompt,
  sanitizeAdoField,
  stripHtml,
  truncateField,
  wrapAdoContent,
} from "./promptSafety.js";

describe("stripHtml", () => {
  it("removes tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
});

describe("truncateField", () => {
  it("appends marker when over cap", () => {
    const out = truncateField("abcdefghij", 5);
    expect(out).toBe("abcde\n[truncated]");
  });

  it("leaves short strings alone", () => {
    expect(truncateField("hi", 10)).toBe("hi");
  });
});

describe("redactForPrompt", () => {
  it("redacts bearer and sk- keys", () => {
    const out = redactForPrompt("Authorization: Bearer abcdefghijklmnop sk-abcdefghijklmnopqrstuv");
    expect(out).toContain("[REDACTED]");
    expect(out).not.toMatch(/Bearer abcdef/);
    expect(out).not.toMatch(/sk-abc/);
  });

  it("redacts AKIA and assignment secrets", () => {
    const out = redactForPrompt("password=SuperSecretValue123456 token=abcdefghijklmnopqrstuvwxyz");
    expect(out).toContain("[REDACTED]");
  });
});

describe("sanitizeAdoField", () => {
  it("strips html, redacts, and truncates", () => {
    const out = sanitizeAdoField("<div>key=sk-abcdefghijklmnopqrstuv hello</div>", { max: 40 });
    expect(out).not.toContain("<div>");
    expect(out).toContain("[REDACTED]");
  });
});

describe("wrapAdoContent", () => {
  it("wraps with delimiters", () => {
    const out = wrapAdoContent("description", "do evil");
    expect(out).toContain('<ado_content label="description">');
    expect(out).toContain("do evil");
    expect(out).toContain("</ado_content>");
  });
});
