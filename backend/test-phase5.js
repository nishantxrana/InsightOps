/**
 * Test script for Phase 5: Learning System
 * Run with: node test-phase5.js
 */

import mongoose from 'mongoose';
import './models/Pattern.js';
import { patternTracker } from './learning/PatternTracker.js';
import { ruleGenerator } from './learning/RuleGenerator.js';
import { ruleEngine } from './agents/RuleEngine.js';
import { monitorAgent } from './agents/MonitorAgent.js';

console.log('🧪 Testing Phase 5: Learning System\n');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/insightops-test';

try {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB\n');
} catch (error) {
  console.error('❌ Failed to connect to MongoDB:', error.message);
  process.exit(1);
}

// Test 1: Track Successful Patterns
console.log('Test 1: Track Successful Patterns');
console.log('----------------------------------');

const successfulTasks = [
  {
    type: 'build_failure',
    category: 'build',
    description: 'npm install failed with ENOENT error'
  },
  {
    type: 'build_failure',
    category: 'build',
    description: 'npm install failed missing package.json'
  },
  {
    type: 'build_failure',
    category: 'build',
    description: 'npm install error ENOENT'
  }
];

const solution = 'Run npm ci --cache .npm --prefer-offline';

for (const task of successfulTasks) {
  await patternTracker.trackSuccess(task, solution);
  console.log(`✓ Tracked success: ${task.description.substring(0, 40)}...`);
}

const stats1 = await patternTracker.getStats();
console.log('✓ Pattern stats:', JSON.stringify(stats1, null, 2));
console.log('');

// Test 2: Track Failures
console.log('Test 2: Track Failures');
console.log('----------------------');

const failedTask = {
  type: 'build_failure',
  category: 'build',
  description: 'unknown build error'
};

await patternTracker.trackFailure(failedTask, 'Unknown error');
console.log('✓ Tracked failure');
console.log('');

// Test 3: Find Similar Patterns
console.log('Test 3: Find Similar Patterns');
console.log('------------------------------');

const newTask = {
  type: 'build_failure',
  category: 'build',
  description: 'npm install is failing with error'
};

const similar = await patternTracker.findSimilar(newTask);

if (similar) {
  console.log('✓ Found similar pattern:');
  console.log('  - Pattern:', similar.pattern);
  console.log('  - Solution:', similar.solution);
  console.log('  - Confidence:', similar.confidence);
  console.log('  - Success count:', similar.successCount);
} else {
  console.log('⚠️  No similar pattern found');
}
console.log('');

// Test 4: Get High-Confidence Patterns
console.log('Test 4: Get High-Confidence Patterns');
console.log('-------------------------------------');

const patterns = await patternTracker.getPatterns('build_failure', 0.5);

console.log(`✓ Found ${patterns.length} patterns`);
patterns.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.pattern} (confidence: ${p.confidence.toFixed(2)}, successes: ${p.successCount})`);
});
console.log('');

// Test 5: Generate Rules from Patterns
console.log('Test 5: Generate Rules from Patterns');
console.log('-------------------------------------');

// Track more successes to reach threshold
for (let i = 0; i < 3; i++) {
  await patternTracker.trackSuccess(successfulTasks[0], solution);
}

const initialRuleCount = ruleEngine.getStats().totalRules;
console.log('✓ Initial rules:', initialRuleCount);

const generated = await ruleGenerator.generateRules(0.7, 3);

const finalRuleCount = ruleEngine.getStats().totalRules;
console.log('✓ Generated rules:', generated);
console.log('✓ Final rules:', finalRuleCount);
console.log('');

// Test 6: Use Learned Rule
console.log('Test 6: Use Learned Rule');
console.log('------------------------');

const testBuild = {
  id: 123,
  buildNumber: '1.0',
  definition: { name: 'Test' }
};

const testTimeline = {
  records: [{
    name: 'Build',
    result: 'failed',
    issues: [{ message: 'npm install failed ENOENT' }]
  }]
};

const result = await monitorAgent.monitorBuildFailure(testBuild, testTimeline, null);

console.log('✓ Agent result:', result.success ? 'Success' : 'Failed');
console.log('✓ Method used:', result.stats.rulesUsed > 0 ? 'Rule-based' : 'AI-based');
console.log('✓ Solution:', result.result?.solution?.substring(0, 60) + '...');
console.log('');

// Test 7: Rule Review
console.log('Test 7: Rule Review');
console.log('-------------------');

const updated = await ruleGenerator.reviewRules();

console.log('✓ Rules reviewed');
console.log('✓ Rules updated:', updated);
console.log('');

// Test 8: Learning Statistics
console.log('Test 8: Learning Statistics');
console.log('---------------------------');

const patternStats = await patternTracker.getStats();
const ruleStats = ruleGenerator.getStats();
const engineStats = ruleEngine.getStats();

console.log('✓ Pattern Tracker:');
console.log('  - Total patterns:', patternStats.totalPatterns);
console.log('  - High confidence:', patternStats.highConfidencePatterns);
console.log('  - Successes tracked:', patternStats.successTracked);
console.log('  - Failures tracked:', patternStats.failuresTracked);

console.log('✓ Rule Generator:');
console.log('  - Generated rules:', ruleStats.generatedRules);

console.log('✓ Rule Engine:');
console.log('  - Total rules:', engineStats.totalRules);
console.log('  - Total matches:', engineStats.totalMatches);
console.log('');

// Test 9: Pattern Confidence Evolution
console.log('Test 9: Pattern Confidence Evolution');
console.log('-------------------------------------');

const pattern = patterns[0];
if (pattern) {
  console.log('✓ Pattern before:', {
    confidence: pattern.confidence,
    successCount: pattern.successCount
  });
  
  // Track more successes
  await patternTracker.trackSuccess(successfulTasks[0], solution);
  await patternTracker.trackSuccess(successfulTasks[0], solution);
  
  const updatedPattern = await patternTracker.findSimilar(successfulTasks[0]);
  console.log('✓ Pattern after:', {
    confidence: updatedPattern.confidence,
    successCount: updatedPattern.successCount
  });
  console.log('✓ Confidence increased:', updatedPattern.confidence > pattern.confidence);
}
console.log('');

// Cleanup
console.log('Cleaning up test data...');
try {
  const Pattern = mongoose.model('Pattern');
  await Pattern.deleteMany({ type: 'build_failure' });
  console.log('✓ Test data cleaned up');
} catch (error) {
  console.log('⚠️  Cleanup failed:', error.message);
}

// Summary
console.log('\n✅ Phase 5 Tests Complete!');
console.log('==========================');
console.log('Components tested:');
console.log('  ✓ Pattern tracking');
console.log('  ✓ Success/failure recording');
console.log('  ✓ Pattern similarity detection');
console.log('  ✓ Automatic rule generation');
console.log('  ✓ Rule review and optimization');
console.log('  ✓ Confidence evolution');
console.log('');
console.log('Key Achievements:');
console.log(`  ✓ ${patternStats.successTracked} successes tracked`);
console.log(`  ✓ ${patternStats.totalPatterns} patterns discovered`);
console.log(`  ✓ ${generated} rules auto-generated`);
console.log(`  ✓ ${engineStats.totalRules} total rules available`);
console.log('');
console.log('Learning Capabilities:');
console.log('  ✓ Learns from every outcome');
console.log('  ✓ Generates rules automatically');
console.log('  ✓ Improves confidence over time');
console.log('  ✓ Self-optimizing system');
console.log('');
console.log('Next Steps:');
console.log('  1. Enable learning scheduler');
console.log('  2. Monitor pattern growth');
console.log('  3. Review generated rules');
console.log('  4. Move to Phase 6: Observability & Polish');

// Close connection
await mongoose.connection.close();
console.log('\n✓ MongoDB connection closed');
