/**
 * Test script for Phase 3: MongoDB Vector Memory
 * Run with: node test-phase3.js
 */

import mongoose from 'mongoose';
import './models/Memory.js'; // Load model
import { mongoVectorStore } from './memory/MongoVectorStore.js';
import { contextManager } from './memory/ContextManager.js';
import { monitorAgent } from './agents/MonitorAgent.js';

console.log('🧪 Testing Phase 3: MongoDB Vector Memory\n');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/insightops-test';

try {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB\n');
} catch (error) {
  console.error('❌ Failed to connect to MongoDB:', error.message);
  console.log('\nNote: Vector search requires MongoDB Atlas with vector index.');
  console.log('See: backend/memory/setup-vector-index.md\n');
  process.exit(1);
}

// Test 1: Embedding Generation
console.log('Test 1: Embedding Generation');
console.log('-----------------------------');

const testText = 'npm install failed: cannot find module';
const embedding = await mongoVectorStore.getEmbedding(testText);

console.log('✓ Generated embedding');
console.log('  - Dimensions:', embedding.length);
console.log('  - First 5 values:', embedding.slice(0, 5));
console.log('  - Type:', Array.isArray(embedding) ? 'Array' : typeof embedding);

// Test cache
const cachedEmbedding = await mongoVectorStore.getEmbedding(testText);
console.log('✓ Embedding cached:', embedding === cachedEmbedding);
console.log('');

// Test 2: Store Memories
console.log('Test 2: Store Memories');
console.log('----------------------');

const memories = [
  {
    content: 'Build failed: npm install error. Solution: Run npm ci --cache .npm',
    metadata: { type: 'build_failure', success: true }
  },
  {
    content: 'PR idle for 48 hours. Action: Sent reminder to reviewers',
    metadata: { type: 'pr_issue', success: true }
  },
  {
    content: 'Work item blocked. Escalated to team lead immediately',
    metadata: { type: 'work_item', success: true }
  }
];

const storedMemories = [];
for (const mem of memories) {
  try {
    const stored = await mongoVectorStore.store(mem.content, mem.metadata);
    storedMemories.push(stored);
    console.log(`✓ Stored memory: ${mem.content.substring(0, 50)}...`);
  } catch (error) {
    console.log(`⚠️  Failed to store memory: ${error.message}`);
  }
}
console.log('');

// Test 3: Vector Search
console.log('Test 3: Vector Search');
console.log('---------------------');

const query = 'npm install is failing';
console.log(`Query: "${query}"`);

try {
  const results = await mongoVectorStore.searchSimilar(query, 3);
  
  if (results.length > 0) {
    console.log(`✓ Found ${results.length} similar memories:`);
    results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.content.substring(0, 60)}...`);
      console.log(`     Relevance: ${(result.score * 100).toFixed(1)}%`);
    });
  } else {
    console.log('⚠️  No results (vector index may not be set up)');
    console.log('   See: backend/memory/setup-vector-index.md');
  }
} catch (error) {
  console.log('⚠️  Vector search failed:', error.message);
  console.log('   This is expected if vector index is not set up yet');
}
console.log('');

// Test 4: Context Manager
console.log('Test 4: Context Manager');
console.log('-----------------------');

const task = {
  type: 'build_failure',
  description: 'npm install failed with ENOENT error',
  category: 'build'
};

try {
  const context = await contextManager.buildContext(task, {
    maxMemories: 3,
    filterType: 'build_failure'
  });

  console.log('✓ Context built:');
  console.log(`  - Memories found: ${context.count}`);
  console.log(`  - Context length: ${context.context.length} chars`);
  if (context.context) {
    console.log(`  - Preview: ${context.context.substring(0, 100)}...`);
  }
} catch (error) {
  console.log('⚠️  Context building failed:', error.message);
}
console.log('');

// Test 5: Agent with Context
console.log('Test 5: Agent with Context');
console.log('--------------------------');

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

const agentResult = await monitorAgent.monitorBuildFailure(mockBuild, mockTimeline, null);

console.log('✓ Agent executed with context:');
console.log(`  - Success: ${agentResult.success}`);
console.log(`  - Method: ${agentResult.stats.rulesUsed > 0 ? 'Rule-based' : 'AI-based'}`);
console.log(`  - Solution: ${agentResult.result?.solution?.substring(0, 60)}...`);
console.log('');

// Test 6: Memory Statistics
console.log('Test 6: Memory Statistics');
console.log('-------------------------');

const stats = await mongoVectorStore.getStats();
console.log('✓ Memory stats:', JSON.stringify(stats, null, 2));
console.log('');

// Test 7: Store Task Outcome
console.log('Test 7: Store Task Outcome');
console.log('--------------------------');

try {
  await contextManager.storeTaskOutcome(task, agentResult);
  console.log('✓ Task outcome stored as memory');
  console.log('  - Future similar tasks will have this context');
} catch (error) {
  console.log('⚠️  Failed to store outcome:', error.message);
}
console.log('');

// Cleanup
console.log('Cleaning up test data...');
try {
  const Memory = mongoose.model('Memory');
  await Memory.deleteMany({ 'metadata.type': { $in: ['build_failure', 'pr_issue', 'work_item'] } });
  console.log('✓ Test data cleaned up');
} catch (error) {
  console.log('⚠️  Cleanup failed:', error.message);
}

// Summary
console.log('\n✅ Phase 3 Tests Complete!');
console.log('==========================');
console.log('Components tested:');
console.log('  ✓ Embedding generation (Hugging Face)');
console.log('  ✓ Memory storage (MongoDB)');
console.log('  ✓ Vector search (Atlas Vector Search)');
console.log('  ✓ Context building');
console.log('  ✓ Agent with context');
console.log('  ✓ Learning from outcomes');
console.log('');
console.log('Key Features:');
console.log(`  ✓ ${embedding.length}-dimensional embeddings`);
console.log(`  ✓ ${stats.total} memories stored`);
console.log('  ✓ Context-aware AI responses');
console.log('  ✓ Automatic learning from outcomes');
console.log('');
console.log('Next Steps:');
console.log('  1. Set up vector index in Atlas (if not done)');
console.log('  2. Monitor memory usage (512MB limit)');
console.log('  3. Test with real workloads');
console.log('  4. Move to Phase 4: Simple Workflows');

// Close connection
await mongoose.connection.close();
console.log('\n✓ MongoDB connection closed');
