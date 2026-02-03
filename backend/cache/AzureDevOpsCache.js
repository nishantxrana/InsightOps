import { logger } from "../utils/logger.js";
import { metrics } from "../observability/metrics.js";
import { CACHE_TTL } from "../config/cache.js";

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
    this.defaultTTL = CACHE_TTL;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Generate cache key for a specific operation
   * @param {string} operation - Operation name
   * @param {object} params - Parameters (can include projectName for project-specific caching)
   * @returns {string} Cache key
   */
  generateKey(operation, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}=${JSON.stringify(params[k])}`)
      .join("&");
    return sortedParams ? `${operation}:${sortedParams}` : operation;
  }

  /**
   * Get cached data for an organization + project
   * @param {string} organizationId - Required for multi-tenant isolation
   * @param {string} cacheKey - The cache key
   * @param {string} projectName - Optional project name for project-specific caching
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(organizationId, cacheKey, projectName = null) {
    if (!organizationId) {
      logger.warn("[AzureDevOpsCache] get called without organizationId - skipping cache");
      return null;
    }

    // Include project in cache key if provided
    const fullKey = projectName ? `${projectName}:${cacheKey}` : cacheKey;

    const orgCache = this.cache.get(organizationId);
    if (!orgCache) {
      this.stats.misses++;
      metrics.recordCacheAccess(false);
      return null;
    }

    const entry = orgCache.get(fullKey);
    if (!entry) {
      this.stats.misses++;
      metrics.recordCacheAccess(false);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      orgCache.delete(fullKey);
      this.stats.misses++;
      metrics.recordCacheAccess(false);
      return null;
    }

    this.stats.hits++;
    metrics.recordCacheAccess(true);
    logger.debug(`[AzureDevOpsCache] HIT for org ${organizationId}: ${fullKey}`);
    return entry.data;
  }

  /**
   * Set cached data for an organization + project
   * @param {string} organizationId - Required for multi-tenant isolation
   * @param {string} cacheKey - The cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (default 60s)
   * @param {string} projectName - Optional project name for project-specific caching
   */
  set(organizationId, cacheKey, data, ttl = this.defaultTTL, projectName = null) {
    if (!organizationId) {
      logger.warn("[AzureDevOpsCache] set called without organizationId - skipping cache");
      return;
    }

    // Include project in cache key if provided
    const fullKey = projectName ? `${projectName}:${cacheKey}` : cacheKey;

    if (!this.cache.has(organizationId)) {
      this.cache.set(organizationId, new Map());
    }

    const orgCache = this.cache.get(organizationId);
    orgCache.set(fullKey, {
      data,
      expiry: Date.now() + ttl * 1000,
    });

    this.stats.sets++;
    logger.debug(`[AzureDevOpsCache] SET for org ${organizationId}: ${fullKey} (TTL: ${ttl}s)`);
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
    logger.info("[AzureDevOpsCache] All caches cleared");
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
      hitRate:
        this.stats.hits + this.stats.misses > 0
          ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + "%"
          : "0%",
      organizations: orgCount,
      totalEntries,
    };
  }

  /**
   * Wrapper for common Azure DevOps operations
   */

  // Pull requests cache
  getPullRequests(organizationId, projectName = null) {
    return this.get(organizationId, "pullRequests", projectName);
  }

  setPullRequests(organizationId, data, ttl = CACHE_TTL, projectName = null) {
    this.set(organizationId, "pullRequests", data, ttl, projectName);
  }

  // Builds cache
  getBuilds(organizationId, limit, projectName = null) {
    return this.get(organizationId, `builds:recent:${limit}`, projectName);
  }

  setBuilds(organizationId, limit, data, ttl = CACHE_TTL, projectName = null) {
    this.set(organizationId, `builds:recent:${limit}`, data, ttl, projectName);
  }

  // Work items cache
  getSprintWorkItems(organizationId, projectName = null) {
    return this.get(organizationId, "sprintWorkItems", projectName);
  }

  setSprintWorkItems(organizationId, data, ttl = CACHE_TTL, projectName = null) {
    this.set(organizationId, "sprintWorkItems", data, ttl, projectName);
  }

  // Release stats cache
  getReleaseStats(organizationId, dateRange, projectName = null) {
    return this.get(organizationId, `releaseStats:${dateRange}`, projectName);
  }

  setReleaseStats(organizationId, dateRange, data, ttl = CACHE_TTL, projectName = null) {
    this.set(organizationId, `releaseStats:${dateRange}`, data, ttl, projectName);
  }
}

// Singleton export
export const azureDevOpsCache = new AzureDevOpsCache();
export default azureDevOpsCache;
