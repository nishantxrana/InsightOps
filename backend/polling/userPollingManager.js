import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { Organization } from '../models/Organization.js';
import { organizationService } from '../services/organizationService.js';
import { workItemPoller } from './workItemPoller.js';
import { buildPoller } from './buildPoller.js';
import { pullRequestPoller } from './pullRequestPoller.js';
import { pollingService } from '../services/pollingService.js';
import executionLock from './execution-lock.js';

class UserPollingManager {
  constructor() {
    this.activeJobs = new Map(); // organizationId → { workItems: cronJob, pullRequests: cronJob, overdue: cronJob }
    this.orgLocks = new Set(); // Track orgs currently being set up
    this.initialized = false;
  }

  async destroyAllJobInstances(organizationId, jobType) {
    try {
      logger.debug(`🧹 [POLLING] Destroying all ${jobType} job instances for org ${organizationId}`);
      
      // Get all cron tasks and destroy matching ones
      const allTasks = cron.getTasks();
      let destroyedCount = 0;
      
      for (const [taskId, task] of allTasks) {
        if (taskId.includes(organizationId) && taskId.includes(jobType)) {
          try {
            task.stop();
            destroyedCount++;
            logger.debug(`🗑️ [POLLING] Stopped task ${taskId}`);
          } catch (error) {
            logger.warn(`⚠️ [POLLING] Failed to stop task ${taskId}:`, error);
          }
        }
      }
      
      logger.debug(`🧹 [POLLING] Stopped ${destroyedCount} ${jobType} task instances for org ${organizationId}`);
    } catch (error) {
      logger.error(`Failed to destroy job instances for org ${organizationId}/${jobType}:`, error);
    }
  }

  // Start polling for an organization
  async startOrganizationPolling(organizationId) {
    try {
      logger.info(`🚀 [POLLING] Starting polling setup for org ${organizationId}`);
      
      if (this.orgLocks.has(organizationId)) {
        logger.warn(`⚠️ [POLLING] Setup already in progress for org ${organizationId}, skipping`);
        return;
      }
      
      this.orgLocks.add(organizationId);
      
      // Get organization with credentials
      const org = await organizationService.getOrganizationWithCredentials(organizationId);
      
      if (!org?.azureDevOps?.organization || !org?.azureDevOps?.project || !org?.azureDevOps?.pat) {
        logger.warn(`❌ [POLLING] Org ${organizationId} missing required Azure DevOps settings, skipping polling`);
        this.orgLocks.delete(organizationId);
        return;
      }

      // Stop any existing jobs for this org
      await this.stopOrganizationPolling(organizationId);
      
      // Pause database jobs
      await pollingService.pauseOrganizationJobs(organizationId);

      // Sync jobs with settings
      await this.syncJobsWithSettings(organizationId, org.userId, org.polling || {});

      // Get active jobs from database
      const dbJobs = await pollingService.getActiveJobs(organizationId);
      
      // Create cron jobs
      const orgJobs = {};
      let createdCount = 0;
      
      for (const dbJob of dbJobs) {
        const isValidCron = this.validateCronExpression(dbJob.config.interval);
        if (dbJob.config.enabled && isValidCron) {
          const cronJob = this.createCronJob(organizationId, org, dbJob);
          if (cronJob) {
            orgJobs[dbJob.jobType] = cronJob;
            cronJob.start();
            createdCount++;
            logger.info(`✅ [POLLING] Started ${dbJob.jobType} cron job for org ${organizationId} with interval: ${dbJob.config.interval}`);
          }
        } else if (dbJob.config.enabled && !isValidCron) {
          logger.warn(`⚠️ [POLLING] Invalid cron expression for ${dbJob.jobType}: ${dbJob.config.interval}`);
        }
      }

      this.activeJobs.set(organizationId, orgJobs);
      logger.info(`🎉 [POLLING] Successfully started ${createdCount} polling jobs for org ${organizationId}`);
      
      this.orgLocks.delete(organizationId);
      
    } catch (error) {
      this.orgLocks.delete(organizationId);
      logger.error(`💥 [POLLING] Failed to start polling for org ${organizationId}:`, error);
    }
  }

  // Legacy method - start polling for a user (starts all their orgs)
  async startUserPolling(userId) {
    try {
      const orgs = await Organization.find({ userId, isActive: true });
      for (const org of orgs) {
        await this.startOrganizationPolling(org._id.toString());
      }
    } catch (error) {
      logger.error(`Failed to start polling for user ${userId}:`, error);
    }
  }

  async emergencyCleanup() {
    try {
      logger.info('Emergency cleanup: Destroying all cron jobs');
      
      this.activeJobs.forEach((orgJobs, orgId) => {
        Object.values(orgJobs).forEach(job => {
          if (job) {
            if (typeof job.destroy === 'function') job.destroy();
            else if (typeof job.stop === 'function') job.stop();
          }
        });
      });
      
      this.activeJobs.clear();
      this.orgLocks.clear();
      
      const allTasks = cron.getTasks();
      for (const [key, task] of allTasks) {
        try {
          if (typeof task.destroy === 'function') task.destroy();
          else if (typeof task.stop === 'function') task.stop();
        } catch (error) {}
      }
      allTasks.clear();
      
      logger.info('Emergency cleanup completed');
    } catch (error) {
      logger.error('Emergency cleanup failed:', error);
    }
  }

  async stopOrganizationPolling(organizationId) {
    try {
      const orgJobs = this.activeJobs.get(organizationId);
      if (orgJobs) {
        Object.values(orgJobs).forEach(job => {
          if (job) {
            if (typeof job.destroy === 'function') job.destroy();
            else if (typeof job.stop === 'function') job.stop();
          }
        });
        this.activeJobs.delete(organizationId);
      }
      
      await pollingService.pauseOrganizationJobs(organizationId);
      logger.info(`Stopped all polling jobs for org ${organizationId}`);
    } catch (error) {
      logger.error(`Failed to stop polling for org ${organizationId}:`, error);
    }
  }

  // Legacy method
  async stopUserPolling(userId) {
    try {
      const orgs = await Organization.find({ userId, isActive: true });
      for (const org of orgs) {
        await this.stopOrganizationPolling(org._id.toString());
      }
      await pollingService.pauseUserJobs(userId);
    } catch (error) {
      logger.error(`Failed to stop polling for user ${userId}:`, error);
    }
  }

  async updateUserPolling(userId, newSettings) {
    // This is called when settings are updated - now we update the current org
    try {
      const orgs = await Organization.find({ userId, isActive: true });
      for (const org of orgs) {
        if (newSettings.polling) {
          await this.updateOrganizationPolling(org._id.toString(), newSettings.polling);
        }
      }
    } catch (error) {
      logger.error(`Failed to update polling for user ${userId}:`, error);
    }
  }

  async updateOrganizationPolling(organizationId, pollingConfig) {
    try {
      logger.info(`🔄 [POLLING] Updating polling for org ${organizationId}`);
      
      if (this.orgLocks.has(organizationId)) {
        logger.warn(`⚠️ [POLLING] Update already in progress for org ${organizationId}, skipping`);
        return;
      }

      this.orgLocks.add(organizationId);
      
      const org = await organizationService.getOrganizationWithCredentials(organizationId);
      
      if (!org?.azureDevOps?.organization || !org?.azureDevOps?.project || !org?.azureDevOps?.pat) {
        logger.warn(`❌ [POLLING] Org ${organizationId} missing required Azure DevOps settings`);
        this.orgLocks.delete(organizationId);
        return;
      }

      const orgJobs = this.activeJobs.get(organizationId) || {};
      
      for (const jobType of ['workItems', 'pullRequests', 'overdue']) {
        await this.updateSingleJob(organizationId, org, jobType, pollingConfig, orgJobs);
      }

      this.orgLocks.delete(organizationId);
      logger.info(`🎉 [POLLING] Update completed for org ${organizationId}`);
      
    } catch (error) {
      this.orgLocks.delete(organizationId);
      logger.error(`💥 [POLLING] Failed to update polling for org ${organizationId}:`, error);
    }
  }

  async updateSingleJob(organizationId, org, jobType, pollingConfig, orgJobs) {
    try {
      await this.destroyAllJobInstances(organizationId, jobType);
      
      if (orgJobs[jobType]) {
        try { orgJobs[jobType].stop(); } catch (e) {}
        delete orgJobs[jobType];
      }
      
      await pollingService.updateJobConfig(organizationId, jobType, pollingConfig);
      
      const jobConfig = this.getJobConfig(jobType, pollingConfig);
      
      if (jobConfig.enabled && jobConfig.interval && this.validateCronExpression(jobConfig.interval)) {
        const dbJob = { jobType, config: jobConfig };
        const cronJob = this.createCronJob(organizationId, org, dbJob);
        if (cronJob) {
          orgJobs[jobType] = cronJob;
          cronJob.start();
          logger.info(`✅ [POLLING] Started new ${jobType} cron job for org ${organizationId}`);
        }
      }
      
      this.activeJobs.set(organizationId, orgJobs);
    } catch (error) {
      logger.error(`💥 [POLLING] Failed to update ${jobType} job for org ${organizationId}:`, error);
    }
  }

  createCronJob(organizationId, org, dbJob) {
    const { jobType, config } = dbJob;
    const userId = org.userId;
    
    // Check if cron expression has 6 fields (includes seconds)
    const cronFields = config.interval.trim().split(/\s+/).length;
    const useSeconds = cronFields === 6;
    
    logger.info(`📅 [POLLING] Creating ${jobType} cron job for org ${organizationId} with interval: ${config.interval} (seconds: ${useSeconds})`);
    
    return cron.schedule(config.interval, async () => {
      const executionId = executionLock.acquire(organizationId, jobType);
      if (!executionId) {
        logger.warn(`🔒 [POLLING] ${jobType} execution already running for org ${organizationId}, skipping`);
        return;
      }
      
      logger.info(`🚀 [POLLING] Starting ${jobType} execution for org ${organizationId}`);
      
      try {
        await pollingService.updateLastRun(organizationId, jobType);
        
        switch (jobType) {
          case 'workItems':
            logger.info(`⏭️ [POLLING] Work items polling disabled for org ${organizationId}`);
            break;
          case 'pullRequests':
            await pullRequestPoller.pollPullRequestsForOrg(organizationId, org);
            break;
          case 'overdue':
            await workItemPoller.checkOverdueItemsForOrg(organizationId, org);
            break;
        }
        
        await pollingService.updateJobResult(organizationId, jobType, 'success');
        logger.info(`🎉 [POLLING] Completed ${jobType} for org ${organizationId}`);
        
      } catch (error) {
        logger.error(`💥 [POLLING] ${jobType} failed for org ${organizationId}:`, error);
        try {
          await pollingService.updateJobResult(organizationId, jobType, 'error', error.message);
        } catch (dbError) {}
      } finally {
        executionLock.release(organizationId, jobType, executionId);
      }
    }, { 
      scheduled: false,
      name: `${organizationId}-${jobType}-${Date.now()}`,
      // Enable seconds support for 6-field cron expressions like "*/10 * * * * *"
      seconds: useSeconds
    });
  }

  async syncJobsWithSettings(organizationId, userId, pollingConfig) {
    try {
      await pollingService.createOrUpdateJob(userId, organizationId, 'workItems', this.getJobConfig('workItems', pollingConfig));
      await pollingService.createOrUpdateJob(userId, organizationId, 'pullRequests', this.getJobConfig('pullRequests', pollingConfig));
      await pollingService.createOrUpdateJob(userId, organizationId, 'overdue', this.getJobConfig('overdue', pollingConfig));
    } catch (error) {
      logger.error(`Failed to sync jobs for org ${organizationId}:`, error);
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

  /**
   * Validate cron expression - supports both 5-field and 6-field (with seconds) formats
   * 5-field: minute hour day month weekday (standard cron)
   * 6-field: second minute hour day month weekday (node-cron with seconds)
   */
  validateCronExpression(expression) {
    if (!expression || typeof expression !== 'string') {
      return false;
    }
    
    const trimmed = expression.trim();
    const fields = trimmed.split(/\s+/);
    
    // Must have 5 or 6 fields
    if (fields.length !== 5 && fields.length !== 6) {
      logger.warn(`[POLLING] Invalid cron expression (wrong field count): ${expression}`);
      return false;
    }
    
    // Use node-cron's built-in validation
    // For 6-field expressions, node-cron validates with seconds
    const isValid = cron.validate(trimmed);
    
    if (!isValid) {
      logger.warn(`[POLLING] Invalid cron expression: ${expression}`);
    }
    
    return isValid;
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
      // Get all organizations with polling enabled in their settings
      const orgsWithPolling = await Organization.find({
        isActive: true,
        $or: [
          { 'polling.pullRequestEnabled': true },
          { 'polling.overdueCheckEnabled': true },
          { 'polling.workItemsEnabled': true }
        ]
      });
      
      logger.info(`🔄 [POLLING] Found ${orgsWithPolling.length} organizations with polling enabled`);
      
      // Start polling for each organization
      for (const org of orgsWithPolling) {
        try {
          logger.info(`🚀 [POLLING] Starting polling for org ${org.name} (${org._id})`);
          await this.startOrganizationPolling(org._id.toString());
        } catch (error) {
          logger.error(`Failed to initialize polling for org ${org._id}:`, error);
        }
      }
      
      this.initialized = true;
      logger.info('✅ [POLLING] Database polling initialization complete');
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
