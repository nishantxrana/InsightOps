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
          provider: userSettings?.ai?.provider,
          hasApiKeys: !!userSettings?.ai?.apiKeys,
          hasSpecificKey: !!userSettings?.ai?.apiKeys?.[userSettings?.ai?.provider],
          userId
        });
      }
      
      // Format notification message with user config
      const message = markdownFormatter.formatWorkItemCreated(resource, aiSummary, userConfig);
      
      // Send notification
      if (userId) {
        // User-specific notification with card format
        await this.sendUserNotification(message, userId, 'work-item-created', resource, aiSummary, userConfig);
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

  async sendUserNotification(message, userId, notificationType, workItem, aiSummary, userConfig) {
    try {
      const { getUserSettings } = await import('../utils/userSettings.js');
      const settings = await getUserSettings(userId);
      
      if (!settings.notifications?.enabled) {
        logger.info(`Notifications disabled for user ${userId}`);
        return;
      }

      // Send to enabled notification channels
      if (settings.notifications.googleChatEnabled && settings.notifications.webhooks?.googleChat) {
        // Send as card instead of text
        const card = this.formatWorkItemCard(workItem, aiSummary, userConfig);
        await this.sendGoogleChatCard(card, settings.notifications.webhooks.googleChat);
        
        // Send divider after work item notification
        const dividerCard = {
          cardsV2: [{
            cardId: `divider-workitem-${Date.now()}`,
            card: {
              sections: [{
                widgets: [{
                  divider: {}
                }]
              }]
            }
          }]
        };
        await this.sendGoogleChatCard(dividerCard, settings.notifications.webhooks.googleChat);
        
        logger.info(`Work item notification sent to user ${userId} via Google Chat`);
      }
    } catch (error) {
      logger.error(`Error sending user notification for ${userId}:`, error);
    }
  }

  formatWorkItemCard(workItem, aiSummary, userConfig) {
    const fields = workItem.fields || {};
    const title = fields['System.Title'] || 'No title';
    const workItemType = fields['System.WorkItemType'] || 'Work Item';
    const assignedTo = fields['System.AssignedTo'] || 'Unassigned';
    const createdBy = fields['System.CreatedBy'] || 'Unknown';
    const state = fields['System.State'] || 'New';
    const priority = fields['Microsoft.VSTS.Common.Priority'] || 'Not set';
    const createdDate = fields['System.CreatedDate'] || new Date().toISOString();
    const dueDate = fields['Microsoft.VSTS.Scheduling.DueDate'];
    const iterationPath = fields['System.IterationPath'] || 'Not set';
    const areaPath = fields['System.AreaPath'] || 'Not set';
    const description = fields['System.Description'];
    const severity = fields['Microsoft.VSTS.Common.Severity']; // Bug-specific
    const reproSteps = fields['Microsoft.VSTS.TCM.ReproSteps']; // Bug-specific
    const systemInfo = fields['Microsoft.VSTS.TCM.SystemInfo']; // Bug-specific

    // Extract display name from email format
    const extractDisplayName = (userString) => {
      if (!userString) return 'Unassigned';
      if (typeof userString === 'string') {
        const match = userString.match(/^([^<]+)<.*>$/) || userString.match(/^(.+)$/);
        return match ? match[1].trim() : userString;
      }
      return userString.displayName || userString.name || 'Unknown';
    };

    // Get priority color and text
    const getPriorityColor = (priority) => {
      const priorityMap = {
        1: '#d32f2f', // Critical - Red
        2: '#ff9800', // High - Orange
        3: '#fbc02d', // Medium - Yellow
        4: '#757575'  // Low - Gray
      };
      return priorityMap[priority] || '#757575';
    };

    const getPriorityText = (priority) => {
      const priorityMap = {
        1: 'Critical',
        2: 'High',
        3: 'Medium',
        4: 'Low'
      };
      return priorityMap[priority] || `Priority ${priority}`;
    };

    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'Not set';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // Strip HTML and truncate description
    const stripHtml = (html) => {
      if (!html) return 'No description';
      return html.replace(/<[^>]*>/g, '').trim().substring(0, 200) + '...';
    };

    // Construct work item URL
    let webUrl = workItem._links?.html?.href;
    if (!webUrl && userConfig && userConfig.organization && userConfig.project) {
      const organization = userConfig.organization;
      const project = fields['System.TeamProject'] || userConfig.project;
      const baseUrl = userConfig.baseUrl || 'https://dev.azure.com';
      const encodedProject = encodeURIComponent(project);
      webUrl = `${baseUrl}/${organization}/${encodedProject}/_workitems/edit/${workItem.id}`;
    }

    // Determine icon based on work item type
    const typeIcon = workItemType.toLowerCase().includes('bug') ? '🐛' :
                     workItemType.toLowerCase().includes('task') ? '✅' :
                     workItemType.toLowerCase().includes('user story') ? '📖' :
                     workItemType.toLowerCase().includes('feature') ? '🎯' : '📋';

    const priorityColor = getPriorityColor(priority);
    const priorityText = getPriorityText(priority);

    const detailWidgets = [
      {
        decoratedText: {
          startIcon: { knownIcon: 'BOOKMARK' },
          topLabel: 'Work Item',
          text: `<b>${workItemType} #${workItem.id}</b>`
        }
      },
      {
        decoratedText: {
          startIcon: { knownIcon: 'PERSON' },
          topLabel: 'Created By',
          text: extractDisplayName(createdBy)
        }
      }
    ];

    // Add severity for bugs, priority for others
    if (severity) {
      const severityColor = severity.includes('1 -') ? '#d32f2f' : 
                           severity.includes('2 -') ? '#ff9800' :
                           severity.includes('3 -') ? '#fbc02d' : '#757575';
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'STAR' },
          topLabel: 'Severity',
          text: `<font color="${severityColor}"><b>${severity}</b></font>`
        }
      });
    } else {
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'STAR' },
          topLabel: 'Priority',
          text: `<font color="${priorityColor}"><b>${priorityText}</b></font>`
        }
      });
    }

    detailWidgets.push({
      decoratedText: {
        startIcon: { knownIcon: 'DESCRIPTION' },
        topLabel: 'State',
        text: state
      }
    });

    // Add iteration if set
    if (iterationPath && iterationPath !== 'Not set') {
      const iterationName = iterationPath.split('\\').pop();
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'CLOCK' },
          topLabel: 'Iteration',
          text: iterationName
        }
      });
    }

    // Add due date if set
    if (dueDate) {
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'STAR' },
          topLabel: 'Due Date',
          text: formatDate(dueDate)
        }
      });
    }

    // Add assigned to if set
    if (assignedTo !== 'Unassigned') {
      detailWidgets.push({
        decoratedText: {
          startIcon: { knownIcon: 'PERSON' },
          topLabel: 'Assigned To',
          text: extractDisplayName(assignedTo)
        }
      });
    }

    const sections = [
      {
        header: '📋 Work Item Details',
        widgets: detailWidgets
      }
    ];

    // Add description section if available
    if (description) {
      sections.push({
        header: '📝 Description',
        collapsible: true,
        uncollapsibleWidgetsCount: 0,
        widgets: [{
          textParagraph: {
            text: stripHtml(description)
          }
        }]
      });
    }

    // Add bug-specific sections
    if (reproSteps) {
      sections.push({
        header: '🔄 Reproduction Steps',
        collapsible: true,
        uncollapsibleWidgetsCount: 0,
        widgets: [{
          textParagraph: {
            text: stripHtml(reproSteps)
          }
        }]
      });
    }

    if (systemInfo) {
      sections.push({
        header: '💻 System Information',
        collapsible: true,
        uncollapsibleWidgetsCount: 0,
        widgets: [{
          textParagraph: {
            text: stripHtml(systemInfo)
          }
        }]
      });
    }

    // Add AI summary section if available
    if (aiSummary) {
      sections.push({
        header: '🤖 AI Summary',
        collapsible: true,
        uncollapsibleWidgetsCount: 0,
        widgets: [{
          textParagraph: {
            text: aiSummary
          }
        }]
      });
    }

    // Add URL section
    sections.push({
      widgets: [
        {
          decoratedText: {
            topLabel: 'Work Item URL',
            text: `<a href="${webUrl}">${webUrl}</a>`,
            wrapText: true
          }
        },
        {
          buttonList: {
            buttons: [{
              text: 'Open Work Item',
              icon: { knownIcon: 'OPEN_IN_NEW' },
              onClick: {
                openLink: { url: webUrl }
              }
            }]
          }
        }
      ]
    });

    return {
      cardsV2: [{
        cardId: `workitem-${workItem.id}`,
        card: {
          header: {
            title: `${typeIcon} New ${workItemType} Created`,
            subtitle: title,
            imageUrl: 'https://img.icons8.com/color/96/task.png',
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
}

export const workItemWebhook = new WorkItemWebhook();
