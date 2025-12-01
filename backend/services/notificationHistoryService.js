import NotificationHistory from '../models/NotificationHistory.js';

class NotificationHistoryService {
  async saveNotification(userId, notificationData) {
    try {
      const notification = new NotificationHistory({
        userId,
        ...notificationData,
        createdAt: new Date()
      });
      
      return await notification.save();
    } catch (error) {
      console.error('Error saving notification:', error);
      throw error;
    }
  }

  async getNotifications(userId, filters = {}) {
    const { type, read, starred, limit = 50, skip = 0 } = filters;
    
    const query = { userId, archived: false };
    if (type) query.type = type;
    if (read !== undefined) query.read = read;
    if (starred !== undefined) query.starred = starred;

    return await NotificationHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  async getUnreadCount(userId) {
    return await NotificationHistory.countDocuments({ 
      userId, 
      read: false, 
      archived: false 
    });
  }

  async getCountsByType(userId) {
    const counts = await NotificationHistory.aggregate([
      { $match: { userId, archived: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    return counts.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});
  }

  async markAsRead(notificationId, userId) {
    return await NotificationHistory.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );
  }

  async toggleStar(notificationId, userId) {
    const notification = await NotificationHistory.findOne({ _id: notificationId, userId });
    if (!notification) return null;
    
    notification.starred = !notification.starred;
    return await notification.save();
  }
}

export default new NotificationHistoryService();
