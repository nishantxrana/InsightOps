import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';

class WorkItemWebhook {
  async handleCreated(req, res) {
    try {
      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      logger.info('Work item created webhook received', {
        workItemId: resource.id,
        workItemType: resource.fields?.['System.WorkItemType'],
        title: resource.fields?.['System.Title'],
        assignedTo: resource.fields?.['System.AssignedTo']?.displayName
      });

      // Generate AI summary of the work item
      const aiSummary = await aiService.summarizeWorkItem(resource);
      
      // Format notification message
      const message = markdownFormatter.formatWorkItemCreated(resource, aiSummary);
      
      // Send notification
      await notificationService.sendNotification(message, 'work-item-created');
      
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

  async handleUpdated(req, res) {
    try {
      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      const workItemId = resource.id;
      const workItemType = resource.fields?.['System.WorkItemType'];
      const title = resource.fields?.['System.Title'];
      const state = resource.fields?.['System.State'];
      const assignedTo = resource.fields?.['System.AssignedTo']?.displayName;
      const changedBy = resource.fields?.['System.ChangedBy']?.displayName;

      logger.info('Work item updated webhook received', {
        workItemId,
        workItemType,
        title,
        state,
        assignedTo,
        changedBy
      });

      // Format notification message
      const message = markdownFormatter.formatWorkItemUpdated(resource);
      
      // Send notification
      await notificationService.sendNotification(message, 'work-item-updated');
      
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
}

export const workItemWebhook = new WorkItemWebhook();
