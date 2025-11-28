import { logger } from '../utils/logger.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';
import axios from 'axios';

class ReleaseWebhook {
  async handleDeploymentCompleted(req, res, userId = null) {
    try {
      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      const releaseId = resource.environment?.releaseId;
      const releaseName = resource.environment?.preDeployApprovals?.[0]?.release?.name || 
                         resource.environment?.postDeployApprovals?.[0]?.release?.name ||
                         `Release-${releaseId}`;
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

      const status = (environmentStatus || deploymentStatus || '').toLowerCase();
      const isFailed = status === 'failed' || status === 'rejected';
      
      let failedLogs = null;
      
      // Fetch failed task logs if deployment failed
      if (isFailed && releaseId && userSettings?.azureDevOps) {
        try {
          failedLogs = await this.fetchFailedTaskLogs(releaseId, userSettings.azureDevOps);
        } catch (error) {
          logger.error('Error fetching failed task logs:', error);
        }
      }

      // Send notification
      const notificationType = this.getNotificationType(status);
      
      if (userId) {
        await this.sendUserNotification(resource, userSettings, notificationType, failedLogs);
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

  getNotificationType(status) {
    switch (status) {
      case 'succeeded':
        return 'release-succeeded';
      case 'partiallysucceeded':
        return 'release-partially-succeeded';
      case 'failed':
      case 'rejected':
        return 'release-failed';
      case 'canceled':
        return 'release-canceled';
      default:
        return 'release-unknown';
    }
  }

  async fetchFailedTaskLogs(releaseId, azureDevOpsConfig) {
    try {
      const { organization, project, pat } = azureDevOpsConfig;
      const baseUrl = `https://vsrm.dev.azure.com/${organization}/${project}`;
      const auth = Buffer.from(`:${pat}`).toString('base64');

      // Get release details
      const releaseResponse = await axios.get(
        `${baseUrl}/_apis/release/releases/${releaseId}`,
        {
          headers: { 'Authorization': `Basic ${auth}` },
          params: { 'api-version': '6.0' }
        }
      );

      const release = releaseResponse.data;
      const failedTasks = [];

      // Get failed tasks from environments
      for (const env of release.environments || []) {
        try {
          const tasksResponse = await axios.get(
            `${baseUrl}/_apis/release/releases/${releaseId}/environments/${env.id}/tasks`,
            {
              headers: { 'Authorization': `Basic ${auth}` },
              params: { 'api-version': '6.0' }
            }
          );

          const tasks = tasksResponse.data.value || [];

          for (const task of tasks) {
            if ((task.status === 'failed' || task.status === 'error') && 
                task.name && 
                !task.name.toLowerCase().includes('agent job')) {
              
              let logContent = '';
              if (task.logUrl) {
                try {
                  const logResponse = await axios.get(task.logUrl, {
                    headers: { 'Authorization': `Basic ${auth}` },
                    timeout: 10000
                  });
                  // Get last 1000 characters of log
                  logContent = (logResponse.data || '').slice(-1000);
                } catch (logError) {
                  logContent = 'Log content unavailable';
                }
              }

              failedTasks.push({
                taskName: task.name,
                environmentName: env.name,
                logContent: logContent
              });
            }
          }
        } catch (taskError) {
          logger.warn(`Failed to fetch tasks for environment ${env.id}:`, taskError.message);
        }
      }

      return failedTasks.length > 0 ? failedTasks : null;
    } catch (error) {
      logger.error('Error in fetchFailedTaskLogs:', error);
      return null;
    }
  }

  async sendUserNotification(resource, userSettings, notificationType, failedLogs) {
    try {
      if (!userSettings?.notifications?.enabled) {
        logger.info('Notifications disabled for user');
        return;
      }

      // Send to Google Chat if enabled
      if (userSettings.notifications.googleChatEnabled && userSettings.notifications.webhooks?.googleChat) {
        const isFailed = notificationType === 'release-failed';
        
        if (isFailed && failedLogs) {
          // Send as Card with logs for failures
          const card = this.formatReleaseCard(resource, userSettings.azureDevOps, failedLogs);
          await this.sendGoogleChatCard(card, userSettings.notifications.webhooks.googleChat);
        } else {
          // Send as Card for success/partial/canceled
          const card = this.formatSuccessCard(resource, userSettings.azureDevOps, notificationType);
          await this.sendGoogleChatCard(card, userSettings.notifications.webhooks.googleChat);
        }
        
        logger.info('Release notification sent via Google Chat');
      }
    } catch (error) {
      logger.error('Error sending user notification:', error);
    }
  }

  formatSuccessCard(resource, userConfig, notificationType) {
    const release = resource.release || {};
    const environment = resource.environment || {};
    const deployment = resource.deployment || {};
    
    const releaseId = environment.releaseId || release.id;
    const releaseName = environment.preDeployApprovals?.[0]?.release?.name || 
                       environment.postDeployApprovals?.[0]?.release?.name ||
                       `Release-${releaseId}`;
    const releaseDefinitionName = environment.preDeployApprovals?.[0]?.releaseDefinition?.name ||
                                 environment.postDeployApprovals?.[0]?.releaseDefinition?.name ||
                                 'Unknown Pipeline';
    const environmentName = environment.name || 'Unknown Environment';
    const requestedFor = environment.preDeployApprovals?.[0]?.approvedBy?.displayName ||
                        release.createdBy?.displayName || 
                        'Unknown';

    // Get deployment duration
    const timeToDeploy = environment.timeToDeploy || deployment.timeToDeploy;
    let durationText = '';
    if (timeToDeploy) {
      const seconds = Math.round(timeToDeploy * 60);
      durationText = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }

    // Use direct web URL from webhook
    const webUrl = deployment.release?.webAccessUri || release.webAccessUri;

    // Determine card styling based on status
    let title, imageUrl, headerColor;
    switch (notificationType) {
      case 'release-succeeded':
        title = '✅ Production Deployment Succeeded';
        imageUrl = 'https://img.icons8.com/fluency/96/ok.png';
        break;
      case 'release-partially-succeeded':
        title = '⚠️ Production Deployment Partially Succeeded';
        imageUrl = 'https://img.icons8.com/fluency/96/warning-shield.png';
        break;
      case 'release-canceled':
        title = '🚫 Production Deployment Canceled';
        imageUrl = 'https://img.icons8.com/fluency/96/cancel.png';
        break;
      default:
        title = '📦 Production Deployment Completed';
        imageUrl = 'https://img.icons8.com/fluency/96/package.png';
    }

    const detailWidgets = [
      {
        decoratedText: {
          startIcon: { knownIcon: 'BOOKMARK' },
          topLabel: 'Release',
          text: `<b>${releaseName}</b>`
        }
      },
      {
        decoratedText: {
          startIcon: { knownIcon: 'DESCRIPTION' },
          topLabel: 'Environment',
          text: `<b>${environmentName}</b>`
        }
      },
      {
        decoratedText: {
          startIcon: { knownIcon: 'PERSON' },
          topLabel: 'Deployed By',
          text: requestedFor
        }
      }
    ];

    if (durationText) {
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'CLOCK' },
          topLabel: 'Duration',
          text: durationText
        }
      });
    }

    return {
      cardsV2: [{
        cardId: `release-${releaseId}`,
        card: {
          header: {
            title: title,
            subtitle: releaseDefinitionName,
            imageUrl: imageUrl,
            imageType: 'CIRCLE'
          },
          sections: [
            {
              header: '📋 Deployment Details',
              widgets: detailWidgets
            },
            {
              widgets: [{
                buttonList: {
                  buttons: [{
                    text: 'View Release in Azure DevOps',
                    icon: { knownIcon: 'OPEN_IN_NEW' },
                    onClick: {
                      openLink: { url: webUrl }
                    }
                  }]
                }
              }]
            }
          ]
        }
      }]
    };
  }

  formatReleaseCard(resource, userConfig, failedLogs) {
    const release = resource.release || {};
    const environment = resource.environment || {};
    const deployment = resource.deployment || {};
    
    const releaseId = environment.releaseId || release.id;
    const releaseName = environment.preDeployApprovals?.[0]?.release?.name || 
                       environment.postDeployApprovals?.[0]?.release?.name ||
                       `Release-${releaseId}`;
    const releaseDefinitionName = environment.preDeployApprovals?.[0]?.releaseDefinition?.name ||
                                 environment.postDeployApprovals?.[0]?.releaseDefinition?.name ||
                                 'Unknown Pipeline';
    const environmentName = environment.name || 'Unknown Environment';
    const requestedFor = environment.preDeployApprovals?.[0]?.approvedBy?.displayName ||
                        release.createdBy?.displayName || 
                        'Unknown';

    // Get deployment duration
    const timeToDeploy = environment.timeToDeploy || deployment.timeToDeploy;
    let durationText = '';
    if (timeToDeploy) {
      const seconds = Math.round(timeToDeploy * 60);
      durationText = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }

    // Use direct web URL from webhook or construct fallback
    let webUrl = deployment.release?.webAccessUri || release.webAccessUri;
    if (!webUrl && releaseId && userConfig && userConfig.organization && userConfig.project) {
      const organization = userConfig.organization;
      const project = userConfig.project;
      const baseUrl = userConfig.baseUrl || 'https://dev.azure.com';
      const encodedProject = encodeURIComponent(project);
      webUrl = `${baseUrl}/${organization}/${encodedProject}/_release?releaseId=${releaseId}&_a=release-summary`;
    }

    // Build log sections - make entire line red and bold if it contains ##[error]
    const logWidgets = failedLogs.map(task => {
      const formattedLog = task.logContent
        .split('\n')
        .map(line => {
          if (line.includes('##[error]')) {
            return `<font color="#d32f2f"><b>${line}</b></font>`;
          }
          return line;
        })
        .join('\n');
      
      return {
        textParagraph: {
          text: `<b>${task.taskName}</b> (${task.environmentName})\n<pre>${formattedLog}</pre>`
        }
      };
    });

    return {
      cardsV2: [{
        cardId: `release-${releaseId}`,
        card: {
          header: {
            title: '❌ Production Deployment Failed',
            subtitle: releaseDefinitionName,
            imageUrl: 'https://img.icons8.com/fluency/96/high-priority.png',
            imageType: 'CIRCLE'
          },
          sections: [
            {
              header: '📋 Deployment Details',
              widgets: [
                {
                  decoratedText: {
                    startIcon: { knownIcon: 'BOOKMARK' },
                    topLabel: 'Release',
                    text: `<b>${releaseName}</b>`
                  }
                },
                {
                  decoratedText: {
                    startIcon: { knownIcon: 'DESCRIPTION' },
                    topLabel: 'Environment',
                    text: `<b>${environmentName}</b>`
                  }
                },
                {
                  decoratedText: {
                    startIcon: { knownIcon: 'PERSON' },
                    topLabel: 'Deployed By',
                    text: requestedFor
                  }
                },
                ...(durationText ? [{
                  decoratedText: {
                    startIcon: { knownIcon: 'CLOCK' },
                    topLabel: 'Duration',
                    text: durationText
                  }
                }] : [])
              ]
            },
            {
              header: '🔍 Failed Task Logs',
              collapsible: true,
              uncollapsibleWidgetsCount: 0,
              widgets: logWidgets
            },
            {
              widgets: [{
                buttonList: {
                  buttons: [{
                    text: 'View Release in Azure DevOps',
                    icon: { knownIcon: 'OPEN_IN_NEW' },
                    onClick: {
                      openLink: { url: webUrl }
                    }
                  }]
                }
              }]
            }
          ]
        }
      }]
    };
  }

  async sendGoogleChatCard(card, webhookUrl) {
    try {
      await axios.post(webhookUrl, card);
    } catch (error) {
      logger.error('Error sending Google Chat card:', error);
      throw error;
    }
  }

  async sendGoogleChatText(message, webhookUrl) {
    try {
      await axios.post(webhookUrl, { text: message });
    } catch (error) {
      logger.error('Error sending Google Chat text:', error);
      throw error;
    }
  }
}

export const releaseWebhook = new ReleaseWebhook();
