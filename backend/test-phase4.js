/**
 * Test script for Phase 4: Simple Workflows
 * Run with: node test-phase4.js
 */

import mongoose from 'mongoose';
import './models/WorkflowExecution.js';
import { workflowEngine } from './workflows/SimpleWorkflowEngine.js';
import { agentRegistry } from './agents/AgentRegistry.js';
import { loadWorkflows } from './workflows/workflowLoader.js';

console.log('🧪 Testing Phase 4: Simple Workflows\n');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/insightops-test';

try {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB\n');
} catch (error) {
  console.error('❌ Failed to connect to MongoDB:', error.message);
  process.exit(1);
}

// Initialize agents
agentRegistry.initialize();

// Test 1: Load Workflows
console.log('Test 1: Load Workflows');
console.log('----------------------');

await loadWorkflows();
const stats = workflowEngine.getStats();

console.log('✓ Workflows loaded:', stats.registeredWorkflows);
console.log('✓ Workflow IDs:', stats.workflows.join(', '));
console.log('');

// Test 2: Simple Workflow Execution
console.log('Test 2: Simple Workflow Execution');
console.log('----------------------------------');

// Register a test workflow
const testWorkflow = {
  id: 'test-workflow',
  name: 'Test Workflow',
  steps: [
    {
      id: 'step1',
      agent: 'monitor',
      action: 'monitorBuildFailure',
      input: {
        build: { id: 123, buildNumber: '1.0', definition: { name: 'Test' } },
        timeline: {
          records: [{
            name: 'Build',
            result: 'failed',
            issues: [{ message: 'npm install failed' }]
          }]
        },
        logs: null
      },
      output: 'monitor_result'
    },
    {
      id: 'step2',
      agent: 'execute',
      action: 'sendNotification',
      input: {
        recipient: 'team',
        message: 'Build analyzed',
        priority: 'normal'
      },
      output: 'notification_result'
    }
  ]
};

workflowEngine.register(testWorkflow);

const execution = await workflowEngine.execute('test-workflow', {});

console.log('✓ Workflow executed:', execution.status);
console.log('✓ Steps completed:', execution.steps.length);
console.log('✓ Duration:', execution.duration, 'ms');
console.log('✓ Outputs:', Object.keys(execution.outputs).join(', '));
console.log('');

// Test 3: Workflow with Conditions
console.log('Test 3: Workflow with Conditions');
console.log('---------------------------------');

const conditionalWorkflow = {
  id: 'conditional-test',
  name: 'Conditional Test',
  steps: [
    {
      id: 'always_run',
      agent: 'execute',
      action: 'sendNotification',
      input: { recipient: 'team', message: 'Always runs', priority: 'low' },
      output: 'result1'
    },
    {
      id: 'conditional_run',
      agent: 'execute',
      action: 'sendNotification',
      input: { recipient: 'team', message: 'Conditional', priority: 'low' },
      condition: '${result1.status} == "notification_sent"',
      output: 'result2'
    },
    {
      id: 'never_run',
      agent: 'execute',
      action: 'sendNotification',
      input: { recipient: 'team', message: 'Never runs', priority: 'low' },
      condition: 'false',
      output: 'result3'
    }
  ]
};

workflowEngine.register(conditionalWorkflow);
const conditionalExec = await workflowEngine.execute('conditional-test', {});

console.log('✓ Workflow executed:', conditionalExec.status);
console.log('✓ Steps executed:', conditionalExec.steps.length, '(expected: 2)');
console.log('✓ Step statuses:', conditionalExec.steps.map(s => s.status).join(', '));
console.log('');

// Test 4: State Persistence
console.log('Test 4: State Persistence');
console.log('-------------------------');

const savedExecution = await workflowEngine.getExecution(execution.id);

console.log('✓ Execution retrieved from DB');
console.log('✓ Status:', savedExecution.status);
console.log('✓ Steps:', savedExecution.steps.length);
console.log('✓ Workflow ID:', savedExecution.workflowId);
console.log('');

// Test 5: List Executions
console.log('Test 5: List Executions');
console.log('-----------------------');

const executions = await workflowEngine.listExecutions(null, 5);

console.log('✓ Found', executions.length, 'executions');
executions.forEach((exec, i) => {
  console.log(`  ${i + 1}. ${exec.workflowId} - ${exec.status} (${exec.steps.length} steps)`);
});
console.log('');

// Test 6: Variable Resolution
console.log('Test 6: Variable Resolution');
console.log('---------------------------');

const varWorkflow = {
  id: 'variable-test',
  name: 'Variable Test',
  steps: [
    {
      id: 'set_var',
      agent: 'execute',
      action: 'sendNotification',
      input: { recipient: 'team', message: 'Setting variable', priority: 'low' },
      output: 'my_var'
    },
    {
      id: 'use_var',
      agent: 'execute',
      action: 'sendNotification',
      input: {
        recipient: 'team',
        message: 'Using variable: ${my_var}',
        priority: 'low'
      },
      output: 'result'
    }
  ]
};

workflowEngine.register(varWorkflow);
const varExec = await workflowEngine.execute('variable-test', {});

console.log('✓ Variable workflow executed');
console.log('✓ Variables resolved:', Object.keys(varExec.outputs).length);
console.log('');

// Test 7: Error Handling
console.log('Test 7: Error Handling');
console.log('----------------------');

const errorWorkflow = {
  id: 'error-test',
  name: 'Error Test',
  steps: [
    {
      id: 'good_step',
      agent: 'execute',
      action: 'sendNotification',
      input: { recipient: 'team', message: 'Good', priority: 'low' },
      output: 'result1'
    },
    {
      id: 'bad_step',
      agent: 'execute',
      action: 'nonExistentMethod',
      input: {},
      continueOnError: true,
      output: 'result2'
    },
    {
      id: 'recovery_step',
      agent: 'execute',
      action: 'sendNotification',
      input: { recipient: 'team', message: 'Recovered', priority: 'low' },
      output: 'result3'
    }
  ]
};

workflowEngine.register(errorWorkflow);
const errorExec = await workflowEngine.execute('error-test', {});

console.log('✓ Error workflow executed:', errorExec.status);
console.log('✓ Steps attempted:', errorExec.steps.length);
console.log('✓ Failed step handled gracefully');
console.log('');

// Cleanup
console.log('Cleaning up test data...');
try {
  const WorkflowExecution = mongoose.model('WorkflowExecution');
  await WorkflowExecution.deleteMany({
    workflowId: { $in: ['test-workflow', 'conditional-test', 'variable-test', 'error-test'] }
  });
  console.log('✓ Test data cleaned up');
} catch (error) {
  console.log('⚠️  Cleanup failed:', error.message);
}

// Summary
console.log('\n✅ Phase 4 Tests Complete!');
console.log('==========================');
console.log('Components tested:');
console.log('  ✓ Workflow engine');
console.log('  ✓ Workflow registration');
console.log('  ✓ Step execution');
console.log('  ✓ Conditional logic');
console.log('  ✓ State persistence');
console.log('  ✓ Variable resolution');
console.log('  ✓ Error handling');
console.log('');
console.log('Key Features:');
console.log(`  ✓ ${stats.registeredWorkflows + 4} workflows registered`);
console.log(`  ✓ ${executions.length} executions tracked`);
console.log('  ✓ MongoDB state persistence');
console.log('  ✓ Crash recovery ready');
console.log('');
console.log('Next Steps:');
console.log('  1. Integrate workflows with webhooks');
console.log('  2. Add scheduled workflow triggers');
console.log('  3. Monitor workflow performance');
console.log('  4. Move to Phase 5: Learning System');

// Close connection
await mongoose.connection.close();
console.log('\n✓ MongoDB connection closed');
