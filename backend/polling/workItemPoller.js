import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { notificationService } from '../notifications/notificationService.js';

class WorkItemPoller {
  constructor() {
    this.lastPollTime = new Date();
    this.processedWorkItems = new Set();
  }

  async pollWorkItems() {
    try {
      logger.info('Starting work items polling');

      // Get current sprint work items for monitoring purposes
      const sprintWorkItems = await azureDevOpsClient.getCurrentSprintWorkItems();
      
      if (sprintWorkItems.count > 0) {
        logger.info(`Found ${sprintWorkItems.count} work items in current sprint`);
        
        // Check for overdue items and send notifications
        await this.checkOverdueItems();
      } else {
        logger.info('No work items found in current sprint');
      }

      this.lastPollTime = new Date();
    } catch (error) {
      logger.error('Error polling work items:', error);
    }
  }

  async checkOverdueItems() {
    try {
      logger.info('Checking for overdue work items');

      const overdueItems = await azureDevOpsClient.getOverdueWorkItems();
      
      if (overdueItems.count > 0) {
        logger.warn(`Found ${overdueItems.count} overdue work items`);
        await notificationService.sendOverdueReminder(overdueItems.value);
      } else {
        logger.info('No overdue work items found');
      }
    } catch (error) {
      logger.error('Error checking overdue items:', error);
    }
  }
}

export const workItemPoller = new WorkItemPoller();
