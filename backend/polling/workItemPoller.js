import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { notificationService } from '../notifications/notificationService.js';
import { getUserSettings } from '../utils/userSettings.js';

class WorkItemPoller {
  constructor() {
    this.lastPollTime = new Date();
    this.processedWorkItems = new Set();
  }

  async pollWorkItems(userId) {
    try {
      let client = azureDevOpsClient;
      
      if (userId) {
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

      logger.info(`Starting work items polling${userId ? ` for user ${userId}` : ''}`);

      // Get current sprint work items for monitoring purposes
      const sprintWorkItems = await client.getCurrentSprintWorkItems();
      
      if (sprintWorkItems.count > 0) {
        logger.info(`Found ${sprintWorkItems.count} work items in current sprint${userId ? ` for user ${userId}` : ''}`);
        
        // Note: Overdue items are checked by separate cron job
      } else {
        logger.info('No work items found in current sprint');
      }

      this.lastPollTime = new Date();
    } catch (error) {
      logger.error('Error polling work items:', error);
    }
  }

  async checkOverdueItems(userId) {
    try {
      let client = azureDevOpsClient;
      
      if (userId) {
        const settings = await getUserSettings(userId);
        logger.debug(`User settings for ${userId}:`, {
          hasOrg: !!settings.azureDevOps?.organization,
          hasProject: !!settings.azureDevOps?.project,
          hasPat: !!settings.azureDevOps?.pat,
          hasPersonalAccessToken: !!settings.azureDevOps?.personalAccessToken
        });
        
        if (!settings.azureDevOps?.organization || !settings.azureDevOps?.project || 
            (!settings.azureDevOps?.pat && !settings.azureDevOps?.personalAccessToken)) {
          logger.warn(`Missing Azure DevOps settings for user ${userId}`);
          return;
        }
        
        client = azureDevOpsClient.createUserClient({
          organization: settings.azureDevOps.organization,
          project: settings.azureDevOps.project,
          pat: settings.azureDevOps.pat || settings.azureDevOps.personalAccessToken,
          baseUrl: settings.azureDevOps.baseUrl || 'https://dev.azure.com'
        });
        logger.debug(`Created user client for ${userId}`);
      }

      logger.info(`Checking for overdue work items${userId ? ` for user ${userId}` : ''}`);

      const overdueItems = await client.getOverdueWorkItems();
      
      logger.info(`Overdue check result: ${overdueItems.count} items found${userId ? ` for user ${userId}` : ''}`);
      
      if (overdueItems.count > 0) {
        logger.warn(`Found ${overdueItems.count} overdue work items${userId ? ` for user ${userId}` : ''}`);
        
        // Send notification with user-specific settings
        if (userId) {
          const settings = await getUserSettings(userId);
          if (settings.notifications?.enabled) {
            await this.sendOverdueNotification(overdueItems.value, settings);
          }
        } else {
          await notificationService.sendOverdueReminder(overdueItems.value);
        }
      } else {
        logger.info(`No overdue work items found${userId ? ` for user ${userId}` : ''}`);
      }
    } catch (error) {
      logger.error(`Error checking overdue items${userId ? ` for user ${userId}` : ''}:`, error);
    }
  }
}

export const workItemPoller = new WorkItemPoller();

// Add notification methods to the class
WorkItemPoller.prototype.sendOverdueNotification = async function(overdueItems, userSettings) {
  try {
    if (!userSettings.notifications?.enabled) {
      return;
    }

    const { markdownFormatter } = await import('../utils/markdownFormatter.js');
    const message = markdownFormatter.formatOverdueItemsMessage(overdueItems);
    
    // Send to enabled notification channels
    if (userSettings.notifications.teamsEnabled && userSettings.notifications.webhooks?.teams) {
      await this.sendTeamsNotification(message, userSettings.notifications.webhooks.teams);
    }
    
    if (userSettings.notifications.slackEnabled && userSettings.notifications.webhooks?.slack) {
      await this.sendSlackNotification(message, userSettings.notifications.webhooks.slack);
    }
    
    if (userSettings.notifications.googleChatEnabled && userSettings.notifications.webhooks?.googleChat) {
      await this.sendGoogleChatNotification(message, userSettings.notifications.webhooks.googleChat);
    }
    
    logger.info('Overdue notification sent successfully');
  } catch (error) {
    logger.error('Failed to send overdue notification:', error);
  }
};

WorkItemPoller.prototype.sendTeamsNotification = async function(message, webhookUrl) {
  const axios = (await import('axios')).default;
  await axios.post(webhookUrl, { text: message });
};

WorkItemPoller.prototype.sendSlackNotification = async function(message, webhookUrl) {
  const axios = (await import('axios')).default;
  await axios.post(webhookUrl, { text: message });
};

WorkItemPoller.prototype.sendGoogleChatNotification = async function(message, webhookUrl) {
  const axios = (await import('axios')).default;
  await axios.post(webhookUrl, { text: message });
};
