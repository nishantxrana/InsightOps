import express from 'express';
import notificationHistoryService from '../services/notificationHistoryService.js';

const router = express.Router();

// Get notifications with filters (uses org context from middleware)
router.get('/', async (req, res) => {
  try {
    const { type, read, starred, limit, skip } = req.query;
    const userId = req.user._id;
    const organizationId = req.organizationId;
    
    // Return empty if no org context (user hasn't set up org yet)
    if (!organizationId) {
      return res.json([]);
    }

    const notifications = await notificationHistoryService.getNotifications(userId, organizationId, {
      type,
      read: read !== undefined ? read === 'true' : undefined,
      starred: starred !== undefined ? starred === 'true' : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user._id;
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      return res.json({ count: 0 });
    }

    const count = await notificationHistoryService.getUnreadCount(userId, organizationId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Get counts by type
router.get('/counts', async (req, res) => {
  try {
    const userId = req.user._id;
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      return res.json({});
    }

    const counts = await notificationHistoryService.getCountsByType(userId, organizationId);
    res.json(counts);
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await notificationHistoryService.markAsRead(id, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Toggle star
router.patch('/:id/star', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await notificationHistoryService.toggleStar(id, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error toggling star:', error);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

export default router;
