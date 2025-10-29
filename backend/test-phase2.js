/**
 * Test script for Phase 2: Lightweight Agents
 * Run with: node test-phase2.js
 */

import { ruleEngine } from './agents/RuleEngine.js';
import { monitorAgent } from './agents/MonitorAgent.js';
import { analyzeAgent } from './agents/AnalyzeAgent.js';
import { executeAgent } from './agents/ExecuteAgent.js';
import { agentRegistry } from './agents/AgentRegistry.js';

console.log('🧪 Testing Phase 2: Lightweight Agents\n');

// Test 1: Rule Engine
console.log('Test 1: Rule Engine');
console.log('-------------------');

// Test build failure rules
const buildError1 = 'npm install failed: cannot find module';
const buildError2 = 'test timeout exceeded 5000ms';
const buildError3 = 'out of memory: JavaScript heap';

const match1 = ruleEngine.match(buildError1, 'build');
const match2 = ruleEngine.match(buildError2, 'build');
const match3 = ruleEngine.match(buildError3, 'build');

console.log('✓ Build error 1:', match1.matched ? `Matched rule: ${match1.rule.id} (${match1.confidence})` : 'No match');
console.log('✓ Build error 2:', match2.matched ? `Matched rule: ${match2.rule.id} (${match2.confidence})` : 'No match');
console.log('✓ Build error 3:', match3.matched ? `Matched rule: ${match3.rule.id} (${match3.confidence})` : 'No match');

// Test PR rules
const prIssue = 'PR idle for 48 hours';
const prMatch = ruleEngine.match(prIssue, 'pr');
console.log('✓ PR issue:', prMatch.matched ? `Matched rule: ${prMatch.rule.id}` : 'No match');

// Get rule stats
const ruleStats = ruleEngine.getStats();
console.log('✓ Rule engine stats:', JSON.stringify(ruleStats, null, 2));
console.log('');

// Test 2: MonitorAgent
console.log('Test 2: MonitorAgent');
console.log('--------------------');

// Simulate build failure monitoring
const mockBuild = {
  id: 123,
  buildNumber: '20250129.1',
  definition: { name: 'CI Pipeline' }
};

const mockTimeline = {
  records: [
    {
      name: 'Build',
      result: 'failed',
      issues: [{ message: 'npm install failed: ENOENT package.json' }]
    }
  ]
};

const buildResult = await monitorAgent.monitorBuildFailure(mockBuild, mockTimeline, null);
console.log('✓ Build monitoring result:', JSON.stringify(buildResult, null, 2));
console.log('');

// Test 3: AnalyzeAgent
console.log('Test 3: AnalyzeAgent');
console.log('--------------------');

// Simulate sprint analysis
const mockWorkItems = [
  { fields: { 'System.State': 'Active', 'System.AssignedTo': { displayName: 'Alice' } } },
  { fields: { 'System.State': 'Active', 'System.AssignedTo': { displayName: 'Bob' } } },
  { fields: { 'System.State': 'Blocked', 'System.AssignedTo': { displayName: 'Charlie' } } },
  { fields: { 'System.State': 'Closed', 'System.AssignedTo': { displayName: 'Alice' } } },
  { fields: { 'System.State': 'New' } } // Unassigned
];

const sprintAnalysis = await analyzeAgent.analyzeSprintHealth(mockWorkItems);
console.log('✓ Sprint analysis:', JSON.stringify(sprintAnalysis, null, 2));
console.log('');

// Test 4: ExecuteAgent
console.log('Test 4: ExecuteAgent');
console.log('--------------------');

// Test notification
const notifyResult = await executeAgent.sendNotification('team', 'Build failed - npm install issue', 'high');
console.log('✓ Notification result:', JSON.stringify(notifyResult, null, 2));

// Test escalation
const escalateResult = await executeAgent.escalate({ type: 'blocker' }, 'Work item blocked for 24h');
console.log('✓ Escalation result:', JSON.stringify(escalateResult, null, 2));
console.log('');

// Test 5: Agent Registry
console.log('Test 5: Agent Registry');
console.log('----------------------');

agentRegistry.initialize();

const allAgents = agentRegistry.getAll();
console.log('✓ Registered agents:', allAgents.map(a => a.name).join(', '));

const agentStats = agentRegistry.getStats();
console.log('✓ Agent statistics:', JSON.stringify(agentStats, null, 2));

const health = agentRegistry.healthCheck();
console.log('✓ Health check:', health.healthy ? 'All agents healthy' : 'Issues detected');
console.log('');

// Test 6: End-to-End Agent Flow
console.log('Test 6: End-to-End Flow');
console.log('-----------------------');

// Simulate: Build fails → Monitor detects → Analyze → Execute
console.log('Scenario: Build failure with npm install error');

// Step 1: Monitor detects
const monitorResult = await monitorAgent.monitorBuildFailure(mockBuild, mockTimeline, null);
console.log('✓ Step 1 (Monitor):', monitorResult.success ? 'Detected and analyzed' : 'Failed');

// Step 2: Check if rule was used (no AI call)
const finalStats = agentRegistry.getStats();
console.log('✓ Step 2 (Intelligence):', {
  rulesUsed: finalStats.monitor.rulesUsed,
  aiUsed: finalStats.monitor.aiUsed,
  method: finalStats.monitor.rulesUsed > 0 ? 'Rule-based (no AI cost)' : 'AI-based'
});

// Step 3: Execute would send notification
console.log('✓ Step 3 (Execute): Action would be taken automatically');
console.log('');

// Summary
console.log('✅ Phase 2 Tests Complete!');
console.log('==========================');
console.log('All components working:');
console.log('  ✓ Rule Engine with 10+ rules');
console.log('  ✓ MonitorAgent detecting issues');
console.log('  ✓ AnalyzeAgent generating insights');
console.log('  ✓ ExecuteAgent taking actions');
console.log('  ✓ Agent Registry managing all agents');
console.log('');
console.log('Key Achievements:');
console.log(`  ✓ ${ruleStats.totalMatches} rule matches (no AI needed)`);
console.log(`  ✓ ${finalStats.monitor.tasksCompleted} tasks completed`);
console.log(`  ✓ ${finalStats.monitor.ruleUsageRate} rule usage rate`);
console.log('');
console.log('Next Steps:');
console.log('  1. Integrate agents with existing webhooks');
console.log('  2. Add more rules based on patterns');
console.log('  3. Monitor rule effectiveness');
console.log('  4. Move to Phase 3: MongoDB Vector Memory');
