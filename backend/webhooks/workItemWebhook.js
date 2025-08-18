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
        eventType: webhookData.eventType
      });

      // Format notification message with complete webhook data
      const message = markdownFormatter.formatWorkItemUpdated(webhookData);
      
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
