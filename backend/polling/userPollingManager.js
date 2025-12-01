import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getUserSettings } from '../utils/userSettings.js';
import { workItemPoller } from './workItemPoller.js';
import { buildPoller } from './buildPoller.js';
import { pullRequestPoller } from './pullRequestPoller.js';
import { pollingService } from '../services/pollingService.js';
import executionLock from './execution-lock.js';

class UserPollingManager {
  constructor() {
    this.activeJobs = new Map(); // userId → { workItems: cronJob, pullRequests: cronJob, overdue: cronJob }
    this.userLocks = new Set(); // Track users currently being set up
    this.initialized = false;
  }

  async destroyAllJobInstances(userId, jobType) {
    try {
      logger.debug(`🧹 [POLLING] Destroying all ${jobType} job instances for user ${userId}`);
      
      // Get all cron tasks and destroy matching ones
      const allTasks = cron.getTasks();
      let destroyedCount = 0;
      
      for (const [taskId, task] of allTasks) {
        // Check if this task belongs to our user/jobType (basic pattern matching)
        if (taskId.includes(userId) && taskId.includes(jobType)) {
          try {
            task.stop();
            destroyedCount++;
            logger.debug(`🗑️ [POLLING] Stopped task ${taskId}`);
          } catch (error) {
            logger.warn(`⚠️ [POLLING] Failed to stop task ${taskId}:`, error);
          }
        }
      }
      
      logger.debug(`🧹 [POLLING] Stopped ${destroyedCount} ${jobType} task instances for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to destroy job instances for ${userId}/${jobType}:`, error);
    }
  }

  async startUserPolling(userId) {
    try {
      logger.info(`🚀 [POLLING] Starting polling setup for user ${userId}`);
      
      // Prevent concurrent setup for the same user
      if (this.userLocks.has(userId)) {
        logger.warn(`⚠️ [POLLING] Setup already in progress for user ${userId}, skipping`);
        return;
      }
      
      this.userLocks.add(userId);
      logger.debug(`🔒 [POLLING] Added lock for user ${userId}`);
      
      // Get user settings to create/update database jobs
      const settings = await getUserSettings(userId);
      logger.debug(`📋 [POLLING] Retrieved settings for user ${userId}:`, {
        hasAzureDevOps: !!settings.azureDevOps,
        hasPolling: !!settings.polling,
        pollingConfig: settings.polling
      });
      
      // Validate required settings
      if (!settings.azureDevOps?.organization || !settings.azureDevOps?.project || !settings.azureDevOps?.pat) {
        logger.warn(`❌ [POLLING] User ${userId} missing required Azure DevOps settings, skipping polling`);
        this.userLocks.delete(userId);
        return;
      }

      // Stop any existing jobs for this user (both memory and database)
      logger.info(`🛑 [POLLING] Stopping existing jobs for user ${userId}`);
      await this.stopUserPolling(userId);
      
      // Ensure no duplicate database entries
      logger.debug(`🧹 [POLLING] Pausing database jobs for user ${userId}`);
      await pollingService.pauseUserJobs(userId);

      // Update database with current settings
      logger.info(`💾 [POLLING] Syncing jobs with settings for user ${userId}`);
      await this.syncJobsWithSettings(userId, settings.polling || {});

      // Get active jobs from database
      logger.debug(`📊 [POLLING] Fetching active jobs from database for user ${userId}`);
      const dbJobs = await pollingService.getActiveJobs(userId);
      logger.info(`📋 [POLLING] Found ${dbJobs.length} active jobs in database for user ${userId}:`, 
        dbJobs.map(job => ({ type: job.jobType, enabled: job.config.enabled, interval: job.config.interval }))
      );
      
      // Create cron jobs based on database config
      const userJobs = {};
      let createdCount = 0;
      
      for (const dbJob of dbJobs) {
        logger.debug(`🔍 [POLLING] Processing ${dbJob.jobType} job for user ${userId}:`, {
          enabled: dbJob.config.enabled,
          interval: dbJob.config.interval,
          isValidCron: cron.validate(dbJob.config.interval)
        });
        
        if (dbJob.config.enabled && cron.validate(dbJob.config.interval)) {
          logger.info(`⚙️ [POLLING] Creating cron job for ${dbJob.jobType} (user ${userId})`);
          const cronJob = this.createCronJob(userId, dbJob);
          if (cronJob) {
            userJobs[dbJob.jobType] = cronJob;
            cronJob.start();
            createdCount++;
            logger.info(`✅ [POLLING] Started ${dbJob.jobType} cron job for user ${userId}`);
          } else {
            logger.error(`❌ [POLLING] Failed to create ${dbJob.jobType} cron job for user ${userId}`);
          }
        } else {
          logger.debug(`⏭️ [POLLING] Skipping ${dbJob.jobType} job for user ${userId} (disabled or invalid cron)`);
        }
      }

      // Store in memory for quick access
      this.activeJobs.set(userId, userJobs);
      logger.info(`💾 [POLLING] Stored ${Object.keys(userJobs).length} jobs in memory for user ${userId}`);
      
      // Log current memory state
      logger.debug(`🧠 [POLLING] Current memory state:`, {
        totalUsers: this.activeJobs.size,
        userJobCounts: Array.from(this.activeJobs.entries()).map(([uid, jobs]) => ({
          userId: uid,
          jobCount: Object.keys(jobs).length,
          jobTypes: Object.keys(jobs)
        }))
      });
      
      logger.info(`🎉 [POLLING] Successfully started ${createdCount} polling jobs for user ${userId}`);
      
      // Release the lock
      this.userLocks.delete(userId);
      logger.debug(`🔓 [POLLING] Released lock for user ${userId}`);
      
    } catch (error) {
      // Always release the lock on error
      this.userLocks.delete(userId);
      logger.error(`💥 [POLLING] Failed to start polling for user ${userId}:`, error);
    }
  }

  async emergencyCleanup() {
    try {
      logger.info('Emergency cleanup: Destroying all cron jobs');
      
      // Clear all jobs from memory
      this.activeJobs.forEach((userJobs, userId) => {
        Object.values(userJobs).forEach(job => {
          if (job) {
            if (typeof job.destroy === 'function') {
              job.destroy();
            } else if (typeof job.stop === 'function') {
              job.stop();
            }
          }
        });
      });
      
      // Clear memory completely
      this.activeJobs.clear();
      this.userLocks.clear();
      
      // Also try to clear node-cron registry (nuclear option)
      const cron = await import('node-cron');
      const allTasks = cron.getTasks();
      for (const [key, task] of allTasks) {
        try {
          if (typeof task.destroy === 'function') {
            task.destroy();
          } else if (typeof task.stop === 'function') {
            task.stop();
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
      allTasks.clear();
      
      logger.info('Emergency cleanup completed');
    } catch (error) {
      logger.error('Emergency cleanup failed:', error);
    }
  }

  async stopUserPolling(userId) {
    try {
      const userJobs = this.activeJobs.get(userId);
      if (userJobs) {
        // Stop only this user's cron jobs with safe method checking
        Object.values(userJobs).forEach(job => {
          if (job) {
            if (typeof job.destroy === 'function') {
              job.destroy();
            } else if (typeof job.stop === 'function') {
              job.stop();
            }
          }
        });
        
        // Remove from memory
        this.activeJobs.delete(userId);
      }
      
      // Update database status to paused
      await pollingService.pauseUserJobs(userId);
      
      logger.info(`Stopped all polling jobs for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to stop polling for user ${userId}:`, error);
    }
  }

  async updateUserPolling(userId, newSettings) {
    try {
      logger.info(`🔄 [POLLING] Starting polling update for user ${userId}`);
      
      if (this.userLocks.has(userId)) {
        logger.warn(`⚠️ [POLLING] Update already in progress for user ${userId}, skipping`);
        return;
      }

      this.userLocks.add(userId);
      logger.debug(`🔒 [POLLING] Added update lock for user ${userId}`);
      
      // Get user settings to validate Azure DevOps config
      const settings = await getUserSettings(userId);
      logger.debug(`📋 [POLLING] Retrieved current settings for user ${userId}`);
      
      // Validate required settings
      if (!settings.azureDevOps?.organization || !settings.azureDevOps?.project || !settings.azureDevOps?.pat) {
        logger.warn(`❌ [POLLING] User ${userId} missing required Azure DevOps settings, skipping polling update`);
        this.userLocks.delete(userId);
        return;
      }
      
      // Get current jobs from database
      logger.debug(`📊 [POLLING] Fetching current jobs from database for user ${userId}`);
      const currentJobs = await pollingService.getJobsByUser(userId);
      const currentJobsMap = {};
      currentJobs.forEach(job => {
        currentJobsMap[job.jobType] = job;
      });
      
      logger.info(`📋 [POLLING] Current database jobs for user ${userId}:`, 
        currentJobs.map(job => ({ 
          type: job.jobType, 
          enabled: job.config.enabled, 
          interval: job.config.interval,
          status: job.status
        }))
      );

      const userJobs = this.activeJobs.get(userId) || {};
      logger.debug(`🧠 [POLLING] Current memory jobs for user ${userId}:`, {
        jobTypes: Object.keys(userJobs),
        jobCount: Object.keys(userJobs).length
      });
      
      // Check each job type for changes
      let changedCount = 0;
      for (const jobType of ['workItems', 'pullRequests', 'overdue']) {
        const currentJob = currentJobsMap[jobType];
        const hasChanged = this.hasJobConfigChanged(currentJob, newSettings.polling, jobType);
        
        logger.debug(`🔍 [POLLING] Checking ${jobType} job for user ${userId}:`, {
          hasCurrentJob: !!currentJob,
          currentConfig: currentJob ? {
            enabled: currentJob.config.enabled,
            interval: currentJob.config.interval
          } : null,
          newConfig: this.getJobConfig(jobType, newSettings.polling),
          hasChanged
        });
        
        if (hasChanged) {
          logger.info(`🔄 [POLLING] ${jobType} job changed for user ${userId}, updating...`);
          await this.updateSingleJob(userId, jobType, newSettings.polling, userJobs);
          changedCount++;
        } else {
          logger.debug(`✅ [POLLING] ${jobType} job unchanged for user ${userId}`);
        }
      }

      logger.info(`🎉 [POLLING] Update completed for user ${userId}: ${changedCount} jobs changed`);
      this.userLocks.delete(userId);
      logger.debug(`🔓 [POLLING] Released update lock for user ${userId}`);
      
    } catch (error) {
      this.userLocks.delete(userId);
      logger.error(`💥 [POLLING] Failed to update polling for user ${userId}:`, error);
    }
  }

  async updateSingleJob(userId, jobType, pollingConfig, userJobs) {
    try {
      logger.info(`🔧 [POLLING] Updating ${jobType} job for user ${userId}`);
      
      // CRITICAL: Destroy ALL existing cron jobs for this user/jobType
      await this.destroyAllJobInstances(userId, jobType);
      
      // Stop existing cron job with proper method checking
      if (userJobs[jobType]) {
        logger.debug(`🛑 [POLLING] Stopping existing ${jobType} job for user ${userId}`);
        try {
          userJobs[jobType].stop();
          logger.debug(`✅ [POLLING] Stopped ${jobType} job for user ${userId}`);
        } catch (error) {
          logger.warn(`⚠️ [POLLING] Failed to stop ${jobType} job for user ${userId}:`, error);
        }
        delete userJobs[jobType];
        logger.debug(`🗑️ [POLLING] Removed ${jobType} job from memory for user ${userId}`);
      }
      
      // Also check if there are any other jobs for this user/jobType in memory
      let duplicatesFound = 0;
      this.activeJobs.forEach((jobs, uid) => {
        if (uid === userId && jobs[jobType]) {
          logger.warn(`🚨 [POLLING] Found duplicate ${jobType} job for user ${userId}, removing...`);
          if (typeof jobs[jobType].destroy === 'function') {
            jobs[jobType].destroy();
            logger.debug(`✅ [POLLING] Destroyed duplicate ${jobType} job using destroy() for user ${userId}`);
          } else if (typeof jobs[jobType].stop === 'function') {
            jobs[jobType].stop();
            logger.debug(`✅ [POLLING] Stopped duplicate ${jobType} job using stop() for user ${userId}`);
          }
          delete jobs[jobType];
          duplicatesFound++;
        }
      });
      
      if (duplicatesFound > 0) {
        logger.warn(`🧹 [POLLING] Cleaned up ${duplicatesFound} duplicate ${jobType} jobs for user ${userId}`);
      }
      
      // Update database
      logger.debug(`💾 [POLLING] Updating ${jobType} job config in database for user ${userId}`);
      await pollingService.updateJobConfig(userId, jobType, pollingConfig);
      logger.debug(`✅ [POLLING] Database updated for ${jobType} job of user ${userId}`);
      
      // Create new cron job if enabled
      const jobConfig = this.getJobConfig(jobType, pollingConfig);
      logger.debug(`📋 [POLLING] New ${jobType} job config for user ${userId}:`, jobConfig);
      
      if (jobConfig.enabled && jobConfig.interval && cron.validate(jobConfig.interval)) {
        logger.info(`⚙️ [POLLING] Creating new ${jobType} cron job for user ${userId}`);
        const dbJob = { jobType, config: jobConfig };
        const cronJob = this.createCronJob(userId, dbJob);
        if (cronJob) {
          userJobs[jobType] = cronJob;
          cronJob.start();
          logger.info(`✅ [POLLING] Started new ${jobType} cron job for user ${userId} with interval: ${jobConfig.interval}`);
        } else {
          logger.error(`❌ [POLLING] Failed to create ${jobType} cron job for user ${userId}`);
        }
      } else {
        logger.info(`⏭️ [POLLING] Skipping ${jobType} job creation for user ${userId} (disabled or invalid cron)`);
      }
      
      // Update memory
      this.activeJobs.set(userId, userJobs);
      logger.debug(`💾 [POLLING] Updated memory for user ${userId}, now has ${Object.keys(userJobs).length} jobs`);
      
      logger.info(`🎉 [POLLING] Successfully updated ${jobType} job for user ${userId}`, {
        enabled: jobConfig.enabled,
        interval: jobConfig.interval,
        totalUserJobs: Object.keys(userJobs).length
      });
    } catch (error) {
      logger.error(`💥 [POLLING] Failed to update ${jobType} job for user ${userId}:`, error);
    }
  }

  createCronJob(userId, dbJob) {
    const { jobType, config } = dbJob;
    logger.debug(`🏗️ [POLLING] Creating cron job for ${jobType} (user ${userId}) with interval: ${config.interval}`);
    
    return cron.schedule(config.interval, async () => {
      // Acquire execution lock to prevent duplicates
      const executionId = executionLock.acquire(userId, jobType);
      if (!executionId) {
        logger.warn(`🔒 [POLLING] ${jobType} execution already running for user ${userId}, skipping`);
        return;
      }
      
      logger.info(`🚀 [POLLING] Starting ${jobType} execution ${executionId} for user ${userId}`);
      
      try {
        // Update last run time in database
        logger.debug(`💾 [POLLING] Updating last run time for ${jobType} execution ${executionId} (user ${userId})`);
        await pollingService.updateLastRun(userId, jobType);
        
        // Execute the appropriate poller
        switch (jobType) {
          case 'workItems':
            // DISABLED: Work items polling currently only logs sprint count, no notifications sent
            // Uncomment below to re-enable when functionality is added
            // logger.debug(`📋 [POLLING] Executing work items poller for ${executionId} (user ${userId})`);
            // await workItemPoller.pollWorkItems(userId);
            logger.info(`⏭️ [POLLING] Work items polling is disabled for ${executionId} (user ${userId})`);
            break;
          case 'pullRequests':
            logger.debug(`🔀 [POLLING] Executing pull requests poller for ${executionId} (user ${userId})`);
            await pullRequestPoller.pollPullRequests(userId);
            break;
          case 'overdue':
            logger.debug(`⏰ [POLLING] Executing overdue check for ${executionId} (user ${userId})`);
            await workItemPoller.checkOverdueItems(userId);
            break;
          default:
            throw new Error(`Unknown job type: ${jobType}`);
        }
        
        // Update success status in database
        logger.debug(`✅ [POLLING] Updating success status for ${jobType} execution ${executionId} (user ${userId})`);
        await pollingService.updateJobResult(userId, jobType, 'success');
        
        logger.info(`🎉 [POLLING] Completed ${jobType} execution ${executionId} for user ${userId} successfully`);
        
      } catch (error) {
        logger.error(`💥 [POLLING] ${jobType} execution ${executionId} failed for user ${userId}:`, error);
        
        // Update error status in database
        try {
          await pollingService.updateJobResult(userId, jobType, 'error', error.message);
          logger.debug(`📝 [POLLING] Updated error status for ${jobType} execution ${executionId} (user ${userId})`);
        } catch (dbError) {
          logger.error(`💥 [POLLING] Failed to update error status for ${jobType} execution ${executionId} (user ${userId}):`, dbError);
        }
      } finally {
        // Always release the execution lock
        executionLock.release(userId, jobType, executionId);
      }
    }, { 
      scheduled: false,
      name: `${userId}-${jobType}-${Date.now()}` // Unique name for tracking
    });
  }

  async syncJobsWithSettings(userId, pollingConfig) {
    try {
      // Sync all three job types with current settings
      await pollingService.updateJobConfig(userId, 'workItems', pollingConfig);
      await pollingService.updateJobConfig(userId, 'pullRequests', pollingConfig);
      await pollingService.updateJobConfig(userId, 'overdue', pollingConfig);
    } catch (error) {
      logger.error(`Failed to sync jobs with settings for user ${userId}:`, error);
    }
  }

  getJobConfig(jobType, pollingConfig) {
    const configMap = {
      workItems: {
        enabled: pollingConfig.workItemsEnabled || false,
        interval: pollingConfig.workItemsInterval || '*/10 * * * *'
      },
      pullRequests: {
        enabled: pollingConfig.pullRequestEnabled || false,
        interval: pollingConfig.pullRequestInterval || '0 */10 * * *'
      },
      overdue: {
        enabled: pollingConfig.overdueCheckEnabled || false,
        interval: pollingConfig.overdueCheckInterval || '0 */10 * * *'
      }
    };

    return configMap[jobType] || { enabled: false, interval: '*/10 * * * *' };
  }

  hasJobConfigChanged(currentJob, newPollingConfig, jobType) {
    if (!currentJob) return true; // No existing job, so it's a change
    
    const newConfig = this.getJobConfig(jobType, newPollingConfig);
    
    return (
      currentJob.config.enabled !== newConfig.enabled ||
      currentJob.config.interval !== newConfig.interval
    );
  }

  getUserPollingStatus(userId) {
    const jobs = this.activeJobs.get(userId);
    if (!jobs) return null;
    
    return Object.keys(jobs).reduce((status, jobName) => {
      status[jobName] = jobs[jobName] ? true : false;
      return status;
    }, {});
  }

  getAllUsersStatus() {
    const status = {};
    this.activeJobs.forEach((jobs, userId) => {
      status[userId] = this.getUserPollingStatus(userId);
    });
    return status;
  }

  async initializeFromDatabase() {
    if (this.initialized) {
      logger.warn('User polling manager already initialized, skipping');
      return;
    }
    
    try {
      // Get all users with active polling jobs
      const activeUsers = await pollingService.getActiveUsers();
      
      logger.info(`Initializing polling for ${activeUsers.length} users from database`);
      
      for (const userId of activeUsers) {
        try {
          await this.startUserPolling(userId);
        } catch (error) {
          logger.error(`Failed to initialize polling for user ${userId}:`, error);
        }
      }
      
      this.initialized = true;
      logger.info('Database polling initialization complete');
    } catch (error) {
      logger.error('Failed to initialize polling from database:', error);
    }
  }

  // Legacy method name for backward compatibility
  async initializeAllUsers() {
    return await this.initializeFromDatabase();
  }
}

export const userPollingManager = new UserPollingManager();
