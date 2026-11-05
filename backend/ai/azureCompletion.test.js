import { AIClient, clearAzureApiStyleCache } from "./aiService.js";

describe("Azure apiStyle auto fallback", () => {
  beforeEach(() => {
    clearAzureApiStyleCache();
  });

  it("falls back to chat when responses probe times out", async () => {
    const client = Object.create(AIClient.prototype);
    client.config = {
      provider: "azure",
      model: "my-deployment",
      azureApiStyle: "auto",
      azureResponsesProbeMs: 30,
    };
    client.azureHost = "myres.openai.azure.com";
    client.client = {
      responses: {
        create: () => new Promise(() => {}), // never resolves
      },
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: "OK" } }],
          }),
        },
      },
    };

    const result = await client.generateCompletionWithMeta(
      [{ role: "user", content: "Reply with OK" }],
      { model: "my-deployment", max_tokens: 16 }
    );

    expect(result.text).toBe("OK");
    expect(result.meta.apiStyleUsed).toBe("chat");
  });

  it("falls back to chat when responses returns Model not supported", async () => {
    const client = Object.create(AIClient.prototype);
    client.config = {
      provider: "azure",
      model: "my-deployment",
      azureApiStyle: "auto",
    };
    client.azureHost = "myres.openai.azure.com";
    client.client = {
      responses: {
        create: async () => {
          const err = new Error("Model not supported");
          err.status = 400;
          throw err;
        },
      },
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: "OK" } }],
            usage: { total_tokens: 3 },
          }),
        },
      },
    };

    const result = await client.generateCompletionWithMeta(
      [{ role: "user", content: "Reply with OK" }],
      { model: "my-deployment", max_tokens: 16 }
    );

    expect(result.text).toBe("OK");
    expect(result.meta.apiStyleUsed).toBe("chat");
  });

  it("remembers chat style for the same host+deployment", async () => {
    const client = Object.create(AIClient.prototype);
    client.config = {
      provider: "azure",
      model: "my-deployment",
      azureApiStyle: "auto",
    };
    client.azureHost = "myres.openai.azure.com";

    let responsesCalls = 0;
    client.client = {
      responses: {
        create: async () => {
          responsesCalls += 1;
          const err = new Error("Model not supported");
          err.status = 400;
          throw err;
        },
      },
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: "OK" } }],
          }),
        },
      },
    };

    await client.generateCompletionWithMeta([{ role: "user", content: "hi" }], {
      model: "my-deployment",
      max_tokens: 16,
    });
    await client.generateCompletionWithMeta([{ role: "user", content: "hi" }], {
      model: "my-deployment",
      max_tokens: 16,
    });

    expect(responsesCalls).toBe(1);
  });
});
