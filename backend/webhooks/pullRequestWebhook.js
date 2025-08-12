import { logger } from '../utils/logger.js';
import { aiService } from '../ai/aiService.js';
import { notificationService } from '../notifications/notificationService.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';

class PullRequestWebhook {
  async handleCreated(req, res) {
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
        reviewers
      });

      // Add web URL to the resource object
      resource.webUrl = azureDevOpsClient.constructPullRequestWebUrl(resource);

      // Generate AI summary of the PR changes
      // let aiSummary = null;
      // try {
      //   // const prDetails = await azureDevOpsClient.getPullRequestDetails(pullRequestId);
      //   logger.info('Fetched pull request detailss:', resource);
      //   aiSummary = await aiService.summarizePullRequest(resource);
      // } catch (error) {
      //   logger.error('Error generating AI summary for PR:', error);
      // }

      // Format notification message
      const message = markdownFormatter.formatPullRequestCreated(resource);
      
      // Send notification
      await notificationService.sendNotification(message, 'pull-request-created');
      
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

  async handleUpdated(req, res) {
    try {
      const { resource } = req.body;
      
      if (!resource) {
        return res.status(400).json({ error: 'Missing resource in webhook payload' });
      }

      const pullRequestId = resource.pullRequestId;
      const title = resource.title;
      const status = resource.status;
      const updatedBy = resource.lastMergeCommit?.author?.name || 'Unknown';

      logger.info('Pull request updated webhook received', {
        pullRequestId,
        title,
        status,
        updatedBy
      });

      // Add web URL to the resource object
      resource.webUrl = azureDevOpsClient.constructPullRequestWebUrl(resource);

      // Check if this is a reviewer assignment
      const isReviewerAssignment = this.isReviewerAssignment(req.body);
      
      if (isReviewerAssignment) {
        const newReviewers = this.getNewReviewers(req.body);
        const message = markdownFormatter.formatPullRequestReviewerAssigned(resource, newReviewers);
        await notificationService.sendNotification(message, 'pull-request-reviewer-assigned');
      } else {
        const message = markdownFormatter.formatPullRequestUpdated(resource);
        await notificationService.sendNotification(message, 'pull-request-updated');
      }
      
      res.json({
        message: 'Pull request updated webhook processed successfully',
        pullRequestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing pull request updated webhook:', error);
      res.status(500).json({
        error: 'Failed to process pull request updated webhook',
        message: error.message
      });
    }
  }

  isReviewerAssignment(webhookPayload) {
    // Check if the update includes reviewer changes
    const resource = webhookPayload.resource;
    return resource.reviewers && resource.reviewers.length > 0;
  }

  getNewReviewers(webhookPayload) {
    // Extract newly assigned reviewers
    const resource = webhookPayload.resource;
    return resource.reviewers?.map(r => r.displayName) || [];
  }
}

export const pullRequestWebhook = new PullRequestWebhook();
