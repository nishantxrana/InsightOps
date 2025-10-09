import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';

class BuildWebhook {
  async handleCompleted(req, res, userId = null) {
    try {
      // Validate userId parameter
      if (userId && typeof userId !== 'string') {
        logger.warn('Invalid userId parameter received', { userId: typeof userId });
        userId = null;
      }

      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      const buildId = resource.id;
      const buildNumber = resource.buildNumber;
      const status = resource.status;
      const result = resource.result;
      const definition = resource.definition?.name;
      const requestedBy = resource.requestedBy?.displayName;

      logger.info('Build completed webhook received', {
        buildId,
        buildNumber,
        status,
        result,
        definition,
        requestedBy,
        userId: userId || 'legacy-global',
        userIdType: typeof userId,
        hasUserId: !!userId
      });

      // Get user settings for AI and client configuration
      let userSettings = null;
      let userClient = null;
      if (userId) {
        try {
          const { getUserSettings } = await import('../utils/userSettings.js');
          userSettings = await getUserSettings(userId);
          if (userSettings.azureDevOps) {
            userClient = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
          }
          logger.info(`Retrieved user settings for ${userId}`, {
            hasAzureDevOpsConfig: !!userSettings.azureDevOps,
            hasAIConfig: !!userSettings.ai
          });
        } catch (error) {
          logger.warn(`Failed to get user settings for ${userId}:`, error);
        }
      } else {
        logger.warn('No userId provided - using legacy webhook handler');
      }

      let message;
      let aiSummary = null;

      if (result === 'failed') {
        // Fetch build logs and timeline for failed builds
        try {
          const client = userClient || azureDevOpsClient;
          const [timeline, logs] = await Promise.all([
            client.getBuildTimeline(buildId),
            client.getBuildLogs(buildId)
          ]);

          // Generate AI summary if user has AI configured
          if (userSettings?.ai?.provider && userSettings?.ai?.apiKeys) {
            try {
              aiService.initializeWithUserSettings(userSettings);
              aiSummary = await aiService.summarizeBuildFailure(resource, timeline, logs, client);
            } catch (error) {
              logger.warn('Failed to generate AI summary:', error);
            }
          }
          
          message = markdownFormatter.formatBuildFailed(resource, aiSummary, userSettings?.azureDevOps);
        } catch (error) {
          logger.error('Error fetching build details for failed build:', error);
          message = markdownFormatter.formatBuildFailed(resource, null, userSettings?.azureDevOps);
        }
      } else {
        message = markdownFormatter.formatBuildCompleted(resource, userSettings?.azureDevOps);
      }
      
      // Send notification
      const notificationType = result === 'failed' ? 'build-failed' : 'build-succeeded';
      
      if (userId) {
        // User-specific notification
        await this.sendUserNotification(message, userId, notificationType);
      } else {
        // Legacy global notification
        await notificationService.sendNotification(message, notificationType);
      }
      
      res.json({
        message: 'Build completed webhook processed successfully',
        buildId,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing build completed webhook:', error);
      res.status(500).json({
        error: 'Failed to process build completed webhook',
        message: error.message
      });
    }
  }

  async sendUserNotification(message, userId, notificationType) {
    try {
      const { getUserSettings } = await import('../utils/userSettings.js');
      const settings = await getUserSettings(userId);
      
      if (!settings.notifications?.enabled) {
        logger.info(`Notifications disabled for user ${userId}`);
        return;
      }

      // Send to enabled notification channels
      if (settings.notifications.googleChatEnabled && settings.notifications.webhooks?.googleChat) {
        await this.sendGoogleChatNotification(message, settings.notifications.webhooks.googleChat);
        logger.info(`Build notification sent to user ${userId} via Google Chat`);
      }
    } catch (error) {
      logger.error(`Error sending user notification for ${userId}:`, error);
    }
  }

  async sendGoogleChatNotification(message, webhookUrl) {
    try {
      const axios = (await import('axios')).default;
      await axios.post(webhookUrl, { text: message });
    } catch (error) {
      logger.error('Error sending Google Chat notification:', error);
      throw error;
    }
  }

  async sendUserNotification(message, userId, notificationType) {
    try {
      const { getUserSettings } = await import('../utils/userSettings.js');
      const settings = await getUserSettings(userId);
      
      if (!settings.notifications?.enabled) {
        logger.info(`Notifications disabled for user ${userId}`);
        return;
      }

      // Send to enabled notification channels
      if (settings.notifications.googleChatEnabled && settings.notifications.webhooks?.googleChat) {
        await this.sendGoogleChatNotification(message, settings.notifications.webhooks.googleChat);
        logger.info(`Build notification sent to user ${userId} via Google Chat`);
      }
    } catch (error) {
      logger.error(`Error sending user notification for ${userId}:`, error);
    }
  }

  async sendGoogleChatNotification(message, webhookUrl) {
    try {
      const axios = (await import('axios')).default;
      await axios.post(webhookUrl, { text: message });
    } catch (error) {
      logger.error('Error sending Google Chat notification:', error);
      throw error;
    }
  }
}

export const buildWebhook = new BuildWebhook();
