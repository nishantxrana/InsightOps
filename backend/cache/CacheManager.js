import InMemoryCache from './InMemoryCache.js';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Global cache manager with multiple cache instances
 */
class CacheManager {
  constructor() {
    // Different caches for different purposes
    this.caches = {
      ai: new InMemoryCache(5000),        // AI responses (large)
      embeddings: new InMemoryCache(2000), // Vector embeddings
      api: new InMemoryCache(1000),        // API responses
      analysis: new InMemoryCache(500)     // Analysis results
    };

    // Start cleanup interval (every 5 minutes)
    this.startCleanup();
  }

  /**
   * Generate cache key from object
   */
  generateKey(prefix, data) {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get from specific cache
   */
  get(cacheName, key) {
    const cache = this.caches[cacheName];
    if (!cache) {
      logger.warn(`Cache ${cacheName} not found`);
      return null;
    }
    return cache.get(key);
  }

  /**
   * Set in specific cache
   */
  set(cacheName, key, value, ttl) {
    const cache = this.caches[cacheName];
    if (!cache) {
      logger.warn(`Cache ${cacheName} not found`);
      return;
    }
    cache.set(key, value, ttl);
  }

  /**
   * Check if key exists in cache
   */
  has(cacheName, key) {
    const cache = this.caches[cacheName];
    return cache ? cache.has(key) : false;
  }

  /**
   * Delete from cache
   */
  delete(cacheName, key) {
    const cache = this.caches[cacheName];
    if (cache) {
      cache.delete(key);
    }
  }

  /**
   * Clear specific cache
   */
  clear(cacheName) {
    const cache = this.caches[cacheName];
    if (cache) {
      cache.clear();
      logger.info(`Cache ${cacheName} cleared`);
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    for (const [name, cache] of Object.entries(this.caches)) {
      cache.clear();
    }
    logger.info('All caches cleared');
  }

  /**
   * Get statistics for all caches
   */
  getAllStats() {
    const stats = {};
    for (const [name, cache] of Object.entries(this.caches)) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    setInterval(() => {
      for (const [name, cache] of Object.entries(this.caches)) {
        const cleaned = cache.cleanup();
        if (cleaned > 0) {
          logger.debug(`Cleaned ${cleaned} entries from ${name} cache`);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Wrapper methods for common operations
   */

  // AI response caching
  getAIResponse(prompt, model) {
    const key = this.generateKey('ai', { prompt, model });
    return this.get('ai', key);
  }

  setAIResponse(prompt, model, response, ttl = 3600) {
    const key = this.generateKey('ai', { prompt, model });
    this.set('ai', key, response, ttl);
  }

  // Embedding caching
  getEmbedding(text) {
    const key = this.generateKey('emb', text);
    return this.get('embeddings', key);
  }

  setEmbedding(text, embedding) {
    const key = this.generateKey('emb', text);
    this.set('embeddings', key, embedding, null); // No expiry for embeddings
  }

  // API response caching
  getAPIResponse(endpoint, params) {
    const key = this.generateKey('api', { endpoint, params });
    return this.get('api', key);
  }

  setAPIResponse(endpoint, params, response, ttl = 1800) {
    const key = this.generateKey('api', { endpoint, params });
    this.set('api', key, response, ttl);
  }

  // Analysis caching
  getAnalysis(type, data) {
    const key = this.generateKey('analysis', { type, data });
    return this.get('analysis', key);
  }

  setAnalysis(type, data, result, ttl = 86400) {
    const key = this.generateKey('analysis', { type, data });
    this.set('analysis', key, result, ttl);
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
export default cacheManager;
