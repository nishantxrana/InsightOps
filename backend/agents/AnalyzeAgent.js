import LightweightAgent from './LightweightAgent.js';
import { logger } from '../utils/logger.js';
import { freeModelRouter } from '../ai/FreeModelRouter.js';

/**
 * AnalyzeAgent - Analyzes patterns and generates insights
 */
class AnalyzeAgent extends LightweightAgent {
  constructor() {
    super({
      type: 'analyze',
      name: 'AnalyzeAgent',
      capabilities: ['analyze_patterns', 'generate_insights', 'predict_issues']
    });
  }

  /**
   * Analyze build failure with context
   */
  async analyzeBuildFailure(build, timeline, logs, context = {}) {
    const task = {
      type: 'build_analysis',
      category: 'build',
      description: this.extractErrorSummary(timeline),
      data: { build, timeline, logs, context }
    };

    const result = await this.execute(task);
    
    // If rule-based, return immediately
    if (result.result?.solution) {
      return result.result.solution;
    }

    // Otherwise use AI for detailed analysis
    return await this.deepAnalyze(build, timeline, logs);
  }

  /**
   * Analyze sprint health
   */
  async analyzeSprintHealth(workItems) {
    const metrics = this.calculateSprintMetrics(workItems);
    
    const task = {
      type: 'sprint_analysis',
      category: 'workitem',
      description: this.generateMetricsSummary(metrics),
      data: { workItems, metrics }
    };

    const result = await this.execute(task);
    
    return {
      metrics,
      insights: result.result?.solution || 'Sprint analysis complete',
      risks: this.identifyRisks(metrics)
    };
  }

  /**
   * Analyze PR complexity
   */
  async analyzePRComplexity(pr, changes) {
    const complexity = this.calculatePRComplexity(changes);
    
    return {
      complexity,
      recommendation: this.getPRRecommendation(complexity),
      estimatedReviewTime: this.estimateReviewTime(complexity)
    };
  }

  /**
   * Deep AI analysis (when rules don't match)
   */
  async deepAnalyze(build, timeline, logs) {
    const errorSummary = this.extractErrorSummary(timeline);
    
    const prompt = `Analyze this build failure and provide specific solutions:

Build: ${build.definition?.name} #${build.buildNumber}
Errors: ${errorSummary}

Provide:
1. Root cause
2. Specific fix
3. Prevention steps`;

    const analysis = await freeModelRouter.query({
      prompt,
      complexity: 'medium',
      maxTokens: 400
    });

    return analysis;
  }

  /**
   * Calculate sprint metrics
   */
  calculateSprintMetrics(workItems) {
    const total = workItems.length;
    const byState = {};
    const byAssignee = {};
    const unassigned = [];
    const blocked = [];
    const overdue = [];

    workItems.forEach(item => {
      const state = item.fields?.['System.State'] || 'Unknown';
      const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
      
      byState[state] = (byState[state] || 0) + 1;
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;

      if (assignee === 'Unassigned') unassigned.push(item);
      if (state === 'Blocked') blocked.push(item);
      
      const dueDate = item.fields?.['Microsoft.VSTS.Scheduling.DueDate'];
      if (dueDate && new Date(dueDate) < new Date()) {
        overdue.push(item);
      }
    });

    return {
      total,
      byState,
      byAssignee,
      unassigned: unassigned.length,
      blocked: blocked.length,
      overdue: overdue.length,
      completionRate: byState['Closed'] ? (byState['Closed'] / total * 100).toFixed(1) : 0
    };
  }

  /**
   * Generate metrics summary
   */
  generateMetricsSummary(metrics) {
    const issues = [];
    
    if (metrics.unassigned > 0) {
      issues.push(`${metrics.unassigned} unassigned items`);
    }
    if (metrics.blocked > 0) {
      issues.push(`${metrics.blocked} blocked items`);
    }
    if (metrics.overdue > 0) {
      issues.push(`${metrics.overdue} overdue items`);
    }

    return issues.length > 0 ? issues.join(', ') : 'Sprint healthy';
  }

  /**
   * Identify sprint risks
   */
  identifyRisks(metrics) {
    const risks = [];

    if (metrics.blocked > 0) {
      risks.push({
        type: 'blockers',
        severity: 'high',
        count: metrics.blocked,
        message: `${metrics.blocked} blocked items need immediate attention`
      });
    }

    if (metrics.unassigned > metrics.total * 0.2) {
      risks.push({
        type: 'unassigned',
        severity: 'medium',
        count: metrics.unassigned,
        message: `${metrics.unassigned} items unassigned (${(metrics.unassigned / metrics.total * 100).toFixed(0)}%)`
      });
    }

    if (metrics.overdue > 0) {
      risks.push({
        type: 'overdue',
        severity: 'high',
        count: metrics.overdue,
        message: `${metrics.overdue} items past due date`
      });
    }

    return risks;
  }

  /**
   * Calculate PR complexity
   */
  calculatePRComplexity(changes) {
    if (!changes?.changeEntries) {
      return { level: 'unknown', score: 0 };
    }

    const files = changes.changeEntries.length;
    const additions = changes.summary?.addedFiles || 0;
    const modifications = changes.summary?.modifiedFiles || 0;
    const deletions = changes.summary?.deletedFiles || 0;

    const score = files + (additions * 2) + modifications + (deletions * 0.5);

    let level;
    if (score < 10) level = 'simple';
    else if (score < 50) level = 'moderate';
    else if (score < 200) level = 'complex';
    else level = 'very_complex';

    return { level, score, files, additions, modifications, deletions };
  }

  /**
   * Get PR recommendation based on complexity
   */
  getPRRecommendation(complexity) {
    switch (complexity.level) {
      case 'simple':
        return 'Quick review recommended';
      case 'moderate':
        return 'Standard review process';
      case 'complex':
        return 'Thorough review needed, consider multiple reviewers';
      case 'very_complex':
        return 'Consider splitting into smaller PRs for easier review';
      default:
        return 'Review as needed';
    }
  }

  /**
   * Estimate review time
   */
  estimateReviewTime(complexity) {
    const baseTime = 15; // minutes
    const timePerFile = 5; // minutes
    
    const estimated = baseTime + (complexity.files * timePerFile);
    
    if (estimated < 30) return '15-30 minutes';
    if (estimated < 60) return '30-60 minutes';
    if (estimated < 120) return '1-2 hours';
    return '2+ hours';
  }

  /**
   * Extract error summary from timeline
   */
  extractErrorSummary(timeline) {
    const failedJobs = timeline?.records?.filter(r => 
      r.result === 'failed'
    ) || [];

    return failedJobs.map(job => {
      const issues = job.issues?.map(i => i.message).join('; ') || 'No details';
      return `${job.name}: ${issues}`;
    }).join('\n') || 'No error details available';
  }
}

// Export singleton instance
export const analyzeAgent = new AnalyzeAgent();
export default analyzeAgent;
