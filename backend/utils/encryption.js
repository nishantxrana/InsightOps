import crypto from "crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * Custom error for decryption failures
 * This allows callers to distinguish decryption errors from other errors
 */
export class DecryptionError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "DecryptionError";
    this.originalError = originalError;
  }
}

class SettingsEncryption {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.prefix = "encrypted:AES256:";

    // Get encryption key - REQUIRED, no fallback
    this.encryptionKey = this.getRequiredKey();
  }

  /**
   * Get encryption key from environment - REQUIRED
   * Application will fail to start if key is not set
   */
  getRequiredKey() {
    const key = env.ENCRYPTION_KEY;

    if (!key) {
      const errorMessage = `
========================================================
FATAL: ENCRYPTION_KEY environment variable is not set!
========================================================
The application cannot start without a valid encryption key.

To generate a secure key, run:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Then set it in your environment:
  export ENCRYPTION_KEY=<generated_key>

Or add to your .env file:
  ENCRYPTION_KEY=<generated_key>

This key is required to encrypt/decrypt sensitive data like:
  - Azure DevOps PATs
  - AI API keys
  - Webhook URLs
========================================================
`;
      logger.error(errorMessage);
      throw new Error(
        "ENCRYPTION_KEY environment variable is required but not set. See logs for details."
      );
    }

    // Validate key length
    if (key.length !== this.keyLength * 2) {
      // hex string is 2x byte length
      const errorMessage = `ENCRYPTION_KEY must be exactly ${this.keyLength * 2} hex characters (${this.keyLength} bytes). Got ${key.length} characters.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(key)) {
      const errorMessage = "ENCRYPTION_KEY must be a valid hexadecimal string.";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger.info("Encryption key validated successfully");
    return Buffer.from(key, "hex");
  }

  encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== "string") {
      return plaintext;
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");

      const tag = cipher.getAuthTag();

      // Combine iv + tag + encrypted data
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, "hex")]);

      return this.prefix + combined.toString("base64");
    } catch (error) {
      logger.error("Encryption failed:", { error: error.message });
      // Throw instead of returning plaintext - encryption failure is critical
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt an encrypted value
   * @param {string} encryptedValue - The encrypted value to decrypt
   * @returns {string|null} - Decrypted value, or null if decryption fails
   * @throws {DecryptionError} - If throwOnError is true and decryption fails
   */
  decrypt(encryptedValue, throwOnError = false) {
    if (!this.isEncrypted(encryptedValue)) {
      return encryptedValue;
    }

    try {
      // Remove prefix and decode
      const combined = Buffer.from(encryptedValue.slice(this.prefix.length), "base64");

      // Validate minimum length
      const minLength = this.ivLength + this.tagLength + 1;
      if (combined.length < minLength) {
        throw new Error("Encrypted data is too short - data may be corrupted");
      }

      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      const decryptError = new DecryptionError(
        `Decryption failed - ENCRYPTION_KEY may have changed or data is corrupted`,
        error
      );

      logger.error("Decryption failed", {
        error: error.message,
        hint:
          "This usually means ENCRYPTION_KEY has changed since data was encrypted. " +
          "Re-save the credentials to encrypt with the current key.",
      });

      if (throwOnError) {
        throw decryptError;
      }

      // Return null instead of garbage - callers must handle null
      return null;
    }
  }

  isEncrypted(value) {
    return typeof value === "string" && value.startsWith(this.prefix);
  }

  // Encrypt sensitive fields in settings object
  encryptSensitiveFields(settings) {
    const sensitiveFields = [
      "azureDevOps.personalAccessToken",
      "ai.openaiApiKey",
      "ai.groqApiKey",
      "ai.geminiApiKey",
      "notifications.teamsWebhookUrl",
      "notifications.slackWebhookUrl",
      "notifications.googleChatWebhookUrl",
    ];

    const encrypted = JSON.parse(JSON.stringify(settings));

    for (const fieldPath of sensitiveFields) {
      const value = this.getNestedValue(encrypted, fieldPath);
      if (value && typeof value === "string" && value.trim() !== "" && !this.isEncrypted(value)) {
        this.setNestedValue(encrypted, fieldPath, this.encrypt(value));
      }
    }

    return encrypted;
  }

  // Decrypt sensitive fields in settings object
  decryptSensitiveFields(settings) {
    const decrypted = JSON.parse(JSON.stringify(settings));

    this.traverseAndDecrypt(decrypted);

    return decrypted;
  }

  traverseAndDecrypt(obj) {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        this.traverseAndDecrypt(obj[key]);
      } else if (this.isEncrypted(obj[key])) {
        obj[key] = this.decrypt(obj[key]);
      }
    }
  }

  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

export const settingsEncryption = new SettingsEncryption();

// Export convenience functions
export const encrypt = (plaintext) => settingsEncryption.encrypt(plaintext);
export const decrypt = (encryptedValue) => settingsEncryption.decrypt(encryptedValue);
