import { logger } from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';

/**
 * Per-organization cache for Azure DevOps API responses
 * 
 * This cache:
 * - Is scoped by organizationId (multi-tenant safe)
 * - Has short TTL to ensure freshness (default 60s)
 * - Reduces duplicate Azure DevOps API calls within the same request cycle
 * - Does NOT cache across long periods (data freshness preserved)
 */
class AzureDevOpsCache {
  constructor() {
    // Map<organizationId, Map<cacheKey, { data, expiry }>>
    this.cache = new Map();
    this.defaultTTL = 60; // 60 seconds default
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Generate cache key for a specific operation
   */
  generateKey(operation, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    return `${operation}:${sortedParams}`;
  }

  /**
   * Get cached data for an organization
   * @param {string} organizationId - Required for multi-tenant isolation
   * @param {string} cacheKey - The cache key
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(organizationId, cacheKey) {
    if (!organizationId) {
      logger.warn('[AzureDevOpsCache] get called without organizationId - skipping cache');
      return null;
    }

    const orgCache = this.cache.get(organizationId);
    if (!orgCache) {
      this.stats.misses++;
      metrics.recordCacheAccess(false);
      return null;
    }

    const entry = orgCache.get(cacheKey);
    if (!entry) {
      this.stats.misses++;
      metrics.recordCacheAccess(false);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      orgCache.delete(cacheKey);
      this.stats.misses++;
      metrics.recordCacheAccess(false);
      return null;
    }

    this.stats.hits++;
    metrics.recordCacheAccess(true);
    logger.debug(`[AzureDevOpsCache] HIT for org ${organizationId}: ${cacheKey}`);
    return entry.data;
  }

  /**
   * Set cached data for an organization
   * @param {string} organizationId - Required for multi-tenant isolation
   * @param {string} cacheKey - The cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (default 60s)
   */
  set(organizationId, cacheKey, data, ttl = this.defaultTTL) {
    if (!organizationId) {
      logger.warn('[AzureDevOpsCache] set called without organizationId - not caching');
      return;
    }

    if (!this.cache.has(organizationId)) {
      this.cache.set(organizationId, new Map());
    }

    const orgCache = this.cache.get(organizationId);
    orgCache.set(cacheKey, {
      data,
      expiry: Date.now() + (ttl * 1000)
    });

    this.stats.sets++;
    logger.debug(`[AzureDevOpsCache] SET for org ${organizationId}: ${cacheKey} (TTL: ${ttl}s)`);
  }

  /**
   * Invalidate cache for a specific organization
   * Call this when organization switches or settings change
   */
  invalidateOrg(organizationId) {
    if (this.cache.has(organizationId)) {
      this.cache.delete(organizationId);
      logger.info(`[AzureDevOpsCache] Invalidated cache for org ${organizationId}`);
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.cache.clear();
    logger.info('[AzureDevOpsCache] All caches cleared');
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [orgId, orgCache] of this.cache.entries()) {
      for (const [key, entry] of orgCache.entries()) {
        if (now > entry.expiry) {
          orgCache.delete(key);
          cleanedCount++;
        }
      }
      
      // Remove empty org caches
      if (orgCache.size === 0) {
        this.cache.delete(orgId);
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`[AzureDevOpsCache] Cleaned ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const orgCount = this.cache.size;
    let totalEntries = 0;
    
    for (const orgCache of this.cache.values()) {
      totalEntries += orgCache.size;
    }

    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '0%',
      organizations: orgCount,
      totalEntries
    };
  }

  /**
   * Wrapper for common Azure DevOps operations
   */

  // Pull requests cache
  getPullRequests(organizationId) {
    return this.get(organizationId, 'pullRequests:active');
  }

  setPullRequests(organizationId, data, ttl = 60) {
    this.set(organizationId, 'pullRequests:active', data, ttl);
  }

  // Builds cache
  getBuilds(organizationId, limit) {
    return this.get(organizationId, `builds:recent:${limit}`);
  }

  setBuilds(organizationId, limit, data, ttl = 60) {
    this.set(organizationId, `builds:recent:${limit}`, data, ttl);
  }

  // Work items cache
  getSprintWorkItems(organizationId) {
    return this.get(organizationId, 'workItems:sprint');
  }

  setSprintWorkItems(organizationId, data, ttl = 60) {
    this.set(organizationId, 'workItems:sprint', data, ttl);
  }

  // Release stats cache (longer TTL since expensive)
  getReleaseStats(organizationId, dateRange) {
    const key = `releaseStats:${dateRange || 'default'}`;
    return this.get(organizationId, key);
  }

  setReleaseStats(organizationId, dateRange, data, ttl = 300) {
    const key = `releaseStats:${dateRange || 'default'}`;
    this.set(organizationId, key, data, ttl);
  }
}

// Singleton export
export const azureDevOpsCache = new AzureDevOpsCache();
export default azureDevOpsCache;

