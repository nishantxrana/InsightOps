import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { cacheManager } from '../cache/CacheManager.js';

/**
 * MongoDB Atlas Vector Store
 * Uses free Atlas Vector Search for embeddings
 */
class MongoVectorStore {
  constructor() {
    this.initialized = false;
    this.embeddingCache = cacheManager.caches.embeddings;
  }

  /**
   * Initialize vector search (create index if needed)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Vector index creation is done via Atlas UI or mongosh
      // This just verifies the collection exists
      const collections = await mongoose.connection.db.listCollections({ name: 'memories' }).toArray();
      
      if (collections.length === 0) {
        logger.info('Memories collection will be created on first insert');
      }

      this.initialized = true;
      logger.info('MongoVectorStore initialized');
    } catch (error) {
      logger.error('Failed to initialize MongoVectorStore:', error);
      throw error;
    }
  }

  /**
   * Store memory with embedding
   */
  async store(content, metadata = {}) {
    try {
      // Generate embedding
      const embedding = await this.getEmbedding(content);

      // Store in MongoDB
      const Memory = mongoose.model('Memory');
      const memory = await Memory.create({
        content,
        embedding,
        metadata,
        createdAt: new Date(),
        accessCount: 0
      });

      logger.debug('Memory stored', { id: memory._id, contentLength: content.length });
      return memory;
    } catch (error) {
      logger.error('Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Search similar memories using vector search
   */
  async searchSimilar(query, limit = 5) {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      const Memory = mongoose.model('Memory');

      // Use MongoDB Atlas Vector Search
      const results = await Memory.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: limit
          }
        },
        {
          $project: {
            content: 1,
            metadata: 1,
            score: { $meta: 'vectorSearchScore' },
            createdAt: 1
          }
        }
      ]);

      // Update access count
      const ids = results.map(r => r._id);
      if (ids.length > 0) {
        await Memory.updateMany(
          { _id: { $in: ids } },
          { $inc: { accessCount: 1 } }
        );
      }

      logger.debug('Vector search completed', { query: query.substring(0, 50), results: results.length });
      return results;
    } catch (error) {
      logger.warn('Vector search failed, returning empty results:', error.message);
      return [];
    }
  }

  /**
   * Get embedding using free Hugging Face API or fallback
   */
  async getEmbedding(text) {
    // Check cache first
    const cacheKey = this.hashText(text);
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try Hugging Face API (requires no auth for public models)
      const response = await fetch(
        'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
        }
      );

      if (response.ok) {
        const embedding = await response.json();
        
        // Cache the embedding (no expiry)
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
      }
      
      // Fallback to simple embedding
      logger.debug('Using fallback embedding generation');
      return this.generateSimpleEmbedding(text);
      
    } catch (error) {
      logger.debug('Hugging Face API unavailable, using fallback');
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Generate simple embedding from text (fallback)
   * Uses character-based hashing for basic similarity
   */
  generateSimpleEmbedding(text) {
    const embedding = new Array(384).fill(0);
    const normalized = text.toLowerCase();
    
    // Simple character frequency embedding
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = charCode % 384;
      embedding[index] += 1 / normalized.length;
    }
    
    // Add word-based features
    const words = normalized.split(/\s+/);
    words.forEach((word, idx) => {
      const wordHash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = wordHash % 384;
      embedding[index] += 0.5 / words.length;
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    // Cache it
    this.embeddingCache.set(this.hashText(text), embedding);
    
    return embedding;
  }

  /**
   * Hash text for cache key
   */
  hashText(text) {
    return cacheManager.generateKey('emb', text);
  }

  /**
   * Get memory by ID
   */
  async getById(id) {
    try {
      const Memory = mongoose.model('Memory');
      return await Memory.findById(id);
    } catch (error) {
      logger.error('Failed to get memory:', error);
      return null;
    }
  }

  /**
   * Delete old memories (cleanup)
   */
  async cleanup(olderThanDays = 30) {
    try {
      const Memory = mongoose.model('Memory');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await Memory.deleteMany({
        createdAt: { $lt: cutoffDate },
        accessCount: 0 // Only delete unused memories
      });

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old memories`);
      }

      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup memories:', error);
      return 0;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const Memory = mongoose.model('Memory');
      const total = await Memory.countDocuments();
      const recentCount = await Memory.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      return {
        total,
        recent: recentCount,
        cacheSize: this.embeddingCache.cache.size
      };
    } catch (error) {
      logger.error('Failed to get memory stats:', error);
      return { total: 0, recent: 0, cacheSize: 0 };
    }
  }
}

// Export singleton instance
export const mongoVectorStore = new MongoVectorStore();
export default mongoVectorStore;
