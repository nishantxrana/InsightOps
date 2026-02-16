/**
 * OTP Configuration
 * Centralized configuration for OTP-based authentication
 */

export const OTP_CONFIG = {
  // OTP validity period (in minutes)
  OTP_EXPIRY_MINUTES: 10,

  // Session TTL - auto-delete expired pending signups/resets (in seconds)
  SESSION_TTL_SECONDS: 900, // 15 minutes

  // Maximum verification attempts before session expires
  MAX_VERIFICATION_ATTEMPTS: 3,

  // Cooldown period between resend requests (in seconds)
  RESEND_COOLDOWN_SECONDS: 60,

  // OTP format
  OTP_LENGTH: 6,
  OTP_MIN: 100000,
  OTP_MAX: 999999,
};

// Helper functions for time calculations
export const OTP_HELPERS = {
  // Get OTP expiry timestamp
  getOTPExpiry: () => Date.now() + OTP_CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000,

  // Get session TTL for MongoDB
  getSessionTTL: () => OTP_CONFIG.SESSION_TTL_SECONDS,

  // Get resend cooldown in milliseconds
  getResendCooldown: () => OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000,

  // Check if enough time has passed for resend
  canResend: (createdAt) => {
    const timeSinceCreation = Date.now() - createdAt.getTime();
    return timeSinceCreation >= OTP_HELPERS.getResendCooldown();
  },

  // Get remaining wait time for resend (in seconds)
  getResendWaitTime: (createdAt) => {
    const timeSinceCreation = Date.now() - createdAt.getTime();
    const cooldown = OTP_HELPERS.getResendCooldown();
    return Math.ceil((cooldown - timeSinceCreation) / 1000);
  },
};
