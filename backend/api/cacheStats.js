import express from 'express';
import { cacheManager } from '../cache/CacheManager.js';
import { rateLimiter } from '../utils/RateLimiter.js';
import { freeModelRouter } from '../ai/FreeModelRouter.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication
router.use(authenticate);

/**
 * Get cache statistics
 */
router.get('/cache-stats', (req, res) => {
  try {
    const stats = cacheManager.getAllStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get rate limiter statistics
 */
router.get('/rate-limits', (req, res) => {
  try {
    const stats = rateLimiter.getAllStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get model router statistics
 */
router.get('/router-stats', (req, res) => {
  try {
    const stats = freeModelRouter.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear specific cache
 */
router.post('/cache/clear/:cacheName', (req, res) => {
  try {
    const { cacheName } = req.params;
    cacheManager.clear(cacheName);
    res.json({
      success: true,
      message: `Cache ${cacheName} cleared`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear all caches
 */
router.post('/cache/clear-all', (req, res) => {
  try {
    cacheManager.clearAll();
    res.json({
      success: true,
      message: 'All caches cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
