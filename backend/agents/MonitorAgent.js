import LightweightAgent from './LightweightAgent.js';
import { logger } from '../utils/logger.js';
import { cacheManager } from '../cache/CacheManager.js';

/**
 * MonitorAgent - Observes Azure DevOps state and detects changes
 */
class MonitorAgent extends LightweightAgent {
  constructor() {
    super({
      type: 'monitor',
      name: 'MonitorAgent',
      capabilities: ['observe', 'detect_changes', 'track_state']
    });
  }

  /**
   * Monitor build failures
   */
  async monitorBuildFailure(build, timeline, logs, client) {
    const task = {
      type: 'build_failure',
      category: 'build',
      description: this.extractBuildError(build, timeline),
      data: { build, timeline, logs, client }
    };

    return await this.execute(task);
  }

  /**
   * Monitor PR status
   */
  async monitorPullRequest(pr) {
    const idleHours = this.calculateIdleTime(pr);
    
    const task = {
      type: 'pr_status',
      category: 'pr',
      description: `PR idle for ${idleHours} hours`,
      data: { pr, idleHours }
    };

    return await this.execute(task);
  }

  /**
   * Monitor work item status
   */
  async monitorWorkItem(workItem) {
    const state = workItem.fields?.['System.State'];
    const assignee = workItem.fields?.['System.AssignedTo']?.displayName;
    
    let description = '';
    if (state === 'Blocked') {
      description = 'blocked';
    } else if (!assignee) {
      description = 'unassigned';
    } else if (this.isOverdue(workItem)) {
      description = 'overdue';
    }

    if (!description) {
      return { success: true, result: { status: 'ok' } };
    }

    const task = {
      type: 'work_item_issue',
      category: 'workitem',
      description,
      data: { workItem }
    };

    return await this.execute(task);
  }

  /**
   * Execute monitoring action
   */
  async executeAction(action, solution) {
    logger.info('MonitorAgent executing action', { action, solution });

    switch (action) {
      case 'retry_with_clean_cache':
        return {
          status: 'action_suggested',
          action: 'retry_build',
          solution,
          autoExecute: true
        };

      case 'notify_reviewers':
        return {
          status: 'action_suggested',
          action: 'send_notification',
          solution,
          autoExecute: true
        };

      case 'escalate_to_lead':
        return {
          status: 'action_suggested',
          action: 'escalate',
          solution,
          autoExecute: true
        };

      case 'escalate_blocker':
        return {
          status: 'action_suggested',
          action: 'escalate_urgent',
          solution,
          autoExecute: true
        };

      default:
        return {
          status: 'completed',
          action,
          solution
        };
    }
  }

  /**
   * Override AI analysis for build failures to use proper aiService
   */
  async aiAnalyze(task) {
    // For build failures, use the specialized aiService
    if (task.type === 'build_failure' && task.data.build) {
      const { aiService } = await import('../ai/aiService.js');
      const { build, timeline, logs, client } = task.data;
      
      const analysis = await aiService.summarizeBuildFailure(build, timeline, logs, client);
      
      return {
        method: 'ai',
        analysis,
        solution: analysis,
        confidence: 0.8,
        action: 'provide_solution',
        autoFix: false
      };
    }
    
    // For other tasks, use parent implementation
    return await super.aiAnalyze(task);
  }

  /**
   * Extract error from build timeline
   */
  extractBuildError(build, timeline) {
    const failedJobs = timeline?.records?.filter(r => 
      r.result === 'failed' || r.result === 'canceled'
    ) || [];

    const errors = failedJobs.map(job => {
      const issues = job.issues?.map(i => i.message).join('; ') || '';
      return `${job.name}: ${issues}`;
    }).join('\n');

    return errors || 'Build failed with no specific error details';
  }

  /**
   * Calculate PR idle time in hours
   */
  calculateIdleTime(pr) {
    const lastUpdate = new Date(pr.lastMergeSourceCommit?.commitDate || pr.creationDate);
    const now = new Date();
    return Math.floor((now - lastUpdate) / (1000 * 60 * 60));
  }

  /**
   * Check if work item is overdue
   */
  isOverdue(workItem) {
    const dueDate = workItem.fields?.['Microsoft.VSTS.Scheduling.DueDate'];
    if (!dueDate) return false;

    const due = new Date(dueDate);
    const now = new Date();
    return now > due;
  }

  /**
   * Detect state changes
   */
  async detectChanges(currentState, stateKey) {
    const previousState = cacheManager.get('api', `state_${stateKey}`);
    
    if (!previousState) {
      // First time seeing this state
      cacheManager.set('api', `state_${stateKey}`, currentState, 3600);
      return { changed: false, isNew: true };
    }

    const changed = JSON.stringify(currentState) !== JSON.stringify(previousState);
    
    if (changed) {
      cacheManager.set('api', `state_${stateKey}`, currentState, 3600);
    }

    return { changed, isNew: false, previousState };
  }
}

// Export singleton instance
export const monitorAgent = new MonitorAgent();
export default monitorAgent;
