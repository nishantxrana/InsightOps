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
  }

  async startUserPolling(userId) {
    try {
      const settings = await getUserSettings(userId);
      
      // Validate required settings
      if (!settings.azureDevOps?.organization || !settings.azureDevOps?.project || !settings.azureDevOps?.pat) {
        logger.warn(`User ${userId} missing required Azure DevOps settings, skipping polling`);
        return;
      }

      // Stop existing jobs for this user
      this.stopUserPolling(userId);

      const jobs = {};
      const polling = settings.polling || {};

      // Work Items polling
      if (polling.workItemsInterval && cron.validate(polling.workItemsInterval)) {
        jobs.workItems = cron.schedule(polling.workItemsInterval, async () => {
          try {
            await workItemPoller.pollWorkItems(userId);
          } catch (error) {
            logger.error(`Work items polling error for user ${userId}:`, error);
          }
        });
        jobs.workItems.start();
      }

      // Build polling removed - using webhooks for real-time build notifications

      // Pull Request polling
      if (polling.pullRequestInterval && cron.validate(polling.pullRequestInterval)) {
        jobs.pullRequests = cron.schedule(polling.pullRequestInterval, async () => {
          try {
            await pullRequestPoller.pollPullRequests(userId);
          } catch (error) {
            logger.error(`PR polling error for user ${userId}:`, error);
          }
        });
        jobs.pullRequests.start();
      }

      // Overdue check
      if (polling.overdueCheckInterval && cron.validate(polling.overdueCheckInterval)) {
        jobs.overdue = cron.schedule(polling.overdueCheckInterval, async () => {
          try {
            await workItemPoller.checkOverdueItems(userId);
          } catch (error) {
            logger.error(`Overdue check error for user ${userId}:`, error);
          }
        });
        jobs.overdue.start();
      }

      this.userJobs.set(userId, jobs);
      logger.info(`Started polling jobs for user ${userId}`);
      
    } catch (error) {
      logger.error(`Failed to start polling for user ${userId}:`, error);
    }
  }

  stopUserPolling(userId) {
    const jobs = this.userJobs.get(userId);
    if (jobs) {
      Object.values(jobs).forEach(job => job.destroy());
      this.userJobs.delete(userId);
      logger.info(`Stopped polling jobs for user ${userId}`);
    }
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
    try {
      // Get all users with valid Azure DevOps settings
      const users = await UserSettings.find({
        'azureDevOps.organization': { $exists: true, $ne: '' },
        'azureDevOps.project': { $exists: true, $ne: '' },
        'azureDevOps.personalAccessToken': { $exists: true, $ne: '' }
      });
      
      logger.info(`Initializing polling for ${users.length} users`);
      
      for (const user of users) {
        try {
          await this.startUserPolling(user._id.toString());
        } catch (error) {
          logger.error(`Failed to initialize polling for user ${user._id}:`, error);
        }
      }
      
      logger.info('User polling initialization complete');
    } catch (error) {
      logger.error('Failed to initialize user polling:', error);
    }
  }
}

export const userPollingManager = new UserPollingManager();
