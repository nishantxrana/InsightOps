import rateLimit from "express-rate-limit";

/**
 * Rate limiter for OTP request endpoints
 * Prevents email bombing and resource exhaustion
 *
 * Limits: 5 OTP requests per IP per hour
 */
export const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  message: {
    error: "Too many OTP requests from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests (only count failed/repeated attempts)
  skipSuccessfulRequests: false,
  // Use IP address as key
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});
