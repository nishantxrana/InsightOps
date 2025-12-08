import { notificationQueue } from './notificationQueue.js';
import { logger } from './logger.js';

/**
 * Send Google Chat notification via queue
 * Drop-in replacement for direct axios.post calls
 */
export async function sendGoogleChatNotification(userId, payload, webhookUrl) {
  if (!userId || !webhookUrl || !payload) {
    logger.error('Missing required parameters for notification', { userId, webhookUrl: !!webhookUrl, payload: !!payload });
    throw new Error('Missing required parameters: userId, payload, and webhookUrl are required');
  }

  // Enqueue the notification
  notificationQueue.enqueue(userId, {
    payload,
    webhookUrl,
    type: 'google-chat'
  });

  logger.debug(`Notification queued for user ${userId}`);
  
  // Return immediately - notification will be processed asynchronously
  return { queued: true };
}
