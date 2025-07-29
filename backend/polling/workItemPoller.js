import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';

class WorkItemPoller {
  constructor() {
    this.lastPollTime = new Date();
    this.processedWorkItems = new Set();
  }

  async pollWorkItems() {
    try {
      logger.info('Starting work items polling');

      // Get current sprint work items
      const sprintWorkItems = await azureDevOpsClient.getCurrentSprintWorkItems();
      
      if (sprintWorkItems.count > 0) {
        logger.info(`Found ${sprintWorkItems.count} work items in current sprint`);
        
        // Generate and send daily sprint summary (only once per day)
        if (this.shouldSendDailySummary()) {
          await this.sendSprintSummary(sprintWorkItems.value);
        }
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

  async sendSprintSummary(workItems) {
    try {
      logger.info('Generating sprint summary');

      const summary = await aiService.summarizeSprintWorkItems(workItems);
      await notificationService.sendSprintSummary(summary);
      
      logger.info('Sprint summary sent successfully');
    } catch (error) {
      logger.error('Error sending sprint summary:', error);
    }
  }

  shouldSendDailySummary() {
    const now = new Date();
    const lastSummaryDate = this.getLastSummaryDate();
    
    // Send summary once per day at 9 AM or later
    return (
      now.getHours() >= 9 && 
      (!lastSummaryDate || now.toDateString() !== lastSummaryDate.toDateString())
    );
  }

  getLastSummaryDate() {
    // In a real implementation, this would be stored in a database or file
    // For now, we'll use a simple in-memory approach
    return this.lastSummaryDate || null;
  }

  setLastSummaryDate(date) {
    this.lastSummaryDate = date;
  }
}

export const workItemPoller = new WorkItemPoller();
