import { logger } from '../utils/logger.js';
import { mongoVectorStore } from './MongoVectorStore.js';

/**
 * Context Manager - Builds context for AI queries from memories
 */
class ContextManager {
  constructor() {
    this.maxContextTokens = 2000; // Reserve tokens for context
  }

  /**
   * Build context for a task
   */
  async buildContext(task, options = {}) {
    const {
      maxMemories = 5,
      includeMetadata = true,
      filterType = null
    } = options;

    try {
      // Get relevant memories
      const memories = await this.retrieveRelevant(task.description || task.data, maxMemories);

      // Filter by type if specified
      const filtered = filterType
        ? memories.filter(m => m.metadata?.type === filterType)
        : memories;

      // Build context string
      const context = this.formatContext(filtered, includeMetadata);

      logger.debug('Context built', {
        taskType: task.type,
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
   * Retrieve relevant memories
   */
  async retrieveRelevant(query, limit = 5) {
    try {
      const results = await mongoVectorStore.searchSimilar(query, limit);
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
   * Store new memory
   */
  async storeMemory(content, metadata = {}) {
    try {
      const memory = await mongoVectorStore.store(content, metadata);
      logger.debug('Memory stored', { id: memory._id });
      return memory;
    } catch (error) {
      logger.error('Failed to store memory:', error);
      return null;
    }
  }

  /**
   * Store task outcome as memory
   */
  async storeTaskOutcome(task, result) {
    const content = this.formatTaskOutcome(task, result);
    const metadata = {
      type: task.type,
      category: task.category,
      success: result.success,
      timestamp: new Date()
    };

    return await this.storeMemory(content, metadata);
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
   * Get context statistics
   */
  async getStats() {
    return await mongoVectorStore.getStats();
  }

  /**
   * Cleanup old memories
   */
  async cleanup(olderThanDays = 30) {
    return await mongoVectorStore.cleanup(olderThanDays);
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
export default contextManager;
