import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { configLoader } from '../config/settings.js';
import { workItemPoller } from './workItemPoller.js';
import { buildPoller } from './buildPoller.js';
import { pullRequestPoller } from './pullRequestPoller.js';

class PollingManager {
  constructor() {
    this.jobs = new Map();
    this.config = configLoader.getPollingConfig();
  }

  startPollingJobs() {
    try {
      // Work Items polling
      this.startWorkItemPolling();
      
      // Build/Pipeline polling
      this.startBuildPolling();
      
      // Pull Request polling
      this.startPullRequestPolling();
      
      // Overdue items check
      this.startOverdueCheck();

      logger.info('All polling jobs started successfully');
    } catch (error) {
      logger.error('Error starting polling jobs:', error);
      throw error;
    }
  }

  startWorkItemPolling() {
    const job = cron.schedule(this.config.workItemsInterval, async () => {
      try {
        logger.debug('Running work items polling job');
        await workItemPoller.pollWorkItems();
      } catch (error) {
        logger.error('Error in work items polling job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('workItems', job);
    job.start();
    
    logger.info('Work items polling job started', {
      interval: this.config.workItemsInterval
    });
  }

  startBuildPolling() {
    const job = cron.schedule(this.config.pipelineInterval, async () => {
      try {
        logger.debug('Running builds polling job');
        await buildPoller.pollBuilds();
      } catch (error) {
        logger.error('Error in builds polling job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('builds', job);
    job.start();
    
    logger.info('Builds polling job started', {
      interval: this.config.pipelineInterval
    });
  }

  startPullRequestPolling() {
    const job = cron.schedule(this.config.pullRequestInterval, async () => {
      try {
        logger.debug('Running pull requests polling job');
        await pullRequestPoller.pollPullRequests();
      } catch (error) {
        logger.error('Error in pull requests polling job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('pullRequests', job);
    job.start();
    
    logger.info('Pull requests polling job started', {
      interval: this.config.pullRequestInterval
    });
  }

  startOverdueCheck() {
    const job = cron.schedule(this.config.overdueCheckInterval, async () => {
      try {
        logger.debug('Running overdue items check job');
        await workItemPoller.checkOverdueItems();
      } catch (error) {
        logger.error('Error in overdue items check job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('overdueCheck', job);
    job.start();
    
    logger.info('Overdue items check job started', {
      interval: this.config.overdueCheckInterval
    });
  }

  stopPollingJobs() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped polling job: ${name}`);
    });
    
    this.jobs.clear();
    logger.info('All polling jobs stopped');
  }

  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      };
    });
    return status;
  }
}

const pollingManager = new PollingManager();

export function startPollingJobs() {
  pollingManager.startPollingJobs();
}

export function stopPollingJobs() {
  pollingManager.stopPollingJobs();
}

export function getPollingStatus() {
  return pollingManager.getJobStatus();
}
