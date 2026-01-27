/**
 * Lightweight in-memory metrics collector for production observability
 *
 * This is NOT a replacement for Application Insights.
 * It provides:
 * - Fast local counters for health checks
 * - Per-org metrics for multi-tenant visibility
 * - Short-term aggregates for diagnostics
 *
 * Metrics are reset on restart (by design - not durable).
 */

import { logger } from "../utils/logger.js";

class MetricsCollector {
  constructor() {
    this.startTime = Date.now();

    // Global counters
    this.counters = {
      requests: { total: 0, success: 0, errors: 0 },
      polling: { runs: 0, success: 0, failures: 0 },
      webhooks: { received: 0, processed: 0, rejected: 0 },
      azureDevOps: { calls: 0, success: 0, errors: 0, rateLimited: 0 },
      ai: { requests: 0, success: 0, failures: 0 },
      cache: { hits: 0, misses: 0 },
    };

    // Per-organization metrics
    // Map<organizationId, { polling: { lastRun, lastSuccess, failures }, ... }>
    this.orgMetrics = new Map();

    // Request duration histogram (last 100 requests)
    this.requestDurations = [];
    this.maxDurationSamples = 100;

    // Recent errors (last 20 for debugging)
    this.recentErrors = [];
    this.maxRecentErrors = 20;
  }

  /**
   * Increment a counter
   * @param {string} category - e.g., 'requests', 'polling', 'webhooks'
   * @param {string} metric - e.g., 'total', 'success', 'errors'
   * @param {number} value - Amount to increment (default 1)
   */
  increment(category, metric, value = 1) {
    if (this.counters[category]?.[metric] !== undefined) {
      this.counters[category][metric] += value;
    }
  }

  /**
   * Record request duration
   * @param {string} path - Request path
   * @param {number} durationMs - Duration in milliseconds
   * @param {number} statusCode - HTTP status code
   */
  recordRequestDuration(path, durationMs, statusCode) {
    this.requestDurations.push({
      path,
      durationMs,
      statusCode,
      timestamp: Date.now(),
    });

    // Keep only recent samples
    if (this.requestDurations.length > this.maxDurationSamples) {
      this.requestDurations.shift();
    }

    // Increment counters
    this.increment("requests", "total");
    if (statusCode >= 200 && statusCode < 400) {
      this.increment("requests", "success");
    } else if (statusCode >= 400) {
      this.increment("requests", "errors");
    }
  }

  /**
   * Record polling execution for an organization
   * @param {string} organizationId
   * @param {string} jobType - 'workItems', 'builds', 'pullRequests'
   * @param {boolean} success
   * @param {string} errorMessage - Optional error message
   */
  recordPollingRun(organizationId, jobType, success, errorMessage = null) {
    this.increment("polling", "runs");

    if (success) {
      this.increment("polling", "success");
    } else {
      this.increment("polling", "failures");
    }

    // Per-org tracking
    if (!this.orgMetrics.has(organizationId)) {
      this.orgMetrics.set(organizationId, {
        polling: {},
        webhooks: { received: 0, processed: 0 },
        lastActivity: Date.now(),
      });
    }

    const orgData = this.orgMetrics.get(organizationId);
    orgData.polling[jobType] = {
      lastRun: Date.now(),
      lastSuccess: success ? Date.now() : orgData.polling[jobType]?.lastSuccess || null,
      lastError: errorMessage,
      consecutiveFailures: success ? 0 : (orgData.polling[jobType]?.consecutiveFailures || 0) + 1,
    };
    orgData.lastActivity = Date.now();
  }

  /**
   * Record webhook event
   * @param {string} organizationId
   * @param {string} eventType
   * @param {string} status - 'processed', 'rejected', 'error'
   */
  recordWebhook(organizationId, eventType, status) {
    this.increment("webhooks", "received");

    if (status === "processed") {
      this.increment("webhooks", "processed");
    } else if (status === "rejected") {
      this.increment("webhooks", "rejected");
    }

    if (organizationId) {
      if (!this.orgMetrics.has(organizationId)) {
        this.orgMetrics.set(organizationId, {
          polling: {},
          webhooks: { received: 0, processed: 0 },
          lastActivity: Date.now(),
        });
      }

      const orgData = this.orgMetrics.get(organizationId);
      orgData.webhooks.received++;
      if (status === "processed") {
        orgData.webhooks.processed++;
      }
      orgData.lastActivity = Date.now();
    }
  }

  /**
   * Record Azure DevOps API call
   * @param {string} operation - e.g., 'getBuilds', 'getPullRequests'
   * @param {boolean} success
   * @param {number} statusCode - HTTP status code (optional)
   * @param {number} durationMs - Call duration (optional)
   */
  recordAzureDevOpsCall(operation, success, statusCode = null, durationMs = null) {
    this.increment("azureDevOps", "calls");

    if (success) {
      this.increment("azureDevOps", "success");
    } else {
      this.increment("azureDevOps", "errors");

      if (statusCode === 429) {
        this.increment("azureDevOps", "rateLimited");
      }
    }
  }

  /**
   * Record AI provider call
   * @param {string} provider - e.g., 'openai', 'groq', 'gemini'
   * @param {boolean} success
   * @param {number} durationMs
   */
  recordAICall(provider, success, durationMs = null) {
    this.increment("ai", "requests");

    if (success) {
      this.increment("ai", "success");
    } else {
      this.increment("ai", "failures");
    }
  }

  /**
   * Record cache operation
   * @param {boolean} hit - true for hit, false for miss
   */
  recordCacheAccess(hit) {
    if (hit) {
      this.increment("cache", "hits");
    } else {
      this.increment("cache", "misses");
    }
  }

  /**
   * Record an error for recent errors list
   * @param {string} component
   * @param {string} message
   * @param {Object} context
   */
  recordError(component, message, context = {}) {
    this.recentErrors.push({
      timestamp: Date.now(),
      component,
      message,
      context: {
        organizationId: context.organizationId,
        userId: context.userId,
        action: context.action,
      },
    });

    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift();
    }
  }

  /**
   * Get all metrics summary
   * @returns {Object} Metrics snapshot
   */
  getSnapshot() {
    const uptimeMs = Date.now() - this.startTime;

    // Calculate request duration percentiles
    const durations = this.requestDurations.map((r) => r.durationMs).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

    return {
      uptime: {
        ms: uptimeMs,
        formatted: this.formatUptime(uptimeMs),
      },
      counters: { ...this.counters },
      requestLatency: {
        samples: durations.length,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
      },
      organizationCount: this.orgMetrics.size,
      recentErrorCount: this.recentErrors.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get metrics for a specific organization
   * @param {string} organizationId
   * @returns {Object|null}
   */
  getOrgMetrics(organizationId) {
    return this.orgMetrics.get(organizationId) || null;
  }

  /**
   * Get polling health summary
   * @returns {Object}
   */
  getPollingHealth() {
    const orgsWithIssues = [];
    const now = Date.now();
    const staleThresholdMs = 5 * 60 * 1000; // 5 minutes

    for (const [orgId, data] of this.orgMetrics.entries()) {
      for (const [jobType, job] of Object.entries(data.polling)) {
        if (job.consecutiveFailures >= 3) {
          orgsWithIssues.push({
            organizationId: orgId,
            jobType,
            issue: "consecutive_failures",
            count: job.consecutiveFailures,
            lastError: job.lastError,
          });
        } else if (job.lastRun && now - job.lastRun > staleThresholdMs) {
          orgsWithIssues.push({
            organizationId: orgId,
            jobType,
            issue: "stale",
            lastRunAgo: now - job.lastRun,
          });
        }
      }
    }

    return {
      healthy: orgsWithIssues.length === 0,
      activeOrganizations: this.orgMetrics.size,
      issues: orgsWithIssues,
      globalStats: {
        totalRuns: this.counters.polling.runs,
        successRate:
          this.counters.polling.runs > 0
            ? ((this.counters.polling.success / this.counters.polling.runs) * 100).toFixed(1) + "%"
            : "N/A",
      },
    };
  }

  /**
   * Get recent errors for debugging
   * @param {number} limit
   * @returns {Array}
   */
  getRecentErrors(limit = 10) {
    return this.recentErrors.slice(-limit);
  }

  /**
   * Format uptime as human-readable string
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  /**
   * Reset all metrics (for testing)
   */
  reset() {
    this.startTime = Date.now();
    this.counters = {
      requests: { total: 0, success: 0, errors: 0 },
      polling: { runs: 0, success: 0, failures: 0 },
      webhooks: { received: 0, processed: 0, rejected: 0 },
      azureDevOps: { calls: 0, success: 0, errors: 0, rateLimited: 0 },
      ai: { requests: 0, success: 0, failures: 0 },
      cache: { hits: 0, misses: 0 },
    };
    this.orgMetrics.clear();
    this.requestDurations = [];
    this.recentErrors = [];
  }
}

// Singleton export
export const metrics = new MetricsCollector();
export default metrics;
