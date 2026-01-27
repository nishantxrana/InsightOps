import express from "express";
import { cacheManager } from "../cache/CacheManager.js";
import { azureDevOpsCache } from "../cache/AzureDevOpsCache.js";
import { rateLimiter } from "../utils/RateLimiter.js";
import { freeModelRouter } from "../ai/FreeModelRouter.js";
import { authenticate } from "../middleware/auth.js";
import { createRequestLogger } from "../utils/logger.js";

const router = express.Router();

// Apply authentication
router.use(authenticate);

/**
 * Get cache statistics
 */
router.get("/cache-stats", (req, res) => {
  const log = createRequestLogger(req, "cache-api");
  try {
    const stats = cacheManager.getAllStats();
    const azureDevOpsStats = azureDevOpsCache.getStats();
    res.json({
      success: true,
      stats: {
        ...stats,
        azureDevOps: azureDevOpsStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Failed to get cache stats", { error: error.message, action: "get-cache-stats" });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get rate limiter statistics
 */
router.get("/rate-limits", (req, res) => {
  const log = createRequestLogger(req, "cache-api");
  try {
    const stats = rateLimiter.getAllStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Failed to get rate limit stats", {
      error: error.message,
      action: "get-rate-limits",
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get model router statistics
 */
router.get("/router-stats", (req, res) => {
  const log = createRequestLogger(req, "cache-api");
  try {
    const stats = freeModelRouter.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Failed to get router stats", { error: error.message, action: "get-router-stats" });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clear specific cache
 */
router.post("/cache/clear/:cacheName", (req, res) => {
  const log = createRequestLogger(req, "cache-api");
  try {
    const { cacheName } = req.params;
    cacheManager.clear(cacheName);
    log.info("Cache cleared", { action: "clear-cache", cacheName });
    res.json({
      success: true,
      message: `Cache ${cacheName} cleared`,
    });
  } catch (error) {
    log.error("Failed to clear cache", {
      error: error.message,
      action: "clear-cache",
      cacheName: req.params.cacheName,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clear all caches
 */
router.post("/cache/clear-all", (req, res) => {
  const log = createRequestLogger(req, "cache-api");
  try {
    cacheManager.clearAll();
    log.info("All caches cleared", { action: "clear-all-caches" });
    res.json({
      success: true,
      message: "All caches cleared",
    });
  } catch (error) {
    log.error("Failed to clear all caches", { error: error.message, action: "clear-all-caches" });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
