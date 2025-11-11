import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { agentRegistry } from '../agents/AgentRegistry.js';
import { ruleEngine } from '../agents/RuleEngine.js';
import { workflowEngine } from '../workflows/SimpleWorkflowEngine.js';
import { cacheManager } from '../cache/CacheManager.js';
import { rateLimiter } from '../utils/RateLimiter.js';
import { freeModelRouter } from '../ai/FreeModelRouter.js';
import { patternTracker } from '../learning/PatternTracker.js';
import { ruleGenerator } from '../learning/RuleGenerator.js';
import { mongoVectorStore } from '../memory/MongoVectorStore.js';

const router = express.Router();

// Apply authentication
router.use(authenticate);

/**
 * Get comprehensive system overview
 */
router.get('/overview', async (req, res) => {
  try {
    const overview = {
      agents: agentRegistry.getStats(),
      rules: ruleEngine.getStats(),
      workflows: workflowEngine.getStats(),
      cache: cacheManager.getAllStats(),
      rateLimits: rateLimiter.getAllStats(),
      router: freeModelRouter.getStats(),
      patterns: await patternTracker.getStats(),
      learning: ruleGenerator.getStats(),
      memory: await mongoVectorStore.getStats(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get agent statistics
 */
router.get('/agents', (req, res) => {
  try {
    const stats = agentRegistry.getStats();
    const health = agentRegistry.healthCheck();

    res.json({
      success: true,
      stats,
      health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get rule engine statistics
 */
router.get('/rules', (req, res) => {
  try {
    const stats = ruleEngine.getStats();
    const rules = ruleEngine.exportRules();

    res.json({
      success: true,
      stats,
      rules: rules.slice(0, 20) // Limit to 20 for performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get workflow statistics
 */
router.get('/workflows', async (req, res) => {
  try {
    const stats = workflowEngine.getStats();
    const executions = await workflowEngine.listExecutions(null, 10);

    res.json({
      success: true,
      stats,
      recentExecutions: executions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get learning statistics
 */
router.get('/learning', async (req, res) => {
  try {
    const patternStats = await patternTracker.getStats();
    const ruleGenStats = ruleGenerator.getStats();
    const patterns = await patternTracker.getPatterns(null, 0.7);

    res.json({
      success: true,
      patterns: patternStats,
      ruleGeneration: ruleGenStats,
      topPatterns: patterns.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get performance metrics
 */
router.get('/performance', (req, res) => {
  try {
    const metrics = {
      cache: cacheManager.getAllStats(),
      rateLimits: rateLimiter.getAllStats(),
      router: freeModelRouter.getStats(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get agentic score
 */
router.get('/agentic-score', async (req, res) => {
  try {
    const cacheStats = cacheManager.getAllStats();
    const ruleStats = ruleEngine.getStats();
    const routerStats = freeModelRouter.getStats();
    const patternStats = await patternTracker.getStats();
    const workflowStats = workflowEngine.getStats();

    // Calculate score components
    const caching = cacheStats.ai?.hitRate ? parseFloat(cacheStats.ai.hitRate) : 0;
    const ruleUsage = ruleStats.totalMatches > 0 ? 100 : 0;
    const learning = patternStats.totalPatterns > 0 ? 100 : 0;
    const workflows = workflowStats.registeredWorkflows > 0 ? 100 : 0;
    const autonomy = routerStats.cacheHitRate ? parseFloat(routerStats.cacheHitRate) : 0;

    const score = Math.round(
      (caching * 0.25) +
      (ruleUsage * 0.20) +
      (learning * 0.20) +
      (workflows * 0.15) +
      (autonomy * 0.20)
    );

    res.json({
      success: true,
      score,
      maxScore: 100,
      components: {
        caching: { score: Math.round(caching * 0.25), weight: '25%' },
        ruleUsage: { score: Math.round(ruleUsage * 0.20), weight: '20%' },
        learning: { score: Math.round(learning * 0.20), weight: '20%' },
        workflows: { score: Math.round(workflows * 0.15), weight: '15%' },
        autonomy: { score: Math.round(autonomy * 0.20), weight: '20%' }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Reset agent statistics
 */
router.post('/agents/reset-stats', (req, res) => {
  try {
    agentRegistry.resetAllStats();
    res.json({
      success: true,
      message: 'Agent statistics reset'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
