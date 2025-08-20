// AI Models configuration for different providers
export const AI_MODELS = {
  openai: [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient for most tasks' },
    { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', description: 'Larger context window' },
    { value: 'gpt-4', label: 'GPT-4', description: 'Most capable model, slower and more expensive' },
    { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo', description: 'Latest GPT-4 with improved performance' }
  ],
  groq: [
    { value: 'llama3-8b-8192', label: 'Llama 3 8B', description: 'Fast inference, good for most tasks' },
    { value: 'llama3-70b-8192', label: 'Llama 3 70B', description: 'More capable, slower inference' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: 'Mixture of experts model' },
    { value: 'gemma-7b-it', label: 'Gemma 7B', description: 'Google\'s open model' }
  ],
  gemini: [
    { value: 'gemini-pro', label: 'Gemini Pro', description: 'Google\'s most capable model' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision', description: 'Supports text and images' },
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro', description: 'Latest version with improved capabilities' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash', description: 'Faster inference, good performance' }
  ]
};

// Default models for each provider
export const DEFAULT_MODELS = {
  openai: 'gpt-3.5-turbo',
  groq: 'llama3-8b-8192',
  gemini: 'gemini-pro'
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
