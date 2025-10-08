import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';

class BuildWebhook {
  async handleCompleted(req, res, userId = null) {
    try {
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
        requestedBy
      });

      let message;
      let aiSummary = null;

      if (result === 'failed') {
        // Fetch build logs and timeline for failed builds
        try {
          const [timeline, logs] = await Promise.all([
            azureDevOpsClient.getBuildTimeline(buildId),
            azureDevOpsClient.getBuildLogs(buildId)
          ]);

          // Generate AI summary of the failure
          aiSummary = await aiService.summarizeBuildFailure(resource, timeline, logs);
          
          message = markdownFormatter.formatBuildFailed(resource, aiSummary);
        } catch (error) {
          logger.error('Error fetching build details for failed build:', error);
          message = markdownFormatter.formatBuildFailed(resource, null);
        }
      } else {
        message = markdownFormatter.formatBuildCompleted(resource);
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
}

export const buildWebhook = new BuildWebhook();
