import rateLimit from "express-rate-limit";

/**
 * Rate limiter for POST /api/ai/test — ~10 requests per minute per authenticated user.
 */
export const aiTestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    ok: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many AI test requests. Please wait a minute and try again.",
      hint: "Wait a moment and try again. Your provider is rate limiting requests.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id?.toString?.() || req.user?.id || req.ip;
    return `ai-test:${userId}`;
  },
});
