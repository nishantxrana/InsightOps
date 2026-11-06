import rateLimit from "express-rate-limit";
import { rateLimits } from "../config/env.js";

/**
 * Per-user rate limiter for interactive AI feature routes.
 * Uses RATE_LIMIT_AI_MAX (rateLimits.aiMax). Does not replace /ai/test limiter.
 */
export const aiFeatureRateLimiter = rateLimit({
  windowMs: rateLimits.windowMs || 15 * 60 * 1000,
  max: rateLimits.aiMax || 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id?.toString?.() || req.user?.id || req.ip;
    const orgId = req.organization?._id?.toString?.() || req.headers["x-organization-id"] || "";
    return `ai-feature:${userId}:${orgId}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many AI requests. Please wait and try again.",
        hint: "Wait a moment and try again. Your provider is rate limiting requests.",
      },
    });
  },
});
