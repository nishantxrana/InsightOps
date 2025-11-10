import { workflowEngine } from './SimpleWorkflowEngine.js';
import { logger } from '../utils/logger.js';

// Import workflow definitions
import buildFailureWorkflow from './definitions/build-failure-workflow.js';
import sprintMonitoringWorkflow from './definitions/sprint-monitoring-workflow.js';
import prMonitoringWorkflow from './definitions/pr-monitoring-workflow.js';

/**
 * Load and register all workflows
 */
export async function loadWorkflows() {
  const workflows = [
    buildFailureWorkflow,
    sprintMonitoringWorkflow,
    prMonitoringWorkflow
  ];

  for (const workflow of workflows) {
    try {
      workflowEngine.register(workflow);
      logger.info(`Loaded workflow: ${workflow.name}`);
    } catch (error) {
      logger.error(`Failed to load workflow ${workflow.id}:`, error);
    }
  }

  logger.info(`Loaded ${workflows.length} workflows`);
}

export default loadWorkflows;
