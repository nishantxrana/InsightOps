import express from 'express';
import { notificationQueue } from '../utils/notificationQueue.js';
import { createRequestLogger } from '../utils/logger.js';

const router = express.Router();

// Get overall queue status
router.get('/status', async (req, res) => {
  const log = createRequestLogger(req, 'queue-api');
  try {
    const status = notificationQueue.getAllQueuesStatus();
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch queue status', { error: error.message, action: 'get-status' });
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

// Get queue status for specific user
router.get('/status/:userId', async (req, res) => {
  const log = createRequestLogger(req, 'queue-api');
  try {
    const { userId } = req.params;
    const status = notificationQueue.getQueueStatus(userId);
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch user queue status', { 
      error: error.message, 
      action: 'get-user-status',
      targetUserId: req.params.userId 
    });
    res.status(500).json({ error: 'Failed to fetch user queue status' });
  }
});

// Get dead letter queue
router.get('/dead-letter', async (req, res) => {
  const log = createRequestLogger(req, 'queue-api');
  try {
    const deadLetter = notificationQueue.getDeadLetter();
    res.json({ count: deadLetter.length, items: deadLetter });
  } catch (error) {
    log.error('Failed to fetch dead letter queue', { error: error.message, action: 'get-dead-letter' });
    res.status(500).json({ error: 'Failed to fetch dead letter queue' });
  }
});

// Clear queue for specific user
router.delete('/clear/:userId', async (req, res) => {
  const log = createRequestLogger(req, 'queue-api');
  try {
    const { userId } = req.params;
    notificationQueue.clearQueue(userId);
    log.info('Queue cleared', { action: 'clear-queue', targetUserId: userId });
    res.json({ success: true, message: `Queue cleared for user ${userId}` });
  } catch (error) {
    log.error('Failed to clear queue', { 
      error: error.message, 
      action: 'clear-queue',
      targetUserId: req.params.userId 
    });
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

export default router;
