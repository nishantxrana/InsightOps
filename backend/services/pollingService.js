import { PollingJob } from '../models/PollingJob.js';
import { logger } from '../utils/logger.js';

class PollingService {
  /**
   * Create or update a polling job for a user
   */
  async createOrUpdateJob(userId, jobType, config) {
    try {
      const job = await PollingJob.findOneAndUpdate(
        { userId, jobType },
        { 
          userId, 
          jobType, 
          config: {
            enabled: config.enabled || false,
            interval: config.interval,
            lastResult: 'pending'
          },
          status: 'active',
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      
      logger.debug(`Created/updated ${jobType} job for user ${userId}`, {
        enabled: config.enabled,
        interval: config.interval
      });
      
      return job;
    } catch (error) {
      logger.error(`Failed to create/update ${jobType} job for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active jobs for a user
   */
  async getActiveJobs(userId) {
    try {
      return await PollingJob.find({
        userId,
        status: 'active',
        'config.enabled': true
      });
    } catch (error) {
      logger.error(`Failed to get active jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all jobs for a user (active and inactive)
   */
  async getJobsByUser(userId) {
    try {
      return await PollingJob.find({ userId });
    } catch (error) {
      logger.error(`Failed to get jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Pause all jobs for a user
   */
  async pauseUserJobs(userId) {
    try {
      const result = await PollingJob.updateMany(
        { userId },
        { 
          status: 'paused', 
          updatedAt: new Date() 
        }
      );
      
      logger.info(`Paused ${result.modifiedCount} jobs for user ${userId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to pause jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update last run time for a job
   */
  async updateLastRun(userId, jobType) {
    try {
      await PollingJob.findOneAndUpdate(
        { userId, jobType },
        { 
          'config.lastRun': new Date(),
          updatedAt: new Date()
        }
      );
    } catch (error) {
      logger.error(`Failed to update last run for ${userId}/${jobType}:`, error);
      throw error;
    }
  }

  /**
   * Update job result
   */
  async updateJobResult(userId, jobType, result, errorMessage = null) {
    try {
      const updateData = {
        'config.lastResult': result,
        updatedAt: new Date()
      };
      
      if (errorMessage) {
        updateData['config.lastError'] = errorMessage;
      }
      
      await PollingJob.findOneAndUpdate(
        { userId, jobType },
        updateData
      );
    } catch (error) {
      logger.error(`Failed to update job result for ${userId}/${jobType}:`, error);
      throw error;
    }
  }
  async updateJobConfig(userId, jobType, pollingConfig) {
    try {
      const configMap = {
        workItems: {
          enabled: pollingConfig.workItemsEnabled,
          interval: pollingConfig.workItemsInterval
        },
        pullRequests: {
          enabled: pollingConfig.pullRequestEnabled,
          interval: pollingConfig.pullRequestInterval
        },
        overdue: {
          enabled: pollingConfig.overdueCheckEnabled,
          interval: pollingConfig.overdueCheckInterval
        }
      };

      const config = configMap[jobType];
      if (!config) {
        throw new Error(`Unknown job type: ${jobType}`);
      }

      return await this.createOrUpdateJob(userId, jobType, config);
    } catch (error) {
      logger.error(`Failed to update ${jobType} config for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update job last run time
   */
  async updateLastRun(userId, jobType) {
    try {
      return await PollingJob.updateOne(
        { userId, jobType },
        { 
          'config.lastRun': new Date(),
          'config.lastResult': 'pending',
          updatedAt: new Date()
        }
      );
    } catch (error) {
      logger.error(`Failed to update last run for ${jobType} job of user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update job execution result
   */
  async updateJobResult(userId, jobType, result, error = null) {
    try {
      const update = {
        'config.lastResult': result,
        updatedAt: new Date()
      };
      
      if (error) {
        update['config.lastError'] = error;
        update.status = 'error';
      } else if (result === 'success') {
        update['config.lastError'] = null;
        update.status = 'active';
      }
      
      return await PollingJob.updateOne({ userId, jobType }, update);
    } catch (error) {
      logger.error(`Failed to update result for ${jobType} job of user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all users with active polling jobs
   */
  async getActiveUsers() {
    try {
      const result = await PollingJob.distinct('userId', {
        status: 'active',
        'config.enabled': true
      });
      return result.map(id => id.toString());
    } catch (error) {
      logger.error('Failed to get active users:', error);
      throw error;
    }
  }

  /**
   * Clean up stale jobs
   */
  async cleanupStaleJobs(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const result = await PollingJob.deleteMany({
        status: 'paused',
        updatedAt: { $lt: cutoffDate }
      });
      
      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} stale polling jobs`);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to cleanup stale jobs:', error);
      throw error;
    }
  }

  /**
   * Get job status for a user
   */
  async getUserJobStatus(userId) {
    try {
      const jobs = await this.getJobsByUser(userId);
      const status = {};
      
      for (const job of jobs) {
        status[job.jobType] = {
          enabled: job.config.enabled,
          status: job.status,
          lastRun: job.config.lastRun,
          lastResult: job.config.lastResult,
          lastError: job.config.lastError,
          interval: job.config.interval
        };
      }
      
      return status;
    } catch (error) {
      logger.error(`Failed to get job status for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if job configuration has changed
   */
  hasJobConfigChanged(oldConfig, newConfig, jobType) {
    const configMap = {
      workItems: {
        enabled: 'workItemsEnabled',
        interval: 'workItemsInterval'
      },
      pullRequests: {
        enabled: 'pullRequestEnabled', 
        interval: 'pullRequestInterval'
      },
      overdue: {
        enabled: 'overdueCheckEnabled',
        interval: 'overdueCheckInterval'
      }
    };

    const fields = configMap[jobType];
    if (!fields) return false;

    return (
      oldConfig?.[fields.enabled] !== newConfig?.[fields.enabled] ||
      oldConfig?.[fields.interval] !== newConfig?.[fields.interval]
    );
  }
}

export const pollingService = new PollingService();
