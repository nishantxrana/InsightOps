import { logger } from '../utils/logger.js';
import { ruleEngine } from '../agents/RuleEngine.js';
import { patternTracker } from './PatternTracker.js';

/**
 * Rule Generator - Automatically generates rules from learned patterns
 */
class RuleGenerator {
  constructor() {
    this.generatedRules = new Set();
  }

  /**
   * Generate rules from high-confidence patterns
   */
  async generateRules(minConfidence = 0.85, minSuccessCount = 5) {
    try {
      const patterns = await patternTracker.getPatterns(null, minConfidence);
      
      let generated = 0;
      
      for (const pattern of patterns) {
        if (pattern.successCount >= minSuccessCount) {
          const ruleId = `learned-${pattern.signature.substring(0, 30)}`;
          
          // Skip if already generated
          if (this.generatedRules.has(ruleId)) {
            continue;
          }
          
          // Generate rule
          const rule = this.createRule(pattern, ruleId);
          
          if (rule) {
            try {
              ruleEngine.addRule(rule);
              this.generatedRules.add(ruleId);
              generated++;
              
              logger.info('Generated rule from pattern', {
                ruleId,
                confidence: pattern.confidence,
                successCount: pattern.successCount
              });
            } catch (error) {
              logger.debug('Rule already exists or invalid:', ruleId);
            }
          }
        }
      }
      
      logger.info(`Generated ${generated} new rules from patterns`);
      return generated;
    } catch (error) {
      logger.error('Failed to generate rules:', error);
      return 0;
    }
  }

  /**
   * Create rule from pattern
   */
  createRule(pattern, ruleId) {
    try {
      // Extract keywords for pattern matching
      const keywords = pattern.pattern.split(' ').filter(k => k.length > 2);
      
      if (keywords.length === 0) {
        return null;
      }
      
      // Create regex pattern
      const regexPattern = keywords.map(k => `${k}.*`).join('|');
      
      return {
        id: ruleId,
        category: pattern.category || pattern.type,
        pattern: new RegExp(regexPattern, 'i'),
        action: this.extractAction(pattern.solution),
        confidence: pattern.confidence,
        solution: pattern.solution,
        autoFix: pattern.confidence > 0.9,
        source: 'learned',
        learnedFrom: pattern.signature
      };
    } catch (error) {
      logger.error('Failed to create rule:', error);
      return null;
    }
  }

  /**
   * Extract action from solution
   */
  extractAction(solution) {
    if (!solution) return 'apply_learned_solution';
    
    const lower = solution.toLowerCase();
    
    if (lower.includes('retry') || lower.includes('run')) {
      return 'retry_with_solution';
    }
    if (lower.includes('escalate')) {
      return 'escalate';
    }
    if (lower.includes('notify')) {
      return 'notify';
    }
    
    return 'apply_learned_solution';
  }

  /**
   * Review and update rules based on performance
   */
  async reviewRules() {
    try {
      const ruleStats = ruleEngine.getStats();
      let updated = 0;
      
      // Check each learned rule
      for (const ruleId of this.generatedRules) {
        const rule = ruleEngine.getRule(ruleId);
        if (!rule) continue;
        
        const hits = ruleStats.ruleHits[ruleId] || 0;
        
        // If rule is being used, boost confidence
        if (hits > 5) {
          ruleEngine.updateConfidence(ruleId, true);
          updated++;
        }
        
        // If rule has low confidence and no hits, consider removing
        if (rule.confidence < 0.6 && hits === 0) {
          ruleEngine.disableRule(ruleId);
          this.generatedRules.delete(ruleId);
          logger.info(`Disabled low-performing rule: ${ruleId}`);
        }
      }
      
      if (updated > 0) {
        logger.info(`Updated ${updated} rule confidences`);
      }
      
      return updated;
    } catch (error) {
      logger.error('Failed to review rules:', error);
      return 0;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      generatedRules: this.generatedRules.size,
      ruleIds: Array.from(this.generatedRules)
    };
  }
}

// Export singleton instance
export const ruleGenerator = new RuleGenerator();
export default ruleGenerator;
