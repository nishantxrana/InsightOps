import { logger } from '../utils/logger.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';

class ReleaseWebhook {
  async handleDeploymentCompleted(req, res, userId = null) {
    try {
      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      const releaseId = resource.release?.id;
      const releaseName = resource.release?.name;
      const environmentName = resource.environment?.name;
      const environmentStatus = resource.environment?.status;
      const deploymentStatus = resource.deployment?.deploymentStatus;
      
      logger.info('Release deployment completed webhook received', {
        releaseId,
        releaseName,
        environmentName,
        environmentStatus,
        deploymentStatus,
        userId: userId || 'legacy-global'
      });

      // Check if environment is production
      const envNameLower = environmentName?.toLowerCase() || '';
      const isProduction = envNameLower.includes('production') || 
                          envNameLower.includes('prod') || 
                          envNameLower.includes('prd');
      
      if (!isProduction) {
        logger.info('Skipping notification - not a production environment', { environmentName });
        return res.json({
          message: 'Release deployment webhook received - non-production environment',
          releaseId,
          environmentName,
          timestamp: new Date().toISOString()
        });
      }

      // Get user settings
      let userSettings = null;
      if (userId) {
        try {
          const { getUserSettings } = await import('../utils/userSettings.js');
          userSettings = await getUserSettings(userId);
        } catch (error) {
          logger.warn(`Failed to get user settings for ${userId}:`, error);
        }
      }

      // Format message
      const message = markdownFormatter.formatReleaseDeployment(resource, userSettings?.azureDevOps);
      
      // Determine notification type based on status
      const status = (environmentStatus || deploymentStatus || '').toLowerCase();
      let notificationType;
      switch (status) {
        case 'succeeded':
          notificationType = 'release-succeeded';
          break;
        case 'partiallysucceeded':
          notificationType = 'release-partially-succeeded';
          break;
        case 'failed':
          notificationType = 'release-failed';
          break;
        case 'canceled':
          notificationType = 'release-canceled';
          break;
        default:
          notificationType = 'release-unknown';
      }
      
      if (userId) {
        await this.sendUserNotification(message, userId, notificationType);
      }
      
      res.json({
        message: 'Release deployment webhook processed successfully',
        releaseId,
        environmentName,
        status: environmentStatus || deploymentStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing release deployment webhook:', error);
      res.status(500).json({
        error: 'Failed to process release deployment webhook',
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

      // Send to Google Chat if enabled
      if (settings.notifications.googleChatEnabled && settings.notifications.webhooks?.googleChat) {
        await this.sendGoogleChatNotification(message, settings.notifications.webhooks.googleChat);
        logger.info(`Release notification sent to user ${userId} via Google Chat`);
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

export const releaseWebhook = new ReleaseWebhook();
