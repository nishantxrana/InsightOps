import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger.js';
import { ruleEngine } from './RuleEngine.js';
import { cacheManager } from '../cache/CacheManager.js';
import { freeModelRouter } from '../ai/FreeModelRouter.js';

/**
 * Base class for lightweight agents
 * Implements: Analyze → Plan → Act → Learn cycle
 */
class LightweightAgent {
  constructor(config) {
    this.id = config.id || uuid();
    this.type = config.type || 'generic';
    this.name = config.name || 'Agent';
    this.capabilities = config.capabilities || [];
    
    this.stats = {
      tasksCompleted: 0,
      rulesUsed: 0,
      aiUsed: 0,
      cacheHits: 0,
      errors: 0
    };
  }

  /**
   * Main execution method
   * Implements the agentic loop: Analyze → Plan → Act → Learn
   */
  async execute(task) {
    const startTime = Date.now();
    const executionId = uuid();

    logger.info(`Agent ${this.name} executing task`, {
      agentId: this.id,
      executionId,
      taskType: task.type
    });

    try {
      // Step 1: Analyze the task
      const analysis = await this.analyze(task);

      // Step 2: Plan actions
      const plan = await this.plan(analysis);

      // Step 3: Execute actions
      const result = await this.act(plan);

      // Step 4: Learn from outcome
      await this.learn(task, result);

      this.stats.tasksCompleted++;

      const duration = Date.now() - startTime;
      logger.info(`Agent ${this.name} completed task`, {
        agentId: this.id,
        executionId,
        duration,
        success: true
      });

      return {
        success: true,
        result,
        duration,
        stats: this.getStats()
      };
    } catch (error) {
      this.stats.errors++;
      logger.error(`Agent ${this.name} failed`, {
        agentId: this.id,
        executionId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Step 1: Analyze the task
   * Check cache first, then rules, then AI
   */
  async analyze(task) {
    // Check cache first
    const cacheKey = cacheManager.generateKey('analysis', {
      type: task.type,
      data: task.data
    });

    const cached = cacheManager.get('analysis', cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      logger.debug('Analysis cache hit', { agentId: this.id });
      return cached;
    }

    // Try rule-based analysis
    const ruleMatch = ruleEngine.match(task.description || task.data, task.category);
    if (ruleMatch.matched && ruleMatch.confidence > 0.7) {
      this.stats.rulesUsed++;
      logger.debug('Rule-based analysis', {
        agentId: this.id,
        ruleId: ruleMatch.rule.id,
        confidence: ruleMatch.confidence
      });

      const analysis = {
        method: 'rule',
        ruleId: ruleMatch.rule.id,
        confidence: ruleMatch.confidence,
        action: ruleMatch.action,
        solution: ruleMatch.solution,
        autoFix: ruleMatch.autoFix
      };

      // Cache the analysis
      cacheManager.set('analysis', cacheKey, analysis, 86400); // 24 hours
      return analysis;
    }

    // Fall back to AI analysis
    this.stats.aiUsed++;
    logger.debug('AI-based analysis', { agentId: this.id });

    const aiAnalysis = await this.aiAnalyze(task);
    
    // Cache the AI analysis
    cacheManager.set('analysis', cacheKey, aiAnalysis, 3600); // 1 hour
    return aiAnalysis;
  }

  /**
   * AI-based analysis (fallback) with context
   */
  async aiAnalyze(task) {
    // Try to get context from memories
    let contextStr = '';
    try {
      const { contextManager } = await import('../memory/ContextManager.js');
      const context = await contextManager.buildContext(task, {
        maxMemories: 3,
        filterType: task.type
      });
      contextStr = context.context;
    } catch (error) {
      logger.debug('Context not available, proceeding without it');
    }

    const prompt = `${contextStr ? contextStr + '\n\n' : ''}Analyze this task and suggest an action:
Task Type: ${task.type}
Description: ${task.description || JSON.stringify(task.data)}

Provide:
1. What is the issue?
2. What action should be taken?
3. Confidence level (0-1)`;

    const response = await freeModelRouter.query({
      prompt,
      complexity: 'simple',
      maxTokens: 200
    });

    return {
      method: 'ai',
      analysis: response,
      confidence: 0.7,
      action: 'ai_suggested',
      autoFix: false
    };
  }

  /**
   * Step 2: Plan actions based on analysis
   */
  async plan(analysis) {
    if (analysis.method === 'rule' && analysis.autoFix) {
      return {
        type: 'auto',
        action: analysis.action,
        solution: analysis.solution,
        requiresApproval: false
      };
    }

    if (analysis.confidence > 0.8) {
      return {
        type: 'confident',
        action: analysis.action,
        solution: analysis.solution,
        requiresApproval: false
      };
    }

    return {
      type: 'manual',
      action: 'notify_human',
      solution: analysis.solution || analysis.analysis,
      requiresApproval: true
    };
  }

  /**
   * Step 3: Execute the plan
   */
  async act(plan) {
    logger.info(`Agent ${this.name} executing plan`, {
      agentId: this.id,
      planType: plan.type,
      action: plan.action
    });

    if (plan.requiresApproval) {
      return {
        status: 'pending_approval',
        action: plan.action,
        solution: plan.solution
      };
    }

    // Execute the action
    return await this.executeAction(plan.action, plan.solution);
  }

  /**
   * Execute specific action (override in subclasses)
   */
  async executeAction(action, solution) {
    // Base implementation - subclasses should override
    return {
      status: 'completed',
      action,
      solution
    };
  }

  /**
   * Step 4: Learn from the outcome
   */
  async learn(task, result) {
    // Store successful patterns for future use
    if (result.status === 'completed' || result.status === 'action_suggested') {
      try {
        const { contextManager } = await import('../memory/ContextManager.js');
        await contextManager.storeTaskOutcome(task, { success: true, result });
        
        logger.debug(`Agent ${this.name} learned from success`, {
          agentId: this.id,
          taskType: task.type
        });
      } catch (error) {
        logger.debug('Memory storage not available:', error.message);
      }
    }
  }

  /**
   * Get agent statistics
   */
  getStats() {
    const total = this.stats.rulesUsed + this.stats.aiUsed;
    return {
      ...this.stats,
      ruleUsageRate: total > 0 ? `${(this.stats.rulesUsed / total * 100).toFixed(1)}%` : '0%',
      aiUsageRate: total > 0 ? `${(this.stats.aiUsed / total * 100).toFixed(1)}%` : '0%',
      cacheHitRate: this.stats.tasksCompleted > 0 
        ? `${(this.stats.cacheHits / this.stats.tasksCompleted * 100).toFixed(1)}%` 
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      tasksCompleted: 0,
      rulesUsed: 0,
      aiUsed: 0,
      cacheHits: 0,
      errors: 0
    };
  }
}

export default LightweightAgent;
