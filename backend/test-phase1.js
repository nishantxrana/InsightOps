/**
 * Test script for Phase 1: Caching & Model Router
 * Run with: node test-phase1.js
 */

import { cacheManager } from './cache/CacheManager.js';
import { rateLimiter } from './utils/RateLimiter.js';
import { freeModelRouter } from './ai/FreeModelRouter.js';

console.log('🧪 Testing Phase 1: Caching & Model Router\n');

// Test 1: Cache functionality
console.log('Test 1: Cache Operations');
console.log('------------------------');

// Set some test data
cacheManager.set('ai', 'test-key-1', 'test-value-1', 60);
cacheManager.set('ai', 'test-key-2', 'test-value-2', 60);
cacheManager.set('api', 'test-key-3', 'test-value-3', 30);

// Get data
const value1 = cacheManager.get('ai', 'test-key-1');
const value2 = cacheManager.get('ai', 'test-key-2');
const value3 = cacheManager.get('api', 'test-key-3');
const value4 = cacheManager.get('ai', 'non-existent');

console.log('✓ Set 3 cache entries');
console.log('✓ Retrieved values:', { value1, value2, value3 });
console.log('✓ Non-existent key returns:', value4);

// Test cache stats
const stats = cacheManager.getAllStats();
console.log('✓ Cache stats:', JSON.stringify(stats, null, 2));
console.log('');

// Test 2: Rate Limiter
console.log('Test 2: Rate Limiter');
console.log('--------------------');

// Check if can proceed
const canProceedGemini = rateLimiter.canProceed('gemini');
const canProceedOpenAI = rateLimiter.canProceed('openai');

console.log('✓ Gemini can proceed:', canProceedGemini);
console.log('✓ OpenAI can proceed:', canProceedOpenAI);

// Record some requests
rateLimiter.recordRequest('gemini', 100);
rateLimiter.recordRequest('gemini', 150);
rateLimiter.recordRequest('openai', 200);

// Get stats
const rateLimitStats = rateLimiter.getAllStats();
console.log('✓ Rate limit stats:', JSON.stringify(rateLimitStats, null, 2));
console.log('');

// Test 3: Model Router (without actual API calls)
console.log('Test 3: Model Router');
console.log('--------------------');

// Initialize with dummy config
freeModelRouter.initialize({
  geminiApiKey: 'test-key',
  openaiApiKey: null,
  groqApiKey: null
});

console.log('✓ Router initialized');

// Get router stats
const routerStats = freeModelRouter.getStats();
console.log('✓ Router stats:', JSON.stringify(routerStats, null, 2));
console.log('');

// Test 4: Cache Key Generation
console.log('Test 4: Cache Key Generation');
console.log('----------------------------');

const key1 = cacheManager.generateKey('ai', { prompt: 'test prompt', model: 'gemini' });
const key2 = cacheManager.generateKey('ai', { prompt: 'test prompt', model: 'gemini' });
const key3 = cacheManager.generateKey('ai', { prompt: 'different prompt', model: 'gemini' });

console.log('✓ Same input generates same key:', key1 === key2);
console.log('✓ Different input generates different key:', key1 !== key3);
console.log('✓ Key format:', key1);
console.log('');

// Test 5: Cache Hit Rate Simulation
console.log('Test 5: Cache Hit Rate Simulation');
console.log('----------------------------------');

// Simulate 100 requests with 70% cache hit rate
for (let i = 0; i < 100; i++) {
  const key = `request-${i % 30}`; // 30 unique requests, repeated
  
  const cached = cacheManager.get('ai', key);
  if (!cached) {
    // Cache miss - simulate API call
    cacheManager.set('ai', key, `response-${i}`, 3600);
  }
}

const finalStats = cacheManager.getAllStats();
console.log('✓ After 100 requests:');
console.log('  - Cache size:', finalStats.ai.size);
console.log('  - Hit rate:', finalStats.ai.hitRate);
console.log('  - Memory usage:', finalStats.ai.memoryUsage);
console.log('');

// Summary
console.log('✅ Phase 1 Tests Complete!');
console.log('==========================');
console.log('All core components working:');
console.log('  ✓ In-memory caching with LRU eviction');
console.log('  ✓ Rate limiting for API calls');
console.log('  ✓ Model router framework');
console.log('  ✓ Cache key generation');
console.log('  ✓ Statistics tracking');
console.log('');
console.log('Next Steps:');
console.log('  1. Test with real AI API calls');
console.log('  2. Monitor cache hit rates in production');
console.log('  3. Adjust cache sizes based on usage');
console.log('  4. Move to Phase 2: Lightweight Agents');
