import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

/**
 * Pattern Tracker - Learns from successful and failed outcomes
 * All operations are scoped by organizationId for multi-tenant isolation
 */
class PatternTracker {
  constructor() {
    this.stats = {
      patternsDetected: 0,
      successTracked: 0,
      failuresTracked: 0,
    };
  }

  /**
   * Track successful outcome
   * @param {Object} task - Task object with type, category, description
   * @param {string} solution - The solution that worked
   * @param {Object} metadata - Additional metadata
   * @param {string} organizationId - Required for multi-tenant isolation
   */
  async trackSuccess(task, solution, metadata = {}, organizationId = null) {
    try {
      // Skip tracking if no organizationId (required for multi-tenant)
      if (!organizationId) {
        logger.warn(
          "trackSuccess called without organizationId - skipping to prevent data leakage"
        );
        return null;
      }

      const Pattern = mongoose.model("Pattern");

      // Create pattern signature (includes orgId for uniqueness)
      const signature = this.createSignature(task, solution, organizationId);

      // Find or create pattern - ALWAYS filter by organizationId
      let pattern = await Pattern.findOne({ signature, organizationId });

      if (pattern) {
        // Update existing pattern
        pattern.successCount++;
        pattern.lastSeen = new Date();
        pattern.confidence = this.calculateConfidence(pattern);
        pattern.examples.push({
          task: task.description,
          solution: solution,
          timestamp: new Date(),
        });

        // Keep only last 5 examples
        if (pattern.examples.length > 5) {
          pattern.examples = pattern.examples.slice(-5);
        }
      } else {
        // Create new pattern with organizationId
        pattern = new Pattern({
          organizationId,
          signature,
          type: task.type,
          category: task.category,
          pattern: this.extractPattern(task),
          solution,
          successCount: 1,
          failureCount: 0,
          confidence: 0.5,
          examples: [
            {
              task: task.description,
              solution: solution,
              timestamp: new Date(),
            },
          ],
          metadata,
          discoveredAt: new Date(),
          lastSeen: new Date(),
        });

        this.stats.patternsDetected++;
      }

      await pattern.save();
      this.stats.successTracked++;

      logger.debug("Success tracked", {
        signature,
        organizationId,
        successCount: pattern.successCount,
        confidence: pattern.confidence,
      });

      return pattern;
    } catch (error) {
      logger.error("Failed to track success:", error);
      return null;
    }
  }

  /**
   * Track failed outcome
   * @param {Object} task - Task object
   * @param {Error} error - The error that occurred
   * @param {Object} metadata - Additional metadata
   * @param {string} organizationId - Required for multi-tenant isolation
   */
  async trackFailure(task, error, metadata = {}, organizationId = null) {
    try {
      // Skip tracking if no organizationId (required for multi-tenant)
      if (!organizationId) {
        logger.warn(
          "trackFailure called without organizationId - skipping to prevent data leakage"
        );
        return null;
      }

      const Pattern = mongoose.model("Pattern");
      const signature = this.createSignature(task, null, organizationId);

      // ALWAYS filter by organizationId
      let pattern = await Pattern.findOne({ signature, organizationId });

      if (pattern) {
        pattern.failureCount++;
        pattern.lastSeen = new Date();
        pattern.confidence = this.calculateConfidence(pattern);
        await pattern.save();
      }

      this.stats.failuresTracked++;

      logger.debug("Failure tracked", {
        signature,
        organizationId,
        failureCount: pattern?.failureCount || 0,
      });

      return pattern;
    } catch (error) {
      logger.error("Failed to track failure:", error);
      return null;
    }
  }

  /**
   * Create pattern signature (includes orgId for uniqueness across orgs)
   */
  createSignature(task, solution, organizationId = null) {
    const taskKey = this.normalizeText(task.description || task.type);
    const solutionKey = solution ? this.normalizeText(solution) : "";
    // Include orgId in signature to ensure patterns are unique per org
    const orgPrefix = organizationId ? `${organizationId}:` : "";
    return `${orgPrefix}${task.type}:${taskKey}:${solutionKey}`.substring(0, 200);
  }

  /**
   * Extract pattern from task
   */
  extractPattern(task) {
    const text = task.description || "";

    // Extract key terms
    const keywords =
      text.toLowerCase().match(/\b(failed|error|timeout|blocked|npm|test|build|deploy)\b/g) || [];

    return keywords.join(" ");
  }

  /**
   * Normalize text for comparison
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 100);
  }

  /**
   * Calculate confidence based on success/failure ratio
   */
  calculateConfidence(pattern) {
    const total = pattern.successCount + pattern.failureCount;
    if (total === 0) return 0.5;

    const successRate = pattern.successCount / total;

    // Boost confidence with more data points
    const dataBoost = Math.min(total / 10, 1);

    return Math.min(0.95, successRate * 0.7 + dataBoost * 0.3);
  }

  /**
   * Get patterns by type - scoped to organization
   * @param {string} organizationId - Required for multi-tenant isolation
   * @param {string} type - Optional type filter
   * @param {number} minConfidence - Minimum confidence threshold
   */
  async getPatterns(organizationId, type = null, minConfidence = 0.7) {
    try {
      // Skip if no organizationId (required for multi-tenant)
      if (!organizationId) {
        logger.warn(
          "getPatterns called without organizationId - returning empty to prevent data leakage"
        );
        return [];
      }

      const Pattern = mongoose.model("Pattern");
      const query = {
        organizationId,
        confidence: { $gte: minConfidence },
      };

      if (type) {
        query.type = type;
      }

      return await Pattern.find(query).sort({ confidence: -1, successCount: -1 }).limit(20);
    } catch (error) {
      logger.error("Failed to get patterns:", error);
      return [];
    }
  }

  /**
   * Find similar pattern - scoped to organization
   * @param {Object} task - Task to find similar pattern for
   * @param {string} organizationId - Required for multi-tenant isolation
   */
  async findSimilar(task, organizationId = null) {
    try {
      // Skip if no organizationId (required for multi-tenant)
      if (!organizationId) {
        logger.warn(
          "findSimilar called without organizationId - returning null to prevent data leakage"
        );
        return null;
      }

      const Pattern = mongoose.model("Pattern");
      const taskPattern = this.extractPattern(task);

      // Find patterns with similar keywords - ALWAYS filter by organizationId
      const patterns = await Pattern.find({
        organizationId,
        type: task.type,
        confidence: { $gte: 0.7 },
      }).limit(10);

      // Score by similarity
      const scored = patterns.map((p) => ({
        pattern: p,
        similarity: this.calculateSimilarity(taskPattern, p.pattern),
      }));

      // Sort by similarity
      scored.sort((a, b) => b.similarity - a.similarity);

      return scored.length > 0 && scored[0].similarity > 0.5 ? scored[0].pattern : null;
    } catch (error) {
      logger.error("Failed to find similar pattern:", error);
      return null;
    }
  }

  /**
   * Calculate similarity between patterns
   */
  calculateSimilarity(pattern1, pattern2) {
    const words1 = new Set(pattern1.split(" "));
    const words2 = new Set(pattern2.split(" "));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const Pattern = mongoose.model("Pattern");
      const total = await Pattern.countDocuments();
      const highConfidence = await Pattern.countDocuments({ confidence: { $gte: 0.8 } });

      return {
        ...this.stats,
        totalPatterns: total,
        highConfidencePatterns: highConfidence,
      };
    } catch (error) {
      logger.error("Failed to get stats:", error);
      return this.stats;
    }
  }

  /**
   * Cleanup old patterns - scoped to organization or all if admin
   * @param {number} olderThanDays - Days threshold
   * @param {string} organizationId - If provided, cleanup only for this org. If null, cleanup all (admin only)
   */
  async cleanup(olderThanDays = 90, organizationId = null) {
    try {
      const Pattern = mongoose.model("Pattern");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const query = {
        lastSeen: { $lt: cutoffDate },
        successCount: { $lt: 3 }, // Keep patterns with at least 3 successes
      };

      // Scope to organization if provided
      if (organizationId) {
        query.organizationId = organizationId;
      }

      const result = await Pattern.deleteMany(query);

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old patterns`, {
          organizationId: organizationId || "all",
        });
      }

      return result.deletedCount;
    } catch (error) {
      logger.error("Failed to cleanup patterns:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const patternTracker = new PatternTracker();
export default patternTracker;
