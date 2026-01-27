/**
 * Request metrics middleware
 * 
 * Tracks request duration and records to metrics collector.
 * Lightweight - no blocking operations.
 */

import { metrics } from '../observability/metrics.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to track request duration and record metrics
 * Should be added BEFORE other middleware
 */
export function requestMetrics(req, res, next) {
  const startTime = process.hrtime.bigint();
  
  // Skip metrics for health checks (high volume, not useful)
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }
  
  // Capture response on finish
  res.on('finish', () => {
    try {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      // Record to metrics
      metrics.recordRequestDuration(req.path, Math.round(durationMs), res.statusCode);
      
      // Log slow requests (>3s) as warnings
      if (durationMs > 3000) {
        logger.warn('Slow request detected', {
          component: 'request-metrics',
          path: req.path,
          method: req.method,
          durationMs: Math.round(durationMs),
          statusCode: res.statusCode,
          organizationId: req.organizationId,
          userId: req.user?._id?.toString()
        });
      }
    } catch (error) {
      // Silent fail - metrics should never break requests
    }
  });
  
  next();
}

export default requestMetrics;

