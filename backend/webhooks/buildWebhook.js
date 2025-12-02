import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import notificationHistoryService from '../services/notificationHistoryService.js';

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
          if (userSettings?.ai?.provider && userSettings?.ai?.apiKeys?.[userSettings.ai.provider]) {
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
        // User-specific notification with card format
        await this.sendUserNotification(message, userId, notificationType, resource, aiSummary, userSettings?.azureDevOps);
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

  async sendUserNotification(message, userId, notificationType, build, aiSummary, userConfig) {
    try {
      const { getUserSettings } = await import('../utils/userSettings.js');
      const settings = await getUserSettings(userId);
      
      if (!settings.notifications?.enabled) {
        logger.info(`Notifications disabled for user ${userId}`);
        return;
      }

      const card = this.formatBuildCard(build, aiSummary, userConfig);
      const channels = [];

      if (settings.notifications.googleChatEnabled && settings.notifications.webhooks?.googleChat) {
        try {
          await this.sendGoogleChatCard(card, settings.notifications.webhooks.googleChat);
          
          const dividerCard = {
            cardsV2: [{
              cardId: `divider-build-${Date.now()}`,
              card: { sections: [{ widgets: [{ divider: {} }] }] }
            }]
          };
          await this.sendGoogleChatCard(dividerCard, settings.notifications.webhooks.googleChat);
          
          channels.push({ platform: 'google-chat', status: 'sent', sentAt: new Date() });
          logger.info(`Build notification sent to user ${userId} via Google Chat`);
        } catch (error) {
          channels.push({ platform: 'google-chat', status: 'failed', error: error.message });
          logger.error(`Failed to send to Google Chat:`, error);
        }
      }

      // Calculate duration
      let duration = '';
      if (build.startTime && build.finishTime) {
        const durationMs = new Date(build.finishTime) - new Date(build.startTime);
        const durationSec = Math.round(durationMs / 1000);
        duration = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
      }

      // Construct build URL
      let buildUrl = build._links?.web?.href;
      if (!buildUrl && userConfig && userConfig.organization && userConfig.project) {
        const organization = userConfig.organization;
        const project = userConfig.project;
        const baseUrl = userConfig.baseUrl || 'https://dev.azure.com';
        buildUrl = `${baseUrl}/${organization}/${project}/_build/results?buildId=${build.id}`;
      }

      await notificationHistoryService.saveNotification(userId, {
        type: 'build',
        subType: build.result?.toLowerCase(),
        title: `Build ${build.result}: ${build.definition?.name || 'Unknown'}`,
        message,
        source: 'webhook',
        metadata: {
          buildId: build.id,
          buildNumber: build.buildNumber,
          result: build.result,
          status: build.status,
          repository: build.repository?.name,
          branch: build.sourceBranch?.replace('refs/heads/', ''),
          commit: build.sourceVersion?.substring(0, 8),
          commitMessage: build.triggerInfo?.['ci.message'],
          requestedBy: build.requestedBy?.displayName,
          requestedFor: build.requestedFor?.displayName,
          reason: build.reason,
          queueTime: build.queueTime,
          startTime: build.startTime,
          finishTime: build.finishTime,
          duration,
          url: buildUrl
        },
        channels
      });

    } catch (error) {
      logger.error(`Error sending user notification for ${userId}:`, error);
    }
  }

  formatBuildCard(build, aiSummary, userConfig) {
    const buildName = build.definition?.name || 'Unknown Build';
    const buildNumber = build.buildNumber || 'Unknown';
    const result = build.result || 'unknown';
    const requestedBy = build.requestedBy?.displayName || 'Unknown';
    const sourceBranch = build.sourceBranch?.replace('refs/heads/', '') || 'Unknown';
    const projectName = build.project?.name || 'Unknown Project';
    const repositoryName = build.repository?.name || 'Unknown Repository';
    const sourceVersion = build.sourceVersion ? build.sourceVersion.substring(0, 8) : 'Unknown';
    
    // Extract PR information
    let commitInfo = sourceVersion;
    if (build.triggerInfo && build.triggerInfo['pr.number']) {
      commitInfo += ` (PR #${build.triggerInfo['pr.number']})`;
    } else if (build.reason === 'pullRequest' && build.parameters) {
      const prMatch = JSON.stringify(build.parameters).match(/pr[.\s]*(\d+)/i);
      if (prMatch) {
        commitInfo += ` (PR #${prMatch[1]})`;
      }
    }

    // Calculate duration
    let duration = '';
    if (build.startTime && build.finishTime) {
      const durationMs = new Date(build.finishTime) - new Date(build.startTime);
      const durationSec = Math.round(durationMs / 1000);
      duration = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
    }

    // Construct build URL
    let buildUrl = build._links?.web?.href;
    if (!buildUrl && userConfig && userConfig.organization && userConfig.project) {
      const organization = userConfig.organization;
      const project = userConfig.project;
      const baseUrl = userConfig.baseUrl || 'https://dev.azure.com';
      buildUrl = `${baseUrl}/${organization}/${project}/_build/results?buildId=${build.id}`;
    }

    // Determine card styling based on result
    let title, imageUrl, isFailed;
    switch (result.toLowerCase()) {
      case 'succeeded':
        title = '✅ Build Succeeded';
        imageUrl = 'https://img.icons8.com/color/96/ok.png';
        isFailed = false;
        break;
      case 'failed':
        title = '❌ Build Failed';
        imageUrl = 'https://img.icons8.com/color/96/high-priority.png';
        isFailed = true;
        break;
      case 'partiallysucceeded':
        title = '⚠️ Build Partially Succeeded';
        imageUrl = 'https://img.icons8.com/color/96/warning-shield.png';
        isFailed = false;
        break;
      case 'canceled':
        title = '🚫 Build Canceled';
        imageUrl = 'https://img.icons8.com/color/96/cancel.png';
        isFailed = false;
        break;
      default:
        title = '📦 Build Completed';
        imageUrl = 'https://img.icons8.com/color/96/package.png';
        isFailed = false;
    }

    const detailWidgets = [
      {
        decoratedText: {
          startIcon: { knownIcon: 'BOOKMARK' },
          topLabel: 'Build Number',
          text: `<b>#${buildNumber}</b>`
        }
      },
      {
        decoratedText: {
          startIcon: { knownIcon: 'DESCRIPTION' },
          topLabel: 'Repository',
          text: `${repositoryName}`
        }
      },
      {
        decoratedText: {
          startIcon: { knownIcon: 'STAR' },
          topLabel: 'Branch',
          text: sourceBranch
        }
      },
      {
        decoratedText: {
          startIcon: { knownIcon: 'BOOKMARK' },
          topLabel: 'Commit',
          text: commitInfo
        }
      },
      {
        decoratedText: {
          startIcon: { knownIcon: 'PERSON' },
          topLabel: 'Requested By',
          text: requestedBy
        }
      }
    ];

    if (duration) {
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'CLOCK' },
          topLabel: 'Duration',
          text: duration
        }
      });
    }

    const sections = [
      {
        header: '📋 Build Details',
        widgets: detailWidgets
      }
    ];

    // Add AI analysis section for failures
    if (isFailed && aiSummary) {
      sections.push({
        header: '🤖 AI Analysis',
        collapsible: true,
        uncollapsibleWidgetsCount: 0,
        widgets: [{
          textParagraph: {
            text: `<pre>${aiSummary}</pre>`
          }
        }]
      });
    }

    // Add URL section
    sections.push({
      widgets: [
        {
          decoratedText: {
            topLabel: 'Build URL',
            text: `<a href="${buildUrl}">${buildUrl}</a>`,
            wrapText: true
          }
        },
        {
          buttonList: {
            buttons: [{
              text: 'View Build',
              icon: { knownIcon: 'OPEN_IN_NEW' },
              onClick: {
                openLink: { url: buildUrl }
              }
            }]
          }
        }
      ]
    });

    return {
      cardsV2: [{
        cardId: `build-${build.id}`,
        card: {
          header: {
            title: title,
            subtitle: buildName,
            imageUrl: imageUrl,
            imageType: 'CIRCLE'
          },
          sections: sections
        }
      }]
    };
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
