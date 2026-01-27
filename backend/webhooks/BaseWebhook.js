import { logger } from "../utils/logger.js";
import { Organization } from "../models/Organization.js";

/**
 * Base webhook class with deduplication and org validation
 */
class BaseWebhook {
  constructor() {
    this.recentEvents = new Map(); // dedupeKey -> { timestamp, userId }
    this.DEDUPE_WINDOW = 60000; // 60 seconds

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanupOldEntries(), 300000);
  }

  /**
   * Validate organization exists and is active
   * Returns { valid: true, org } or { valid: false, error, statusCode }
   */
  async validateOrganization(organizationId, res) {
    if (!organizationId) {
      logger.error("Webhook called without organizationId", {
        action: "webhook-validation",
        status: "rejected",
      });
      return {
        valid: false,
        error: "organizationId is required",
        statusCode: 400,
      };
    }

    // Check if organization exists and is active
    const org = await Organization.findById(organizationId).lean();

    if (!org) {
      logger.error("Webhook received for non-existent organization", {
        organizationId,
        action: "webhook-validation",
        status: "rejected",
      });
      return {
        valid: false,
        error: "Organization not found",
        statusCode: 404,
      };
    }

    if (org.isActive === false) {
      logger.warn("Webhook received for inactive (soft-deleted) organization", {
        organizationId,
        orgName: org.name,
        action: "webhook-validation",
        status: "rejected",
      });
      return {
        valid: false,
        error: "Organization is inactive. Webhooks are disabled for deactivated organizations.",
        statusCode: 410, // Gone
      };
    }

    return { valid: true, org };
  }

  /**
   * Helper to send org validation error response
   */
  sendOrgValidationError(res, validation) {
    return res.status(validation.statusCode).json({
      error: validation.error,
      code: "ORGANIZATION_VALIDATION_FAILED",
    });
  }

  /**
   * Check if event is duplicate and mark as processed if not
   */
  isDuplicate(eventId, userId = null, eventType = "event") {
    const dedupeKey = `${userId || "global"}-${eventType}-${eventId}`;
    const lastProcessed = this.recentEvents.get(dedupeKey);

    if (lastProcessed && Date.now() - lastProcessed.timestamp < this.DEDUPE_WINDOW) {
      const timeSince = Date.now() - lastProcessed.timestamp;
      logger.info("Duplicate webhook ignored", {
        eventId,
        eventType,
        userId: userId || "global",
        timeSinceLastProcessed: timeSince,
        dedupeWindow: this.DEDUPE_WINDOW,
      });
      return { isDuplicate: true, timeSince };
    }

    // Mark as processed
    this.recentEvents.set(dedupeKey, {
      timestamp: Date.now(),
      userId: userId || "global",
      eventType,
    });

    return { isDuplicate: false };
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanupOldEntries() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.recentEvents.entries()) {
      if (now - value.timestamp > this.DEDUPE_WINDOW * 2) {
        // Keep 2x window
        this.recentEvents.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} old webhook entries from deduplication cache`);
    }
  }

  /**
   * Helper to create duplicate response
   */
  createDuplicateResponse(eventId, eventType, timeSince) {
    return {
      message: "Duplicate webhook ignored",
      eventId,
      eventType,
      timeSinceLastProcessed: timeSince,
      timestamp: new Date().toISOString(),
    };
  }
}

export default BaseWebhook;
