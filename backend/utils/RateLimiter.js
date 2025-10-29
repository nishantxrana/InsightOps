import { logger } from './logger.js';

/**
 * In-memory rate limiter for API calls
 * Manages rate limits for different AI providers
 */
class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.queues = new Map();
  }

  /**
   * Configure rate limit for a provider
   */
  configure(provider, config) {
    this.limits.set(provider, {
      requests: config.requests,
      window: config.window, // in milliseconds
      tokens: config.tokens || null,
      history: [],
      tokenHistory: []
    });
  }

  /**
   * Check if request can proceed
   */
  canProceed(provider) {
    const limit = this.limits.get(provider);
    if (!limit) return true;

    const now = Date.now();
    const windowStart = now - limit.window;

    // Clean old history
    limit.history = limit.history.filter(time => time > windowStart);

    // Check if under limit
    return limit.history.length < limit.requests;
  }

  /**
   * Record a request
   */
  recordRequest(provider, tokens = 0) {
    const limit = this.limits.get(provider);
    if (!limit) return;

    const now = Date.now();
    limit.history.push(now);

    if (tokens > 0 && limit.tokens) {
      limit.tokenHistory.push({ time: now, tokens });
    }
  }

  /**
   * Wait until request can proceed (with timeout)
   */
  async wait(provider, timeout = 60000) {
    const startTime = Date.now();

    while (!this.canProceed(provider)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Rate limit timeout for ${provider}`);
      }

      // Wait for 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.recordRequest(provider);
  }

  /**
   * Get current usage stats
   */
  getStats(provider) {
    const limit = this.limits.get(provider);
    if (!limit) return null;

    const now = Date.now();
    const windowStart = now - limit.window;

    // Clean old history
    limit.history = limit.history.filter(time => time > windowStart);

    const stats = {
      provider,
      requests: limit.history.length,
      maxRequests: limit.requests,
      window: limit.window,
      available: limit.requests - limit.history.length,
      resetIn: limit.history.length > 0 
        ? Math.max(0, limit.history[0] + limit.window - now)
        : 0
    };

    // Add token stats if applicable
    if (limit.tokens) {
      limit.tokenHistory = limit.tokenHistory.filter(t => t.time > windowStart);
      const tokensUsed = limit.tokenHistory.reduce((sum, t) => sum + t.tokens, 0);
      stats.tokens = {
        used: tokensUsed,
        max: limit.tokens,
        available: limit.tokens - tokensUsed
      };
    }

    return stats;
  }

  /**
   * Get stats for all providers
   */
  getAllStats() {
    const stats = {};
    for (const provider of this.limits.keys()) {
      stats[provider] = this.getStats(provider);
    }
    return stats;
  }

  /**
   * Reset rate limit for provider
   */
  reset(provider) {
    const limit = this.limits.get(provider);
    if (limit) {
      limit.history = [];
      limit.tokenHistory = [];
      logger.info(`Rate limit reset for ${provider}`);
    }
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    for (const provider of this.limits.keys()) {
      this.reset(provider);
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Configure default limits for free tier
rateLimiter.configure('gemini', {
  requests: 15,
  window: 60000, // 1 minute
  tokens: 1000000 // 1M tokens per day (not enforced per minute)
});

rateLimiter.configure('openai', {
  requests: 500,
  window: 60000 // 1 minute
});

export default rateLimiter;
