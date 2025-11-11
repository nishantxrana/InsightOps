import { logger } from '../utils/logger.js';
import { monitorAgent } from './MonitorAgent.js';
import { analyzeAgent } from './AnalyzeAgent.js';
import { executeAgent } from './ExecuteAgent.js';

/**
 * Central registry for all agents
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.initialized = false;
  }

  /**
   * Initialize and register all agents
   */
  initialize() {
    if (this.initialized) return;

    // Register agents
    this.register(monitorAgent);
    this.register(analyzeAgent);
    this.register(executeAgent);

    this.initialized = true;
    logger.info(`AgentRegistry initialized with ${this.agents.size} agents`);
  }

  /**
   * Register an agent
   */
  register(agent) {
    this.agents.set(agent.type, agent);
    logger.debug(`Registered agent: ${agent.name} (${agent.type})`);
  }

  /**
   * Get agent by type
   */
  get(type) {
    return this.agents.get(type);
  }

  /**
   * Get all agents
   */
  getAll() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent statistics
   */
  getStats() {
    const stats = {};
    
    for (const [type, agent] of this.agents.entries()) {
      stats[type] = agent.getStats();
    }

    return stats;
  }

  /**
   * Reset all agent statistics
   */
  resetAllStats() {
    for (const agent of this.agents.values()) {
      agent.resetStats();
    }
    logger.info('All agent stats reset');
  }

  /**
   * Health check for all agents
   */
  healthCheck() {
    const health = {
      healthy: true,
      agents: {}
    };

    for (const [type, agent] of this.agents.entries()) {
      const agentHealth = {
        name: agent.name,
        type: agent.type,
        stats: agent.getStats()
      };

      health.agents[type] = agentHealth;
    }

    return health;
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry();
export default agentRegistry;
