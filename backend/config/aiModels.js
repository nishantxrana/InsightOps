// AI Models configuration for different providers
export const AI_MODELS = {
  openai: [
    { value: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Compact and efficient model' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano', description: 'Ultra-lightweight model' }
  ],
  groq: [
    { value: 'openai/gpt-oss-120b', label: 'OpenAI GPT OSS 120B', description: 'Large open-source GPT model' },
    { value: 'openai/gpt-oss-20b', label: 'OpenAI GPT OSS 20B', description: 'Medium open-source GPT model' }
  ],
  gemini: [
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Lightweight and fast model' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Latest fast inference model' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fast inference with good performance' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', description: 'Lightweight version' }
  ]
};

// Default models for each provider
export const DEFAULT_MODELS = {
  openai: 'gpt-5-mini',
  groq: 'openai/gpt-oss-20b',
  gemini: 'gemini-2.0-flash'
};

// Get available models for a provider
export function getModelsForProvider(provider) {
  return AI_MODELS[provider] || [];
}

// Get default model for a provider
export function getDefaultModel(provider) {
  return DEFAULT_MODELS[provider] || 'gpt-3.5-turbo';
}

// Validate if a model is supported by a provider
export function isValidModel(provider, model) {
  const models = getModelsForProvider(provider);
  return models.some(m => m.value === model);
}
