import { logger } from '../utils/logger.js';
import { mongoVectorStore } from './MongoVectorStore.js';

/**
 * Context Manager - Builds context for AI queries from memories
 * All operations are scoped by organizationId for multi-tenant isolation
 */
class ContextManager {
  constructor() {
    this.maxContextTokens = 2000; // Reserve tokens for context
  }

  /**
   * Build context for a task
   * @param {Object} task - Task object (should include organizationId for multi-tenant)
   * @param {Object} options - Context building options
   */
  async buildContext(task, options = {}) {
    const {
      maxMemories = 5,
      includeMetadata = true,
      filterType = null,
      organizationId = null
    } = options;

    // Get organizationId from options, task, or task.data
    const orgId = organizationId || task.organizationId || task.data?.organizationId || null;

    try {
      // Get relevant memories (scoped to organization)
      const memories = await this.retrieveRelevant(task.description || task.data, maxMemories, orgId);

      // Filter by type if specified
      const filtered = filterType
        ? memories.filter(m => m.metadata?.type === filterType)
        : memories;

      // Build context string
      const context = this.formatContext(filtered, includeMetadata);

      logger.debug('Context built', {
        taskType: task.type,
        organizationId: orgId,
        memoriesFound: filtered.length,
        contextLength: context.length
      });

      return {
        context,
        memories: filtered,
        count: filtered.length
      };
    } catch (error) {
      logger.error('Failed to build context:', error);
      return {
        context: '',
        memories: [],
        count: 0
      };
    }
  }

  /**
   * Retrieve relevant memories - scoped to organization
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @param {string} organizationId - Required for multi-tenant isolation
   */
  async retrieveRelevant(query, limit = 5, organizationId = null) {
    try {
      const results = await mongoVectorStore.searchSimilar(query, organizationId, limit);
      return results;
    } catch (error) {
      logger.error('Failed to retrieve memories:', error);
      return [];
    }
  }

  /**
   * Format memories into context string
   */
  formatContext(memories, includeMetadata = true) {
    if (memories.length === 0) {
      return '';
    }

    const formatted = memories.map((memory, index) => {
      let text = `[Memory ${index + 1}]`;
      
      if (includeMetadata && memory.metadata) {
        const meta = [];
        if (memory.metadata.type) meta.push(`Type: ${memory.metadata.type}`);
        if (memory.metadata.timestamp) meta.push(`Date: ${new Date(memory.metadata.timestamp).toLocaleDateString()}`);
        if (meta.length > 0) {
          text += ` (${meta.join(', ')})`;
        }
      }

      text += `\n${memory.content}`;
      
      if (memory.score) {
        text += `\n(Relevance: ${(memory.score * 100).toFixed(0)}%)`;
      }

      return text;
    }).join('\n\n');

    return `Previous relevant experiences:\n\n${formatted}`;
  }

  /**
   * Store new memory - scoped to organization
   * @param {string} content - Content to store
   * @param {Object} metadata - Additional metadata
   * @param {string} organizationId - Required for multi-tenant isolation
   */
  async storeMemory(content, metadata = {}, organizationId = null) {
    try {
      const memory = await mongoVectorStore.store(content, metadata, organizationId);
      if (memory) {
        logger.debug('Memory stored', { id: memory._id, organizationId });
      }
      return memory;
    } catch (error) {
      logger.error('Failed to store memory:', error);
      return null;
    }
  }

  /**
   * Store task outcome as memory - scoped to organization
   * @param {Object} task - The task that was executed
   * @param {Object} result - The result of the execution
   * @param {string} organizationId - Required for multi-tenant isolation
   */
  async storeTaskOutcome(task, result, organizationId = null) {
    // Get organizationId from parameter, task, or task.data
    const orgId = organizationId || task.organizationId || task.data?.organizationId || null;
    
    const content = this.formatTaskOutcome(task, result);
    const metadata = {
      type: task.type,
      category: task.category,
      success: result.success,
      timestamp: new Date()
    };

    return await this.storeMemory(content, metadata, orgId);
  }

  /**
   * Format task outcome for storage
   */
  formatTaskOutcome(task, result) {
    let content = `Task: ${task.type}\n`;
    content += `Description: ${task.description || 'N/A'}\n`;
    
    if (result.success) {
      content += `Outcome: Success\n`;
      if (result.result?.solution) {
        content += `Solution: ${result.result.solution}\n`;
      }
      if (result.result?.action) {
        content += `Action: ${result.result.action}\n`;
      }
    } else {
      content += `Outcome: Failed\n`;
      content += `Error: ${result.error}\n`;
    }

    return content;
  }

  /**
   * Get context statistics - optionally scoped to organization
   * @param {string} organizationId - If provided, stats for this org only
   */
  async getStats(organizationId = null) {
    return await mongoVectorStore.getStats(organizationId);
  }

  /**
   * Cleanup old memories - optionally scoped to organization
   * @param {number} olderThanDays - Days threshold
   * @param {string} organizationId - If provided, cleanup only for this org
   */
  async cleanup(olderThanDays = 30, organizationId = null) {
    return await mongoVectorStore.cleanup(olderThanDays, organizationId);
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
export default contextManager;
