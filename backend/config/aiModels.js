// AI Models configuration for different providers (static fallback for Settings).
// Only include IDs we have reason to keep; mark uncertain ones STALE rather than inventing.
// Live lists from GET /api/ai/models/:provider supersede these when a key works.

export const AI_MODELS = {
  openai: [
    // Present in prior catalog; live list from OpenAI models.list is preferred.
    { value: "gpt-5-mini", label: "GPT-5 Mini", description: "Compact and efficient model" }, // STALE? confirm against OpenAI docs if live list fails
    { value: "gpt-5-nano", label: "GPT-5 Nano", description: "Ultra-lightweight model" }, // STALE? confirm against OpenAI docs if live list fails
    { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast multimodal mini model" },
  ],
  groq: [
    {
      value: "openai/gpt-oss-120b",
      label: "OpenAI GPT OSS 120B",
      description: "Large open-source GPT model",
    }, // STALE? confirm on Groq console if live list fails
    {
      value: "openai/gpt-oss-20b",
      label: "OpenAI GPT OSS 20B",
      description: "Medium open-source GPT model",
    }, // STALE? confirm on Groq console if live list fails
    {
      value: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B Versatile",
      description: "Groq Llama 3.3",
    },
  ],
  gemini: [
    {
      value: "gemini-2.5-flash-lite",
      label: "Gemini 2.5 Flash-Lite",
      description: "Lightweight and fast model",
    }, // STALE? confirm against Google AI docs if live list fails
    {
      value: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      description: "Latest fast inference model",
    }, // STALE? confirm against Google AI docs if live list fails
    {
      value: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      description: "Fast inference with good performance",
    },
    {
      value: "gemini-2.0-flash-lite",
      label: "Gemini 2.0 Flash-Lite",
      description: "Lightweight version",
    },
  ],
  // Azure: no static list — deployment names are typed by the user
};

// Default models for each provider
export const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
};

// Get available models for a provider
export function getModelsForProvider(provider) {
  return AI_MODELS[provider] || [];
}

// Get default model for a provider
export function getDefaultModel(provider) {
  return DEFAULT_MODELS[provider] || "";
}

// Validate if a model is supported by a provider (static list only)
export function isValidModel(provider, model) {
  const models = getModelsForProvider(provider);
  return models.some((m) => m.value === model);
}
