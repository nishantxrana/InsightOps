import express from 'express';
import { notificationQueue } from '../utils/notificationQueue.js';

const router = express.Router();

// Get overall queue status
router.get('/status', async (req, res) => {
  try {
    const status = notificationQueue.getAllQueuesStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

// Get queue status for specific user
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = notificationQueue.getQueueStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching user queue status:', error);
    res.status(500).json({ error: 'Failed to fetch user queue status' });
  }
});

// Get dead letter queue
router.get('/dead-letter', async (req, res) => {
  try {
    const deadLetter = notificationQueue.getDeadLetter();
    res.json({ count: deadLetter.length, items: deadLetter });
  } catch (error) {
    console.error('Error fetching dead letter queue:', error);
    res.status(500).json({ error: 'Failed to fetch dead letter queue' });
  }
});

// Clear queue for specific user
router.delete('/clear/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    notificationQueue.clearQueue(userId);
    res.json({ success: true, message: `Queue cleared for user ${userId}` });
  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

export default router;
