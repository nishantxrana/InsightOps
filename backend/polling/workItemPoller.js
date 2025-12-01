import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { notificationService } from '../notifications/notificationService.js';
import { getUserSettings } from '../utils/userSettings.js';
import notificationHistoryService from '../services/notificationHistoryService.js';

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
            await this.sendOverdueNotification(overdueItems.value, settings, userId);
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
WorkItemPoller.prototype.sendOverdueNotification = async function(overdueItems, userSettings, userId) {
  try {
    if (!userSettings.notifications?.enabled) {
      return;
    }
    
    // Batch processing - 10 items per card with 5 second delay
    const batchSize = 10;
    const delayBetweenBatches = 5000;
    const totalBatches = Math.ceil(overdueItems.length / batchSize);
    const channels = [];
    
    for (let i = 0; i < overdueItems.length; i += batchSize) {
      const batch = overdueItems.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      const card = this.formatOverdueItemsCard(batch, batchNumber, totalBatches, overdueItems.length);
      
      if (userSettings.notifications.googleChatEnabled && userSettings.notifications.webhooks?.googleChat) {
        try {
          await this.sendGoogleChatCard(card, userSettings.notifications.webhooks.googleChat);
          if (i === 0) channels.push({ platform: 'google-chat', status: 'sent', sentAt: new Date() });
        } catch (error) {
          if (i === 0) channels.push({ platform: 'google-chat', status: 'failed', error: error.message });
        }
      }
      
      if (i + batchSize < overdueItems.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    // Send divider
    if (userSettings.notifications.googleChatEnabled && userSettings.notifications.webhooks?.googleChat) {
      const dividerCard = {
        cardsV2: [{
          cardId: `divider-overdue-${Date.now()}`,
          card: { sections: [{ widgets: [{ divider: {} }] }] }
        }]
      };
      await this.sendGoogleChatCard(dividerCard, userSettings.notifications.webhooks.googleChat);
    }
    
    // Save to notification history
    if (userId) {
      await notificationHistoryService.saveNotification(userId, {
        type: 'overdue',
        title: `${overdueItems.length} Overdue Work Items`,
        message: `Found ${overdueItems.length} overdue work items`,
        source: 'poller',
        metadata: { count: overdueItems.length, items: overdueItems.map(i => i.id) },
        channels
      });
    }
    
    logger.info(`Overdue notifications sent in ${totalBatches} batches`);
  } catch (error) {
    logger.error('Failed to send overdue notification:', error);
  }
};

WorkItemPoller.prototype.formatOverdueItemsCard = function(overdueItems, batchNumber, totalBatches, totalCount) {
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

  const workItemSections = overdueItems.map(item => {
    const title = item.fields?.['System.Title'] || 'No title';
    const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
    const dueDate = item.fields?.['Microsoft.VSTS.Scheduling.DueDate'];
    const workItemType = item.fields?.['System.WorkItemType'] || 'Item';
    const state = item.fields?.['System.State'] || 'Unknown';
    const priority = item.fields?.['Microsoft.VSTS.Common.Priority'] || 4;
    const daysPastDue = dueDate ? Math.floor((Date.now() - new Date(dueDate)) / (1000 * 60 * 60 * 24)) : 0;
    const itemUrl = item.webUrl || item._links?.html?.href || `#${item.id}`;

    const priorityColor = getPriorityColor(priority);
    const priorityText = getPriorityText(priority);
    const dueDateFormatted = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) : 'No due date';

    // Determine icon based on work item type
    const typeIcon = workItemType.toLowerCase().includes('bug') ? '🐛' : 
                     workItemType.toLowerCase().includes('task') ? '✅' :
                     workItemType.toLowerCase().includes('user story') ? '📖' : '📋';

    return {
      header: `${typeIcon} ${workItemType} #${item.id} - ${title}`,
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        {
          decoratedText: {
            startIcon: { knownIcon: 'CLOCK' },
            topLabel: 'Days Overdue',
            text: `<b>${daysPastDue} days</b>`
          }
        },
        {
          decoratedText: {
            startIcon: { knownIcon: 'PERSON' },
            topLabel: 'Assigned To',
            text: assignee
          }
        },
        {
          decoratedText: {
            startIcon: { knownIcon: 'STAR' },
            topLabel: 'Priority',
            text: `<font color="${priorityColor}"><b>${priorityText}</b></font>`
          }
        },
        {
          decoratedText: {
            startIcon: { knownIcon: 'CALENDAR_TODAY' },
            topLabel: 'Due Date',
            text: dueDateFormatted
          }
        },
        {
          decoratedText: {
            startIcon: { knownIcon: 'BOOKMARK' },
            topLabel: 'State',
            text: state
          }
        },
        {
          buttonList: {
            buttons: [{
              text: 'Open Work Item',
              icon: { knownIcon: 'OPEN_IN_NEW' },
              onClick: { openLink: { url: itemUrl } }
            }]
          }
        }
      ]
    };
  });

  const allSections = [
    ...workItemSections,
    ...(batchNumber === totalBatches ? [{
      widgets: [{
        textParagraph: {
          text: '⚠️ <b>Action Required:</b> Please review and update the status of these items to keep the project on track.'
        }
      }]
    }] : [])
  ];

  return {
    cardsV2: [{
      cardId: `overdue-items-batch-${batchNumber}`,
      card: {
        header: {
          title: `⚠️ Overdue Work Items - Batch ${batchNumber}/${totalBatches}`,
          subtitle: `${overdueItems.length} of ${totalCount} items past their due date`,
          imageUrl: 'https://img.icons8.com/color/96/overtime.png',
          imageType: 'CIRCLE'
        },
        sections: allSections
      }
    }]
  };
};

WorkItemPoller.prototype.sendGoogleChatCard = async function(card, webhookUrl) {
  try {
    const axios = (await import('axios')).default;
    await axios.post(webhookUrl, card);
  } catch (error) {
    logger.error('Error sending Google Chat card:', error);
    throw error;
  }
};
