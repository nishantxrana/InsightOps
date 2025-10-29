import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { cacheManager } from '../cache/CacheManager.js';
import { rateLimiter } from '../utils/RateLimiter.js';
import { configLoader } from '../config/settings.js';

/**
 * Smart AI model router with caching and rate limiting
 * Optimized for free tier usage
 */
class FreeModelRouter {
  constructor() {
    this.clients = {};
    this.initialized = false;
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0
    };
  }

  /**
   * Initialize AI clients
   */
  initialize(config) {
    if (config.openaiApiKey) {
      this.clients.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
    if (config.groqApiKey) {
      this.clients.groq = new Groq({ apiKey: config.groqApiKey });
    }
    if (config.geminiApiKey) {
      this.clients.gemini = new GoogleGenerativeAI(config.geminiApiKey);
    }
    this.initialized = true;
    logger.info('FreeModelRouter initialized');
  }

  /**
   * Main query method with caching and routing
   */
  async query(request) {
    this.stats.totalRequests++;

    const { prompt, model, complexity = 'simple', maxTokens = 500, temperature = 0.3 } = request;

    // Step 1: Check cache first
    const cached = cacheManager.getAIResponse(prompt, model || 'auto');
    if (cached) {
      this.stats.cacheHits++;
      logger.debug('Cache hit - no API call needed', { 
        hitRate: `${(this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(1)}%` 
      });
      return cached;
    }

    this.stats.cacheMisses++;

    // Step 2: Select best available model
    const selectedModel = await this.selectModel(model, complexity);

    // Step 3: Check rate limits and wait if needed
    await rateLimiter.wait(selectedModel.provider, 30000);

    // Step 4: Execute with fallback
    try {
      const response = await this.execute(selectedModel, prompt, { maxTokens, temperature });
      
      // Step 5: Cache the response
      const cacheTTL = this.getCacheTTL(complexity);
      cacheManager.setAIResponse(prompt, model || 'auto', response, cacheTTL);

      this.stats.apiCalls++;
      logger.info('AI API call', {
        provider: selectedModel.provider,
        model: selectedModel.name,
        cached: false,
        cacheHitRate: `${(this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(1)}%`
      });

      return response;
    } catch (error) {
      logger.error('AI query failed, trying fallback', error);
      return await this.fallback(prompt, selectedModel, { maxTokens, temperature });
    }
  }

  /**
   * Select best model based on availability and task
   */
  async selectModel(requestedModel, complexity) {
    // If specific model requested, use it
    if (requestedModel && requestedModel !== 'auto') {
      return this.getModelConfig(requestedModel);
    }

    // Get available models
    const available = await this.getAvailableModels();

    if (available.length === 0) {
      throw new Error('No AI models available');
    }

    // Smart selection based on complexity
    if (complexity === 'simple' && available.includes('gemini-2.0-flash')) {
      return this.getModelConfig('gemini-2.0-flash');
    }

    if (complexity === 'complex' && available.includes('gpt-4o-mini')) {
      return this.getModelConfig('gpt-4o-mini');
    }

    // Default to first available
    return this.getModelConfig(available[0]);
  }

  /**
   * Get available models based on rate limits
   */
  async getAvailableModels() {
    const available = [];

    // Check Gemini
    if (this.clients.gemini && rateLimiter.canProceed('gemini')) {
      available.push('gemini-2.0-flash');
    }

    // Check OpenAI
    if (this.clients.openai && rateLimiter.canProceed('openai')) {
      available.push('gpt-4o-mini');
    }

    // Check Groq
    if (this.clients.groq && rateLimiter.canProceed('groq')) {
      available.push('llama-3-8b-instant');
    }

    return available;
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName) {
    const configs = {
      'gemini-2.0-flash': { provider: 'gemini', name: 'gemini-2.0-flash-exp', speed: 'fast' },
      'gpt-4o-mini': { provider: 'openai', name: 'gpt-4o-mini', speed: 'medium' },
      'llama-3-8b-instant': { provider: 'groq', name: 'llama-3.1-8b-instant', speed: 'fast' }
    };

    return configs[modelName] || configs['gemini-2.0-flash'];
  }

  /**
   * Execute AI query
   */
  async execute(modelConfig, prompt, options) {
    const { provider, name } = modelConfig;
    const { maxTokens, temperature } = options;

    if (provider === 'openai') {
      const response = await this.clients.openai.chat.completions.create({
        model: name,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature
      });
      rateLimiter.recordRequest('openai', response.usage?.total_tokens || 0);
      return response.choices[0].message.content;
    }

    if (provider === 'groq') {
      const response = await this.clients.groq.chat.completions.create({
        model: name,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature
      });
      rateLimiter.recordRequest('groq', response.usage?.total_tokens || 0);
      return response.choices[0].message.content;
    }

    if (provider === 'gemini') {
      const model = this.clients.gemini.getGenerativeModel({ model: name });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      rateLimiter.recordRequest('gemini', response.length / 4); // Rough token estimate
      return response;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Fallback to alternative model
   */
  async fallback(prompt, failedModel, options) {
    logger.warn(`Trying fallback after ${failedModel.provider} failed`);

    const available = await this.getAvailableModels();
    const alternatives = available.filter(m => m !== failedModel.name);

    if (alternatives.length === 0) {
      throw new Error('No fallback models available');
    }

    const fallbackModel = this.getModelConfig(alternatives[0]);
    return await this.execute(fallbackModel, prompt, options);
  }

  /**
   * Get cache TTL based on complexity
   */
  getCacheTTL(complexity) {
    const ttls = {
      simple: 3600,    // 1 hour
      medium: 1800,    // 30 minutes
      complex: 900     // 15 minutes
    };
    return ttls[complexity] || 1800;
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalRequests > 0 
        ? `${(this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(1)}%`
        : '0%',
      apiCallRate: this.stats.totalRequests > 0
        ? `${(this.stats.apiCalls / this.stats.totalRequests * 100).toFixed(1)}%`
        : '0%',
      rateLimits: rateLimiter.getAllStats(),
      cacheStats: cacheManager.getAllStats()
    };
  }

  /**
   * Initialize with user settings
   */
  initializeWithUserSettings(userSettings) {
    const config = {
      openaiApiKey: userSettings.ai?.apiKeys?.openai,
      groqApiKey: userSettings.ai?.apiKeys?.groq,
      geminiApiKey: userSettings.ai?.apiKeys?.gemini
    };
    this.initialize(config);
  }
}

// Export singleton instance
export const freeModelRouter = new FreeModelRouter();
export default freeModelRouter;
