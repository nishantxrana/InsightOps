import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getUserSettings } from '../utils/userSettings.js';
import { workItemPoller } from './workItemPoller.js';
import { buildPoller } from './buildPoller.js';
import { pullRequestPoller } from './pullRequestPoller.js';
import { UserSettings } from '../models/UserSettings.js';

class UserPollingManager {
  constructor() {
    this.userJobs = new Map(); // userId -> { workItems, builds, pullRequests, overdue }
    this.initialized = false;
    this.userLocks = new Set(); // Track users currently being set up
  }

  async startUserPolling(userId) {
    try {
      // Prevent concurrent setup for the same user
      if (this.userLocks.has(userId)) {
        logger.warn(`Polling setup already in progress for user ${userId}, skipping`);
        return;
      }
      
      this.userLocks.add(userId);
      logger.info(`Starting polling setup for user ${userId}`);
      
      // Always stop existing jobs first to prevent duplicates
      this.stopUserPolling(userId);
      
      const settings = await getUserSettings(userId);
      
      // Validate required settings
      if (!settings.azureDevOps?.organization || !settings.azureDevOps?.project || !settings.azureDevOps?.pat) {
        logger.warn(`User ${userId} missing required Azure DevOps settings, skipping polling`);
        return;
      }

      const jobs = {};
      const polling = settings.polling || {};

      // Work Items polling
      if (polling.workItemsEnabled === true && polling.workItemsInterval && cron.validate(polling.workItemsInterval)) {
        jobs.workItems = cron.schedule(polling.workItemsInterval, async () => {
          try {
            // Add user context to identify this job
            logger.debug(`Work items job running for user ${userId}`);
            await workItemPoller.pollWorkItems(userId);
          } catch (error) {
            logger.error(`Work items polling error for user ${userId}:`, error);
          }
        }, { scheduled: false });
        jobs.workItems.userId = userId; // Tag the job with userId
        jobs.workItems.start();
      }

      // Build polling removed - using webhooks for real-time build notifications

      // Pull Request polling
      if (polling.pullRequestEnabled === true && polling.pullRequestInterval && cron.validate(polling.pullRequestInterval)) {
        jobs.pullRequests = cron.schedule(polling.pullRequestInterval, async () => {
          try {
            logger.debug(`PR job running for user ${userId}`);
            await pullRequestPoller.pollPullRequests(userId);
          } catch (error) {
            logger.error(`PR polling error for user ${userId}:`, error);
          }
        }, { scheduled: false });
        jobs.pullRequests.userId = userId;
        jobs.pullRequests.start();
      }

      // Overdue check
      if (polling.overdueCheckEnabled === true && polling.overdueCheckInterval && cron.validate(polling.overdueCheckInterval)) {
        jobs.overdue = cron.schedule(polling.overdueCheckInterval, async () => {
          try {
            logger.debug(`Overdue job running for user ${userId}`);
            await workItemPoller.checkOverdueItems(userId);
          } catch (error) {
            logger.error(`Overdue check error for user ${userId}:`, error);
          }
        }, { scheduled: false });
        jobs.overdue.userId = userId;
        jobs.overdue.start();
      }

      this.userJobs.set(userId, jobs);
      
      const jobCount = Object.keys(jobs).length;
      logger.info(`Started ${jobCount} polling jobs for user ${userId}`);
      
      // Release the lock
      this.userLocks.delete(userId);
      
    } catch (error) {
      // Always release the lock on error
      this.userLocks.delete(userId);
      logger.error(`Failed to start polling for user ${userId}:`, error);
    }
  }

  stopUserPolling(userId) {
    // Debug: Check what's in the cron registry
    const allTasks = cron.getTasks();
    logger.info(`DEBUG: Found ${allTasks.size} tasks in cron registry`);
    
    let destroyedCount = 0;
    for (const [key, task] of allTasks) {
      try {
        logger.info(`DEBUG: Destroying task ${key}`);
        // Try different destroy methods
        if (typeof task.destroy === 'function') {
          task.destroy();
        } else if (typeof task.stop === 'function') {
          task.stop();
        }
        destroyedCount++;
      } catch (error) {
        logger.error(`DEBUG: Error destroying task ${key}:`, error.message);
      }
    }
    
    // Also try to clear the tasks registry directly
    try {
      allTasks.clear();
      logger.info('DEBUG: Cleared cron tasks registry');
    } catch (error) {
      logger.error('DEBUG: Error clearing registry:', error.message);
    }
    
    // Clear ALL tracking
    this.userJobs.clear();
    this.userLocks.clear();
    
    logger.info(`RESET: Destroyed ${destroyedCount} cron jobs for clean slate`);
  }

  getUserPollingStatus(userId) {
    const jobs = this.userJobs.get(userId);
    if (!jobs) return null;
    
    return Object.keys(jobs).reduce((status, jobName) => {
      status[jobName] = jobs[jobName].running || false;
      return status;
    }, {});
  }

  getAllUsersStatus() {
    const status = {};
    this.userJobs.forEach((jobs, userId) => {
      status[userId] = this.getUserPollingStatus(userId);
    });
    return status;
  }

  async initializeAllUsers() {
    if (this.initialized) {
      logger.warn('User polling manager already initialized, skipping');
      return;
    }
    
    try {
      // Get all users with valid Azure DevOps settings
      const users = await UserSettings.find({
        'azureDevOps.organization': { $exists: true, $ne: '' },
        'azureDevOps.project': { $exists: true, $ne: '' },
        'azureDevOps.pat': { $exists: true, $ne: '' }
      });
      
      logger.info(`Initializing polling for ${users.length} users`);
      
      for (const user of users) {
        try {
          await this.startUserPolling(user._id.toString());
        } catch (error) {
          logger.error(`Failed to initialize polling for user ${user._id}:`, error);
        }
      }
      
      this.initialized = true;
      logger.info('User polling initialization complete');
    } catch (error) {
      logger.error('Failed to initialize user polling:', error);
    }
  }
}

export const userPollingManager = new UserPollingManager();
