import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';

class PullRequestWebhook {
  async handleCreated(req, res, userId = null) {
    try {
      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      const pullRequestId = resource.pullRequestId;
      const title = resource.title;
      const createdBy = resource.createdBy?.displayName;
      const sourceBranch = resource.sourceRefName;
      const targetBranch = resource.targetRefName;
      const reviewers = resource.reviewers?.map(r => r.displayName) || [];

      logger.info('Pull request created webhook received', {
        pullRequestId,
        title,
        createdBy,
        sourceBranch,
        targetBranch,
        reviewers,
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
          aiService.initializeWithUserSettings(userSettings);
          aiSummary = await aiService.summarizePullRequest(resource);
        } catch (error) {
          logger.warn('Failed to generate AI summary:', error);
        }
      }

      // Format notification message with user config
      const message = markdownFormatter.formatPullRequestCreated(resource, aiSummary, userConfig);
      
      // Send notification
      if (userId) {
        // User-specific notification
        await this.sendUserNotification(message, userId, 'pull-request-created');
      } else {
        // Legacy global notification
        await notificationService.sendNotification(message, 'pull-request-created');
      }
      
      res.json({
        message: 'Pull request created webhook processed successfully',
        pullRequestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing pull request created webhook:', error);
      res.status(500).json({
        error: 'Failed to process pull request created webhook',
        message: error.message
      });
    }
  }

  isReviewerAssignment(resource) {
    // For now, treat all PR updates as general updates rather than reviewer assignments
    // This can be enhanced later to detect actual reviewer changes by comparing with previous state
    return false;
  }

  getNewReviewers(resource) {
    // Extract newly assigned reviewers
    return resource?.reviewers?.map(r => r.displayName) || [];
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
        logger.info(`PR notification sent to user ${userId} via Google Chat`);
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

export const pullRequestWebhook = new PullRequestWebhook();
