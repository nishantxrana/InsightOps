import { logger } from '../utils/logger.js';

/**
 * Rule-based decision engine
 * Handles common patterns without AI calls
 */
class RuleEngine {
  constructor() {
    this.rules = new Map();
    this.stats = {
      totalMatches: 0,
      ruleHits: {}
    };
    this.initializeDefaultRules();
  }

  /**
   * Initialize default rules for common scenarios
   */
  initializeDefaultRules() {
    // Build failure rules
    this.addRule({
      id: 'npm-install-failed',
      category: 'build',
      pattern: /npm (install|ci) failed|cannot find module|ENOENT.*package\.json/i,
      action: 'retry_with_clean_cache',
      confidence: 0.9,
      solution: 'Run `npm ci --cache .npm --prefer-offline` to clean install dependencies',
      autoFix: true
    });

    this.addRule({
      id: 'test-timeout',
      category: 'build',
      pattern: /test.*timeout|jasmine.*timeout|jest.*timeout/i,
      action: 'increase_timeout',
      confidence: 0.85,
      solution: 'Increase test timeout in configuration or optimize slow tests',
      autoFix: false
    });

    this.addRule({
      id: 'docker-build-failed',
      category: 'build',
      pattern: /docker build failed|dockerfile.*error|cannot connect to docker/i,
      action: 'check_docker_service',
      confidence: 0.9,
      solution: 'Verify Docker service is running and Dockerfile syntax is correct',
      autoFix: false
    });

    this.addRule({
      id: 'out-of-memory',
      category: 'build',
      pattern: /out of memory|heap.*memory|javascript heap/i,
      action: 'increase_memory',
      confidence: 0.95,
      solution: 'Increase Node.js memory limit: NODE_OPTIONS=--max-old-space-size=4096',
      autoFix: false
    });

    // PR rules
    this.addRule({
      id: 'pr-idle-48h',
      category: 'pr',
      pattern: /idle.*48.*hours?|no activity.*2 days/i,
      action: 'notify_reviewers',
      confidence: 0.95,
      solution: 'Send reminder to assigned reviewers',
      autoFix: true
    });

    this.addRule({
      id: 'pr-idle-72h',
      category: 'pr',
      pattern: /idle.*72.*hours?|no activity.*3 days/i,
      action: 'escalate_to_lead',
      confidence: 0.9,
      solution: 'Escalate to team lead for review assignment',
      autoFix: true
    });

    this.addRule({
      id: 'pr-large-changes',
      category: 'pr',
      pattern: /large.*changes|files changed.*[5-9]\d{2,}|lines.*[1-9]\d{3,}/i,
      action: 'suggest_split',
      confidence: 0.8,
      solution: 'Consider splitting into smaller PRs for easier review',
      autoFix: false
    });

    // Work item rules
    this.addRule({
      id: 'work-item-blocked',
      category: 'workitem',
      pattern: /blocked|blocker|cannot proceed/i,
      action: 'escalate_blocker',
      confidence: 0.95,
      solution: 'Escalate blocker to team lead immediately',
      autoFix: true
    });

    this.addRule({
      id: 'work-item-overdue',
      category: 'workitem',
      pattern: /overdue|past due|missed deadline/i,
      action: 'notify_assignee',
      confidence: 0.9,
      solution: 'Notify assignee and update sprint plan',
      autoFix: true
    });

    this.addRule({
      id: 'work-item-unassigned',
      category: 'workitem',
      pattern: /unassigned|no assignee/i,
      action: 'assign_to_lead',
      confidence: 0.85,
      solution: 'Assign to team lead for delegation',
      autoFix: true
    });

    logger.info(`RuleEngine initialized with ${this.rules.size} rules`);
  }

  /**
   * Add a new rule
   */
  addRule(rule) {
    if (!rule.id || !rule.pattern || !rule.action) {
      throw new Error('Rule must have id, pattern, and action');
    }

    this.rules.set(rule.id, {
      ...rule,
      createdAt: new Date(),
      matchCount: 0
    });

    this.stats.ruleHits[rule.id] = 0;
  }

  /**
   * Match input against rules
   */
  match(input, category = null) {
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    // Filter rules by category if specified
    const rulesToCheck = category
      ? Array.from(this.rules.values()).filter(r => r.category === category)
      : Array.from(this.rules.values());

    // Find all matching rules
    const matches = rulesToCheck
      .filter(rule => rule.pattern.test(inputStr))
      .map(rule => {
        rule.matchCount++;
        this.stats.ruleHits[rule.id]++;
        return rule;
      })
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence

    if (matches.length > 0) {
      this.stats.totalMatches++;
      const bestMatch = matches[0];

      logger.info('Rule matched', {
        ruleId: bestMatch.id,
        confidence: bestMatch.confidence,
        action: bestMatch.action,
        autoFix: bestMatch.autoFix
      });

      return {
        matched: true,
        rule: bestMatch,
        confidence: bestMatch.confidence,
        action: bestMatch.action,
        solution: bestMatch.solution,
        autoFix: bestMatch.autoFix,
        allMatches: matches
      };
    }

    return {
      matched: false,
      confidence: 0,
      action: null,
      solution: null
    };
  }

  /**
   * Check if rule matches with minimum confidence
   */
  matchesWithConfidence(input, minConfidence = 0.7, category = null) {
    const result = this.match(input, category);
    return result.matched && result.confidence >= minConfidence;
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId) {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules for a category
   */
  getRulesByCategory(category) {
    return Array.from(this.rules.values()).filter(r => r.category === category);
  }

  /**
   * Update rule confidence based on feedback
   */
  updateConfidence(ruleId, successful) {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    // Adjust confidence based on success/failure
    if (successful) {
      rule.confidence = Math.min(0.99, rule.confidence + 0.01);
    } else {
      rule.confidence = Math.max(0.5, rule.confidence - 0.05);
    }

    logger.debug(`Updated rule ${ruleId} confidence to ${rule.confidence}`);
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info(`Rule ${ruleId} disabled`);
    }
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info(`Rule ${ruleId} enabled`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalRules: this.rules.size,
      totalMatches: this.stats.totalMatches,
      ruleHits: this.stats.ruleHits,
      topRules: Object.entries(this.stats.ruleHits)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, hits]) => ({ id, hits }))
    };
  }

  /**
   * Export rules for backup
   */
  exportRules() {
    return Array.from(this.rules.entries()).map(([id, rule]) => ({
      id,
      category: rule.category,
      pattern: rule.pattern.source,
      action: rule.action,
      confidence: rule.confidence,
      solution: rule.solution,
      autoFix: rule.autoFix,
      matchCount: rule.matchCount
    }));
  }
}

// Export singleton instance
export const ruleEngine = new RuleEngine();
export default ruleEngine;
