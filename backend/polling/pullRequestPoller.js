import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';

class PullRequestPoller {
  constructor() {
    this.lastPollTime = new Date();
    this.processedPRs = new Set();
  }

  async pollPullRequests() {
    try {
      logger.info('Starting pull requests polling');

      // Check for idle pull requests (>48 hours without activity)
      await this.checkIdlePullRequests();

      this.lastPollTime = new Date();
    } catch (error) {
      logger.error('Error polling pull requests:', error);
    }
  }

  async checkIdlePullRequests() {
    try {
      logger.info('Checking for idle pull requests');

      const idlePRs = await azureDevOpsClient.getIdlePullRequests(48);
      
      if (idlePRs.count > 0) {
        logger.warn(`Found ${idlePRs.count} idle pull requests`);
        
        // Send reminder notification
        const message = markdownFormatter.formatIdlePullRequestReminder(idlePRs.value);
        if (message) {
          await notificationService.sendNotification(message, 'pull-request-idle-reminder');
        }
      } else {
        logger.info('No idle pull requests found');
      }
    } catch (error) {
      logger.error('Error checking idle pull requests:', error);
    }
  }

  async checkForNewPullRequests() {
    try {
      // Get active pull requests
      const activePRs = await azureDevOpsClient.getPullRequests('active');
      
      if (activePRs.count > 0) {
        // Filter PRs created since last poll
        const newPRs = activePRs.value.filter(pr => {
          const creationDate = new Date(pr.creationDate);
          return creationDate > this.lastPollTime && !this.processedPRs.has(pr.pullRequestId);
        });

        if (newPRs.length > 0) {
          logger.info(`Found ${newPRs.length} new pull requests since last poll`);
          
          for (const pr of newPRs) {
            await this.processNewPullRequest(pr);
            this.processedPRs.add(pr.pullRequestId);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking for new pull requests:', error);
    }
  }

  async processNewPullRequest(pullRequest) {
    try {
      logger.info(`Processing new pull request: ${pullRequest.title}`, {
        pullRequestId: pullRequest.pullRequestId,
        createdBy: pullRequest.createdBy?.displayName
      });

      // Note: In a real scenario, PR creation notifications would typically
      // be handled by webhooks rather than polling. This is mainly for
      // backup/fallback scenarios.
      
    } catch (error) {
      logger.error(`Error processing pull request ${pullRequest.pullRequestId}:`, error);
    }
  }

  cleanupProcessedPRs() {
    // Keep only the last 1000 processed PR IDs to prevent memory leaks
    if (this.processedPRs.size > 1000) {
      const prsArray = Array.from(this.processedPRs);
      const toKeep = prsArray.slice(-500); // Keep last 500
      this.processedPRs = new Set(toKeep);
      
      logger.debug('Cleaned up processed PRs cache');
    }
  }
}

export const pullRequestPoller = new PullRequestPoller();
