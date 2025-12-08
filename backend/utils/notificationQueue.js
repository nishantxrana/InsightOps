import { logger } from './logger.js';

class NotificationQueue {
  constructor() {
    this.queues = new Map(); // userId -> array of notifications
    this.processing = new Map(); // userId -> boolean
    this.deadLetter = [];
    this.stats = new Map(); // userId -> { sent, failed, retried }
  }

  enqueue(userId, notification) {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
      this.stats.set(userId, { sent: 0, failed: 0, retried: 0 });
    }

    this.queues.get(userId).push({
      ...notification,
      attempt: 0,
      enqueuedAt: Date.now()
    });

    logger.debug(`Enqueued notification for user ${userId}, queue size: ${this.queues.get(userId).length}`);

    // Start processing if not already running
    if (!this.processing.get(userId)) {
      this.processQueue(userId);
    }
  }

  async processQueue(userId) {
    if (this.processing.get(userId)) return;

    const queue = this.queues.get(userId);
    if (!queue || queue.length === 0) return;

    this.processing.set(userId, true);

    while (queue.length > 0) {
      const notification = queue[0];

      try {
        await this.sendNotification(notification);
        
        // Success - remove from queue
        queue.shift();
        const stats = this.stats.get(userId);
        stats.sent++;
        
        logger.info(`Notification sent successfully for user ${userId}`);

        // Rate limit: wait 500ms between requests
        await this.delay(500);

      } catch (error) {
        notification.attempt++;
        notification.lastError = error.message;

        if (notification.attempt >= 3) {
          // Max retries reached - move to dead letter
          queue.shift();
          this.moveToDeadLetter(userId, notification, error);
          
          const stats = this.stats.get(userId);
          stats.failed++;
          
          logger.error(`Notification failed permanently for user ${userId} after 3 attempts`);
        } else {
          // Retry with exponential backoff
          const backoffDelay = Math.pow(2, notification.attempt - 1) * 1000; // 1s, 2s, 4s
          
          const stats = this.stats.get(userId);
          stats.retried++;
          
          logger.warn(`Notification failed for user ${userId}, retrying in ${backoffDelay}ms (attempt ${notification.attempt}/3)`);
          
          await this.delay(backoffDelay);
        }
      }
    }

    this.processing.set(userId, false);
  }

  async sendNotification(notification) {
    const axios = (await import('axios')).default;
    
    await axios.post(notification.webhookUrl, notification.payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
  }

  moveToDeadLetter(userId, notification, error) {
    this.deadLetter.push({
      userId,
      notification,
      error: error.message,
      failedAt: Date.now()
    });

    // Keep only last 100 failed notifications
    if (this.deadLetter.length > 100) {
      this.deadLetter.shift();
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueStatus(userId) {
    return {
      queueSize: this.queues.get(userId)?.length || 0,
      processing: this.processing.get(userId) || false,
      stats: this.stats.get(userId) || { sent: 0, failed: 0, retried: 0 }
    };
  }

  getAllQueuesStatus() {
    const status = {};
    for (const [userId, queue] of this.queues.entries()) {
      status[userId] = this.getQueueStatus(userId);
    }
    return {
      queues: status,
      deadLetterCount: this.deadLetter.length
    };
  }

  getDeadLetter() {
    return this.deadLetter;
  }

  clearQueue(userId) {
    this.queues.delete(userId);
    this.processing.delete(userId);
    logger.info(`Cleared queue for user ${userId}`);
  }
}

// Singleton instance
export const notificationQueue = new NotificationQueue();
