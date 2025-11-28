import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';

class PullRequestPoller {
  constructor() {
    this.lastPollTime = new Date();
    this.processedPRs = new Set();
  }

  async pollPullRequests(userId) {
    try {
      let client = azureDevOpsClient;
      
      if (userId) {
        const { getUserSettings } = await import('../utils/userSettings.js');
        const settings = await getUserSettings(userId);
        if (!settings.azureDevOps?.organization || !settings.azureDevOps?.project || !settings.azureDevOps?.pat) {
          return;
        }
        client = azureDevOpsClient.createUserClient({
          organization: settings.azureDevOps.organization,
          project: settings.azureDevOps.project,
          pat: settings.azureDevOps.pat,
          baseUrl: settings.azureDevOps.baseUrl || 'https://dev.azure.com'
        });
      }

      logger.info(`Starting pull requests polling${userId ? ` for user ${userId}` : ''}`);

      // Check for idle pull requests (>48 hours without activity)
      await this.checkIdlePullRequests(userId, client);

      this.lastPollTime = new Date();
    } catch (error) {
      logger.error('Error polling pull requests:', error);
    }
  }

  async checkIdlePullRequests(userId, client = azureDevOpsClient) {
    try {
      logger.info(`Checking for idle pull requests${userId ? ` for user ${userId}` : ''}`);

      const idlePRs = await client.getIdlePullRequests(48);
      
      if (idlePRs.count > 0) {
        logger.warn(`Found ${idlePRs.count} idle pull requests`);
        
        // Send notification with user-specific settings
        if (userId) {
          const { getUserSettings } = await import('../utils/userSettings.js');
          const settings = await getUserSettings(userId);
          if (settings.notifications?.enabled) {
            await this.sendIdlePRNotification(idlePRs.value, settings);
          }
        } else {
          // Fallback for global notifications
          const message = markdownFormatter.formatIdlePullRequestReminder(idlePRs.value);
          if (message) {
            await notificationService.sendNotification(message, 'pull-request-idle-reminder');
          }
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

// Add notification methods to the class
PullRequestPoller.prototype.sendIdlePRNotification = async function(idlePRs, userSettings) {
  try {
    if (!userSettings.notifications?.enabled) {
      return;
    }
    
    // Batch processing - 10 PRs per card with 7 second delay
    const batchSize = 10;
    const delayBetweenBatches = 7000;
    const totalBatches = Math.ceil(idlePRs.length / batchSize);
    
    for (let i = 0; i < idlePRs.length; i += batchSize) {
      const batch = idlePRs.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      const card = this.formatIdlePRCard(batch, batchNumber, totalBatches, idlePRs.length);
      
      if (userSettings.notifications.googleChatEnabled && userSettings.notifications.webhooks?.googleChat) {
        await this.sendGoogleChatCard(card, userSettings.notifications.webhooks.googleChat);
      }
      
      if (i + batchSize < idlePRs.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    logger.info(`Idle PR notifications sent in ${totalBatches} batches`);
  } catch (error) {
    logger.error('Error sending idle PR notification:', error);
  }
};

PullRequestPoller.prototype.formatIdlePRCard = function(pullRequests, batchNumber, totalBatches, totalCount) {
  const prSections = pullRequests.map(pr => {
    const title = pr.title || 'No title';
    const createdBy = pr.createdBy?.displayName || 'Unknown';
    const lastActivity = pr.lastMergeCommit?.committer?.date || pr.creationDate;
    const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
    const repository = pr.repository?.name || 'Unknown';
    const sourceBranch = pr.sourceRefName?.replace('refs/heads/', '') || 'unknown';
    const targetBranch = pr.targetRefName?.replace('refs/heads/', '') || 'unknown';
    const description = ((pr.description || 'No description').slice(0, 150)) +
                       ((pr.description?.length ?? 0) > 150 ? '...' : '');
    const prUrl = pr.webUrl || pr.url;

    return {
      header: `🔀 PR #${pr.pullRequestId} - ${title}`,
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        {
          decoratedText: {
            startIcon: { knownIcon: 'CLOCK' },
            topLabel: 'Idle Duration',
            text: `<b>${daysSinceActivity} days</b>`
          }
        },
        {
          decoratedText: {
            startIcon: { knownIcon: 'PERSON' },
            topLabel: 'Created By',
            text: createdBy
          }
        },
        {
          decoratedText: {
            startIcon: { knownIcon: 'DESCRIPTION' },
            topLabel: 'Repository',
            text: repository
          }
        },
        {
          decoratedText: {
            startIcon: { knownIcon: 'BOOKMARK' },
            topLabel: 'Branches',
            text: `${sourceBranch} → ${targetBranch}`
          }
        },
        {
          textParagraph: {
            text: `<b>Description:</b> ${description}`
          }
        },
        {
          buttonList: {
            buttons: [{
              text: 'Review Pull Request',
              icon: { knownIcon: 'OPEN_IN_NEW' },
              onClick: { openLink: { url: prUrl } }
            }]
          }
        }
      ]
    };
  });

  const allSections = [
    ...prSections,
    ...(batchNumber === totalBatches ? [{
      widgets: [{
        textParagraph: {
          text: '⚠️ <b>Action Required:</b> Please review these pull requests to keep the development process moving.'
        }
      }]
    }] : [])
  ];

  return {
    cardsV2: [{
      cardId: `idle-prs-batch-${batchNumber}`,
      card: {
        header: {
          title: `⏰ Idle Pull Requests - Batch ${batchNumber}/${totalBatches}`,
          subtitle: `${pullRequests.length} of ${totalCount} PRs inactive for more than 48 hours`,
          imageUrl: 'https://img.icons8.com/color/96/pull-request.png',
          imageType: 'CIRCLE'
        },
        sections: allSections
      }
    }]
  };
};

PullRequestPoller.prototype.sendGoogleChatCard = async function(card, webhookUrl) {
  try {
    const axios = (await import('axios')).default;
    await axios.post(webhookUrl, card);
  } catch (error) {
    logger.error('Error sending Google Chat card:', error);
    throw error;
  }
};

export const pullRequestPoller = new PullRequestPoller();
