import crypto from "crypto";

/**
 * Generate a cryptographically secure 6-digit OTP
 * @returns {string} 6-digit numeric OTP
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}
