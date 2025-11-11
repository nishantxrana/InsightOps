import { v4 as uuid } from 'uuid';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { agentRegistry } from '../agents/AgentRegistry.js';

/**
 * Simple workflow engine for autonomous multi-step tasks
 * No external dependencies (no Temporal, no Bull)
 */
class SimpleWorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.activeExecutions = new Map();
  }

  /**
   * Register a workflow
   */
  register(workflow) {
    if (!workflow.id || !workflow.steps) {
      throw new Error('Workflow must have id and steps');
    }

    this.workflows.set(workflow.id, {
      ...workflow,
      registeredAt: new Date()
    });

    logger.info(`Workflow registered: ${workflow.id}`, {
      steps: workflow.steps.length
    });
  }

  /**
   * Execute a workflow
   */
  async execute(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = uuid();
    const execution = {
      id: executionId,
      workflowId,
      status: 'running',
      startTime: new Date(),
      steps: [],
      context: { ...context },
      outputs: {}
    };

    this.activeExecutions.set(executionId, execution);

    try {
      logger.info(`Workflow execution started`, {
        executionId,
        workflowId
      });

      // Save initial state
      await this.saveExecution(execution);

      // Execute steps sequentially
      for (const step of workflow.steps) {
        // Check condition if specified
        if (step.condition && !this.evaluateCondition(step.condition, execution.outputs)) {
          logger.debug(`Step ${step.id} skipped (condition not met)`);
          continue;
        }

        // Execute step
        const stepResult = await this.executeStep(step, execution);

        execution.steps.push({
          id: step.id,
          status: stepResult.success ? 'completed' : 'failed',
          result: stepResult.result,
          error: stepResult.error,
          timestamp: new Date()
        });

        // Store output
        if (step.output) {
          execution.outputs[step.output] = stepResult.result;
        }

        // Save progress
        await this.saveExecution(execution);

        // Stop on error if not configured to continue
        if (!stepResult.success && !step.continueOnError) {
          throw new Error(`Step ${step.id} failed: ${stepResult.error}`);
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;

      logger.info(`Workflow execution completed`, {
        executionId,
        workflowId,
        duration: execution.duration
      });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();

      logger.error(`Workflow execution failed`, {
        executionId,
        workflowId,
        error: error.message
      });
    } finally {
      await this.saveExecution(execution);
      this.activeExecutions.delete(executionId);
    }

    return execution;
  }

  /**
   * Execute a single step
   */
  async executeStep(step, execution) {
    logger.debug(`Executing step: ${step.id}`, {
      agent: step.agent,
      action: step.action
    });

    try {
      // Resolve input from previous outputs
      const input = this.resolveInput(step.input, execution.outputs, execution.context);

      // Get agent
      const agent = agentRegistry.get(step.agent);
      if (!agent) {
        throw new Error(`Agent ${step.agent} not found`);
      }

      // Execute action
      const result = await agent[step.action](input);

      return {
        success: true,
        result
      };

    } catch (error) {
      logger.error(`Step ${step.id} failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resolve input variables from outputs
   */
  resolveInput(input, outputs, context) {
    if (!input) return {};
    if (typeof input !== 'string') return input;

    // Replace ${variable} with actual values
    let resolved = input;
    const matches = input.match(/\$\{([^}]+)\}/g);

    if (matches) {
      matches.forEach(match => {
        const varName = match.slice(2, -1); // Remove ${ and }
        const value = outputs[varName] || context[varName] || match;
        resolved = resolved.replace(match, JSON.stringify(value));
      });

      try {
        return JSON.parse(resolved);
      } catch {
        return resolved;
      }
    }

    return input;
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(condition, outputs) {
    try {
      // Simple condition evaluation
      // Format: ${variable} == "value" or ${variable} > 5
      const resolved = this.resolveInput(condition, outputs, {});
      
      // For now, just check if resolved value is truthy
      return !!resolved && resolved !== 'false';
    } catch {
      return false;
    }
  }

  /**
   * Save execution state to MongoDB
   */
  async saveExecution(execution) {
    try {
      const WorkflowExecution = mongoose.model('WorkflowExecution');
      await WorkflowExecution.findOneAndUpdate(
        { id: execution.id },
        execution,
        { upsert: true }
      );
    } catch (error) {
      logger.error('Failed to save execution:', error);
    }
  }

  /**
   * Resume execution after crash
   */
  async resume(executionId) {
    try {
      const WorkflowExecution = mongoose.model('WorkflowExecution');
      const execution = await WorkflowExecution.findOne({ id: executionId });

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      if (execution.status !== 'running') {
        throw new Error(`Execution ${executionId} is not running`);
      }

      const workflow = this.workflows.get(execution.workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${execution.workflowId} not found`);
      }

      // Find last completed step
      const lastStepIndex = execution.steps.length;
      const remainingSteps = workflow.steps.slice(lastStepIndex);

      logger.info(`Resuming execution from step ${lastStepIndex}`, {
        executionId,
        remainingSteps: remainingSteps.length
      });

      // Continue execution
      this.activeExecutions.set(executionId, execution);

      for (const step of remainingSteps) {
        const stepResult = await this.executeStep(step, execution);
        
        execution.steps.push({
          id: step.id,
          status: stepResult.success ? 'completed' : 'failed',
          result: stepResult.result,
          timestamp: new Date()
        });

        if (step.output) {
          execution.outputs[step.output] = stepResult.result;
        }

        await this.saveExecution(execution);

        if (!stepResult.success && !step.continueOnError) {
          throw new Error(`Step ${step.id} failed: ${stepResult.error}`);
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      await this.saveExecution(execution);

      this.activeExecutions.delete(executionId);

      return execution;

    } catch (error) {
      logger.error('Failed to resume execution:', error);
      throw error;
    }
  }

  /**
   * Get execution status
   */
  async getExecution(executionId) {
    try {
      const WorkflowExecution = mongoose.model('WorkflowExecution');
      return await WorkflowExecution.findOne({ id: executionId });
    } catch (error) {
      logger.error('Failed to get execution:', error);
      return null;
    }
  }

  /**
   * List executions
   */
  async listExecutions(workflowId = null, limit = 10) {
    try {
      const WorkflowExecution = mongoose.model('WorkflowExecution');
      const query = workflowId ? { workflowId } : {};
      
      return await WorkflowExecution
        .find(query)
        .sort({ startTime: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Failed to list executions:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      registeredWorkflows: this.workflows.size,
      activeExecutions: this.activeExecutions.size,
      workflows: Array.from(this.workflows.keys())
    };
  }
}

// Export singleton instance
export const workflowEngine = new SimpleWorkflowEngine();
export default workflowEngine;
