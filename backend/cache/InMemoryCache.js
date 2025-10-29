import { logger } from '../utils/logger.js';

/**
 * In-memory LRU cache with TTL support
 * Replaces need for Redis in free tier
 */
class InMemoryCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const item = this.cache.get(key);

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access time for LRU
    item.lastAccess = Date.now();
    item.accessCount++;
    this.hits++;

    return item.value;
  }

  /**
   * Set value in cache with optional TTL
   */
  set(key, value, ttl = 3600) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiresAt: ttl ? Date.now() + (ttl * 1000) : null,
      lastAccess: Date.now(),
      accessCount: 0,
      createdAt: Date.now()
    });
  }

  /**
   * Check if key exists and not expired
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Evict least recently used item
   */
  evictOldest() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
      logger.debug(`Cache evicted: ${oldest}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%',
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage in MB
   */
  estimateMemoryUsage() {
    let bytes = 0;
    for (const [key, item] of this.cache.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += JSON.stringify(item.value).length * 2;
    }
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }
}

export default InMemoryCache;
