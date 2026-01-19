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
import { createRequestLogger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication
router.use(authenticate);

/**
 * Get comprehensive system overview
 */
router.get('/overview', async (req, res) => {
  const log = createRequestLogger(req, 'agent-dashboard');
  try {
    // Use organization context for scoped stats, fall back to global for system stats
    const organizationId = req.organizationId ? req.organizationId.toString() : null;

    const overview = {
      agents: agentRegistry.getStats(),
      rules: ruleEngine.getStats(),
      workflows: workflowEngine.getStats(),
      cache: cacheManager.getAllStats(),
      rateLimits: rateLimiter.getAllStats(),
      router: freeModelRouter.getStats(),
      patterns: await patternTracker.getStats(),
      learning: ruleGenerator.getStats(),
      memory: await mongoVectorStore.getStats(organizationId),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      overview
    });
  } catch (error) {
    log.error('Failed to get system overview', { error: error.message, action: 'get-overview' });
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
  const log = createRequestLogger(req, 'agent-dashboard');
  try {
    const stats = agentRegistry.getStats();
    const health = agentRegistry.healthCheck();

    res.json({
      success: true,
      stats,
      health
    });
  } catch (error) {
    log.error('Failed to get agent stats', { error: error.message, action: 'get-agents' });
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
  const log = createRequestLogger(req, 'agent-dashboard');
  try {
    const stats = ruleEngine.getStats();
    const rules = ruleEngine.exportRules();

    res.json({
      success: true,
      stats,
      rules: rules.slice(0, 20) // Limit to 20 for performance
    });
  } catch (error) {
    log.error('Failed to get rule stats', { error: error.message, action: 'get-rules' });
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
  const log = createRequestLogger(req, 'agent-dashboard');
  try {
    const stats = workflowEngine.getStats();
    const executions = await workflowEngine.listExecutions(null, 10);

    res.json({
      success: true,
      stats,
      recentExecutions: executions
    });
  } catch (error) {
    log.error('Failed to get workflow stats', { error: error.message, action: 'get-workflows' });
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
  const log = createRequestLogger(req, 'agent-dashboard');
  try {
    // Use organization context for scoped patterns
    const organizationId = req.organizationId ? req.organizationId.toString() : null;
    
    const patternStats = await patternTracker.getStats();
    const ruleGenStats = ruleGenerator.getStats();
    
    // Get patterns for current organization (if available)
    const patterns = organizationId 
      ? await patternTracker.getPatterns(organizationId, null, 0.7)
      : [];

    res.json({
      success: true,
      patterns: patternStats,
      ruleGeneration: ruleGenStats,
      topPatterns: patterns.slice(0, 10),
      organizationId
    });
  } catch (error) {
    log.error('Failed to get learning stats', { error: error.message, action: 'get-learning' });
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
  const log = createRequestLogger(req, 'agent-dashboard');
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
    log.error('Failed to get performance metrics', { error: error.message, action: 'get-performance' });
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
  const log = createRequestLogger(req, 'agent-dashboard');
  try {
    const cacheStats = cacheManager.getAllStats();
    const ruleStats = ruleEngine.getStats();
    const routerStats = freeModelRouter.getStats();
    const patternStats = await patternTracker.getStats(); // System-wide stats for score
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
    log.error('Failed to get agentic score', { error: error.message, action: 'get-agentic-score' });
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
  const log = createRequestLogger(req, 'agent-dashboard');
  try {
    agentRegistry.resetAllStats();
    log.info('Agent stats reset', { action: 'reset-agent-stats' });
    res.json({
      success: true,
      message: 'Agent statistics reset'
    });
  } catch (error) {
    log.error('Failed to reset agent stats', { error: error.message, action: 'reset-agent-stats' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
