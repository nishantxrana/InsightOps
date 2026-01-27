import { logger } from "../utils/logger.js";
import { ruleEngine } from "../agents/RuleEngine.js";
import { patternTracker } from "./PatternTracker.js";
import { Organization } from "../models/Organization.js";

/**
 * Rule Generator - Automatically generates rules from learned patterns
 * Rules are generated per-organization for multi-tenant isolation
 */
class RuleGenerator {
  constructor() {
    // Per-organization generated rules: Map<organizationId, Set<ruleId>>
    this.generatedRulesByOrg = new Map();
  }

  /**
   * Get or create rules set for an organization
   */
  getGeneratedRulesForOrg(organizationId) {
    if (!this.generatedRulesByOrg.has(organizationId)) {
      this.generatedRulesByOrg.set(organizationId, new Set());
    }
    return this.generatedRulesByOrg.get(organizationId);
  }

  /**
   * Generate rules from high-confidence patterns for all organizations
   */
  async generateRules(minConfidence = 0.85, minSuccessCount = 5) {
    try {
      // Get all active organizations
      const organizations = await Organization.find({ isActive: true }).select("_id name").lean();

      let totalGenerated = 0;

      for (const org of organizations) {
        const generated = await this.generateRulesForOrg(
          org._id.toString(),
          minConfidence,
          minSuccessCount
        );
        totalGenerated += generated;
      }

      logger.info(
        `Generated ${totalGenerated} new rules across ${organizations.length} organizations`
      );
      return totalGenerated;
    } catch (error) {
      logger.error("Failed to generate rules:", error);
      return 0;
    }
  }

  /**
   * Generate rules for a specific organization
   */
  async generateRulesForOrg(organizationId, minConfidence = 0.85, minSuccessCount = 5) {
    try {
      const patterns = await patternTracker.getPatterns(organizationId, null, minConfidence);
      const generatedRules = this.getGeneratedRulesForOrg(organizationId);

      let generated = 0;

      for (const pattern of patterns) {
        if (pattern.successCount >= minSuccessCount) {
          // Include orgId in ruleId for uniqueness
          const ruleId = `learned-${organizationId}-${pattern.signature.substring(0, 30)}`;

          // Skip if already generated
          if (generatedRules.has(ruleId)) {
            continue;
          }

          // Generate rule
          const rule = this.createRule(pattern, ruleId, organizationId);

          if (rule) {
            try {
              ruleEngine.addRule(rule);
              generatedRules.add(ruleId);
              generated++;

              logger.info("Generated rule from pattern", {
                ruleId,
                organizationId,
                confidence: pattern.confidence,
                successCount: pattern.successCount,
              });
            } catch (error) {
              logger.debug("Rule already exists or invalid:", ruleId);
            }
          }
        }
      }

      if (generated > 0) {
        logger.info(`Generated ${generated} new rules for org ${organizationId}`);
      }
      return generated;
    } catch (error) {
      logger.error(`Failed to generate rules for org ${organizationId}:`, error);
      return 0;
    }
  }

  /**
   * Create rule from pattern
   */
  createRule(pattern, ruleId, organizationId = null) {
    try {
      // Extract keywords for pattern matching
      const keywords = pattern.pattern.split(" ").filter((k) => k.length > 2);

      if (keywords.length === 0) {
        return null;
      }

      // Create regex pattern
      const regexPattern = keywords.map((k) => `${k}.*`).join("|");

      return {
        id: ruleId,
        organizationId,
        category: pattern.category || pattern.type,
        pattern: new RegExp(regexPattern, "i"),
        action: this.extractAction(pattern.solution),
        confidence: pattern.confidence,
        solution: pattern.solution,
        autoFix: pattern.confidence > 0.9,
        source: "learned",
        learnedFrom: pattern.signature,
      };
    } catch (error) {
      logger.error("Failed to create rule:", error);
      return null;
    }
  }

  /**
   * Extract action from solution
   */
  extractAction(solution) {
    if (!solution) return "apply_learned_solution";

    const lower = solution.toLowerCase();

    if (lower.includes("retry") || lower.includes("run")) {
      return "retry_with_solution";
    }
    if (lower.includes("escalate")) {
      return "escalate";
    }
    if (lower.includes("notify")) {
      return "notify";
    }

    return "apply_learned_solution";
  }

  /**
   * Review and update rules based on performance for all organizations
   */
  async reviewRules() {
    try {
      const ruleStats = ruleEngine.getStats();
      let totalUpdated = 0;

      // Check each organization's learned rules
      for (const [organizationId, generatedRules] of this.generatedRulesByOrg) {
        for (const ruleId of generatedRules) {
          const rule = ruleEngine.getRule(ruleId);
          if (!rule) continue;

          const hits = ruleStats.ruleHits[ruleId] || 0;

          // If rule is being used, boost confidence
          if (hits > 5) {
            ruleEngine.updateConfidence(ruleId, true);
            totalUpdated++;
          }

          // If rule has low confidence and no hits, consider removing
          if (rule.confidence < 0.6 && hits === 0) {
            ruleEngine.disableRule(ruleId);
            generatedRules.delete(ruleId);
            logger.info(`Disabled low-performing rule: ${ruleId}`, { organizationId });
          }
        }
      }

      if (totalUpdated > 0) {
        logger.info(`Updated ${totalUpdated} rule confidences across all organizations`);
      }

      return totalUpdated;
    } catch (error) {
      logger.error("Failed to review rules:", error);
      return 0;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalRules = 0;
    const rulesByOrg = {};

    for (const [organizationId, generatedRules] of this.generatedRulesByOrg) {
      rulesByOrg[organizationId] = generatedRules.size;
      totalRules += generatedRules.size;
    }

    return {
      totalGeneratedRules: totalRules,
      organizationCount: this.generatedRulesByOrg.size,
      rulesByOrg,
    };
  }
}

// Export singleton instance
export const ruleGenerator = new RuleGenerator();
export default ruleGenerator;
