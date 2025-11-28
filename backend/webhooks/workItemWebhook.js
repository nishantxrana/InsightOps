import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';

class WorkItemWebhook {
  async handleCreated(req, res, userId = null) {
    try {
      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      logger.info('Work item created webhook received', {
        workItemId: resource.id,
        workItemType: resource.fields?.['System.WorkItemType'],
        title: resource.fields?.['System.Title'],
        assignedTo: resource.fields?.['System.AssignedTo']?.displayName,
        userId: userId || 'legacy-global',
        hasUserId: !!userId
      });

      // Get user settings for URL construction and AI
      let userConfig = null;
      let userSettings = null;
      if (userId) {
        try {
          const { getUserSettings } = await import('../utils/userSettings.js');
          userSettings = await getUserSettings(userId);
          userConfig = userSettings.azureDevOps;
          logger.info(`Retrieved user config for ${userId}`, {
            hasOrganization: !!userConfig?.organization,
            hasProject: !!userConfig?.project,
            hasBaseUrl: !!userConfig?.baseUrl
          });
        } catch (error) {
          logger.warn(`Failed to get user settings for ${userId}:`, error);
        }
      } else {
        logger.warn('No userId provided - using legacy webhook handler');
      }

      // Generate AI summary if configured
      let aiSummary = null;
      if (userSettings?.ai?.provider && userSettings?.ai?.apiKeys?.[userSettings.ai.provider]) {
        try {
          logger.info(`Generating AI summary for work item ${resource.id}`, {
            provider: userSettings.ai.provider,
            hasApiKey: !!userSettings.ai.apiKeys[userSettings.ai.provider]
          });
          aiService.initializeWithUserSettings(userSettings);
          aiSummary = await aiService.summarizeWorkItem(resource);
          logger.info(`AI summary generated successfully`, { summaryLength: aiSummary?.length || 0 });
        } catch (error) {
          logger.warn('Failed to generate AI summary:', error);
        }
      } else {
        logger.warn('AI not configured for work item summary', {
          hasProvider: !!userSettings?.ai?.provider,
          hasApiKeys: !!userSettings?.ai?.apiKeys,
          userId
        });
      }
      
      // Format notification message with user config
      const message = markdownFormatter.formatWorkItemCreated(resource, aiSummary, userConfig);
      
      // Send notification
      if (userId) {
        // User-specific notification
        await this.sendUserNotification(message, userId, 'work-item-created');
      } else {
        // Legacy global notification
        await notificationService.sendNotification(message, 'work-item-created');
      }
      
      res.json({
        message: 'Work item created webhook processed successfully',
        workItemId: resource.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing work item created webhook:', error);
      res.status(500).json({
        error: 'Failed to process work item created webhook',
        message: error.message
      });
    }
  }

  async handleUpdated(req, res, userId = null) {
    try {
      const webhookData = req.body;
      const { resource } = webhookData;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      const workItemId = resource.workItemId || resource.revision?.id || resource.id;
      const revision = resource.revision || resource;
      const fields = revision.fields || resource.fields || {};
      const workItemType = fields['System.WorkItemType'] || 'Work Item';
      const title = fields['System.Title'] || 'No title';
      const state = fields['System.State'] || 'Unknown';
      const assignedTo = fields['System.AssignedTo'] || 'Unassigned';
      const changedBy = fields['System.ChangedBy'] || 'Unknown';

      logger.info('Work item updated webhook received', {
        workItemId,
        workItemType,
        title,
        state,
        assignedTo,
        changedBy,
        eventType: webhookData.eventType,
        userId: userId || 'legacy-global',
        hasUserId: !!userId
      });

      // Get user settings for URL construction
      let userConfig = null;
      if (userId) {
        try {
          const { getUserSettings } = await import('../utils/userSettings.js');
          const settings = await getUserSettings(userId);
          userConfig = settings.azureDevOps;
          logger.info(`Retrieved user config for ${userId}`, {
            hasOrganization: !!userConfig?.organization,
            hasProject: !!userConfig?.project,
            hasBaseUrl: !!userConfig?.baseUrl
          });
        } catch (error) {
          logger.warn(`Failed to get user settings for ${userId}:`, error);
        }
      } else {
        logger.warn('No userId provided - using legacy webhook handler');
      }

      // Format notification message with user config for proper URL construction
      const message = markdownFormatter.formatWorkItemUpdated(webhookData, userConfig);
      
      // Send notification
      if (userId) {
        // User-specific notification
        await this.sendUserNotification(message, userId, 'work-item-updated');
      } else {
        // Legacy global notification
        await notificationService.sendNotification(message, 'work-item-updated');
      }
      
      res.json({
        message: 'Work item updated webhook processed successfully',
        workItemId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing work item updated webhook:', error);
      res.status(500).json({
        error: 'Failed to process work item updated webhook',
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
        logger.info(`Work item notification sent to user ${userId} via Google Chat`);
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

export const workItemWebhook = new WorkItemWebhook();
