/**
 * Diagnostics and Health API
 * 
 * Provides production-grade health checks and diagnostic endpoints.
 * These endpoints are designed to be:
 * - Fast (no heavy DB queries)
 * - Safe (no secrets exposed)
 * - Useful (actionable information)
 */

import express from 'express';
import mongoose from 'mongoose';
import { metrics } from '../observability/metrics.js';
import { azureDevOpsCache } from '../cache/AzureDevOpsCache.js';
import { logger, logConfig } from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Basic health check (public, for load balancers)
 * Returns 200 if service is running, 503 if unhealthy
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  // Check database connection (with timeout)
  try {
    const dbState = mongoose.connection.readyState;
    health.database = dbState === 1 ? 'connected' : 'disconnected';
    
    if (dbState !== 1) {
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.database = 'error';
  }

  health.responseTimeMs = Date.now() - startTime;
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Detailed health check (authenticated, for operators)
 * Includes polling health, cache stats, and metrics summary
 */
router.get('/health/detailed', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      logLevel: logConfig.level
    };

    // Database health
    const dbState = mongoose.connection.readyState;
    health.database = {
      status: dbState === 1 ? 'connected' : 'disconnected',
      readyState: dbState
    };
    
    if (dbState !== 1) {
      health.status = 'degraded';
    }

    // Cache health
    const cacheStats = azureDevOpsCache.getStats();
    health.cache = {
      status: 'healthy',
      ...cacheStats
    };

    // Polling health
    const pollingHealth = metrics.getPollingHealth();
    health.polling = {
      status: pollingHealth.healthy ? 'healthy' : 'degraded',
      ...pollingHealth
    };
    
    if (!pollingHealth.healthy) {
      health.status = health.status === 'healthy' ? 'degraded' : health.status;
    }

    // Metrics summary
    const metricsSnapshot = metrics.getSnapshot();
    health.metrics = {
      requests: metricsSnapshot.counters.requests,
      polling: metricsSnapshot.counters.polling,
      webhooks: metricsSnapshot.counters.webhooks,
      azureDevOps: metricsSnapshot.counters.azureDevOps,
      requestLatency: metricsSnapshot.requestLatency
    };

    health.responseTimeMs = Date.now() - startTime;
    
    res.json(health);
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Metrics endpoint (authenticated)
 * Full metrics snapshot for monitoring
 */
router.get('/metrics', authenticate, (req, res) => {
  try {
    const snapshot = metrics.getSnapshot();
    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    logger.error('Metrics fetch failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

/**
 * Polling status per organization (authenticated)
 */
router.get('/polling-status', authenticate, (req, res) => {
  try {
    const pollingHealth = metrics.getPollingHealth();
    res.json({
      success: true,
      data: pollingHealth
    });
  } catch (error) {
    logger.error('Polling status fetch failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch polling status'
    });
  }
});

/**
 * Recent errors (authenticated, for debugging)
 */
router.get('/recent-errors', authenticate, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const errors = metrics.getRecentErrors(Math.min(limit, 50));
    
    res.json({
      success: true,
      data: {
        count: errors.length,
        errors
      }
    });
  } catch (error) {
    logger.error('Recent errors fetch failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent errors'
    });
  }
});

/**
 * Organization-specific metrics (authenticated)
 */
router.get('/org/:organizationId/metrics', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const orgMetrics = metrics.getOrgMetrics(organizationId);
    
    if (!orgMetrics) {
      return res.json({
        success: true,
        data: null,
        message: 'No metrics recorded for this organization yet'
      });
    }
    
    res.json({
      success: true,
      data: orgMetrics
    });
  } catch (error) {
    logger.error('Org metrics fetch failed', { 
      error: error.message,
      organizationId: req.params.organizationId 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization metrics'
    });
  }
});

/**
 * Format uptime as human-readable string
 */
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

export default router;

