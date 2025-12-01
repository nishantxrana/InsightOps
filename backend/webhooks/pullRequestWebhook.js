import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import notificationHistoryService from '../services/notificationHistoryService.js';

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

      // Format notification card with user config
      const card = this.formatPRCreatedCard(resource, aiSummary, userConfig);
      
      // Send notification
      if (userId) {
        await this.sendUserNotification(card, userId, resource, aiSummary);
      } else {
        await notificationService.sendNotification(card, 'pull-request-created');
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

  async sendUserNotification(card, userId, pr, aiSummary) {
    try {
      const { getUserSettings } = await import('../utils/userSettings.js');
      const settings = await getUserSettings(userId);
      
      if (!settings.notifications?.enabled) {
        logger.info(`Notifications disabled for user ${userId}`);
        return;
      }

      const channels = [];

      if (settings.notifications.googleChatEnabled && settings.notifications.webhooks?.googleChat) {
        try {
          await this.sendGoogleChatCard(card, settings.notifications.webhooks.googleChat);
          
          const dividerCard = {
            cardsV2: [{
              cardId: `divider-pr-${Date.now()}`,
              card: { sections: [{ widgets: [{ divider: {} }] }] }
            }]
          };
          await this.sendGoogleChatCard(dividerCard, settings.notifications.webhooks.googleChat);
          
          channels.push({ platform: 'google-chat', status: 'sent', sentAt: new Date() });
          logger.info(`PR notification sent to user ${userId} via Google Chat`);
        } catch (error) {
          channels.push({ platform: 'google-chat', status: 'failed', error: error.message });
          logger.error(`Failed to send to Google Chat:`, error);
        }
      }

      await notificationHistoryService.saveNotification(userId, {
        type: 'pull-request',
        subType: 'created',
        title: `PR: ${pr.title}`,
        message: `Pull request created by ${pr.createdBy?.displayName}`,
        source: 'webhook',
        card,
        aiSummary,
        metadata: {
          pullRequestId: pr.pullRequestId,
          repository: pr.repository?.name,
          sourceBranch: pr.sourceRefName,
          targetBranch: pr.targetRefName
        },
        channels
      });

    } catch (error) {
      logger.error(`Error sending user notification for ${userId}:`, error);
    }
  }

  async sendGoogleChatCard(card, webhookUrl) {
    try {
      const axios = (await import('axios')).default;
      await axios.post(webhookUrl, card);
    } catch (error) {
      logger.error('Error sending Google Chat card:', error);
      throw error;
    }
  }

  formatPRCreatedCard(pullRequest, aiSummary, userConfig) {
    const title = pullRequest.title || 'No title';
    const createdBy = pullRequest.createdBy?.displayName || 'Unknown';
    const project = pullRequest.repository?.project?.name || 'Unknown';
    const repository = pullRequest.repository?.name || 'Unknown';
    const sourceBranch = pullRequest.sourceRefName?.replace('refs/heads/', '') || 'unknown';
    const targetBranch = pullRequest.targetRefName?.replace('refs/heads/', '') || 'unknown';
    const description = pullRequest.description || 'No description';
    const reviewers = pullRequest.reviewers?.map(r => r.displayName).filter(Boolean) || [];

    let prUrl = pullRequest._links?.web?.href;
    if (!prUrl && userConfig?.organization && userConfig?.project) {
      const baseUrl = userConfig.baseUrl || 'https://dev.azure.com';
      prUrl = `${baseUrl}/${userConfig.organization}/${encodeURIComponent(userConfig.project)}/_git/${encodeURIComponent(repository)}/pullrequest/${pullRequest.pullRequestId}`;
    }

    const detailWidgets = [
      {
        decoratedText: {
          startIcon: { knownIcon: 'BOOKMARK' },
          topLabel: 'PR ID',
          text: `<b>#${pullRequest.pullRequestId}</b>`
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
          startIcon: { knownIcon: 'STAR' },
          topLabel: 'Source → Target',
          text: `${sourceBranch} → ${targetBranch}`
        }
      }
    ];

    if (reviewers.length > 0) {
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'PERSON' },
          topLabel: 'Reviewers',
          text: reviewers.join(', ')
        }
      });
    }

    const sections = [
      {
        header: '📋 Pull Request Details',
        widgets: detailWidgets
      }
    ];

    if (description && description !== 'No description') {
      const truncatedDesc = description.length > 300 ? description.substring(0, 300) + '...' : description;
      sections.push({
        header: '📝 Description',
        collapsible: true,
        widgets: [{
          textParagraph: {
            text: truncatedDesc
          }
        }]
      });
    }

    if (aiSummary) {
      sections.push({
        header: '🤖 AI Summary',
        collapsible: true,
        widgets: [{
          textParagraph: {
            text: aiSummary
          }
        }]
      });
    }

    if (prUrl) {
      sections.push({
        widgets: [{
          buttonList: {
            buttons: [{
              text: 'Review Pull Request',
              onClick: {
                openLink: {
                  url: prUrl
                }
              }
            }]
          }
        }]
      });
    }

    return {
      cardsV2: [{
        cardId: `pr-created-${pullRequest.pullRequestId}-${Date.now()}`,
        card: {
          header: {
            title: '🔀 New Pull Request',
            subtitle: title,
            imageUrl: 'https://img.icons8.com/color/96/pull-request.png',
            imageType: 'CIRCLE'
          },
          sections
        }
      }]
    };
  }
}

export const pullRequestWebhook = new PullRequestWebhook();
