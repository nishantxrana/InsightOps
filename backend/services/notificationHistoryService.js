import NotificationHistory from '../models/NotificationHistory.js';
import mongoose from 'mongoose';

class NotificationHistoryService {
  async saveNotification(userId, organizationId, notificationData) {
    try {
      const notification = new NotificationHistory({
        userId: new mongoose.Types.ObjectId(userId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        ...notificationData,
        createdAt: new Date()
      });
      
      return await notification.save();
    } catch (error) {
      console.error('Error saving notification:', error);
      throw error;
    }
  }

  async getNotifications(userId, organizationId, filters = {}) {
    const { type, read, starred, limit = 50, skip = 0 } = filters;
    
    const query = { 
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      archived: false 
    };
    if (type) query.type = type;
    if (read !== undefined) query.read = read;
    if (starred !== undefined) query.starred = starred;
    
    const results = await NotificationHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
      
    return results;
  }

  async getUnreadCount(userId, organizationId) {
    return await NotificationHistory.countDocuments({ 
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      read: false, 
      archived: false 
    });
  }

  async getCountsByType(userId, organizationId) {
    const counts = await NotificationHistory.aggregate([
      { $match: { 
        userId: new mongoose.Types.ObjectId(userId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        archived: false 
      }},
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    const result = counts.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});
    
    // Add total count
    result.total = Object.values(result).reduce((sum, count) => sum + count, 0);
    
    return result;
  }

  async markAsRead(notificationId, userId) {
    return await NotificationHistory.findOneAndUpdate(
      { _id: notificationId, userId: new mongoose.Types.ObjectId(userId) },
      { read: true },
      { new: true }
    );
  }

  async toggleStar(notificationId, userId) {
    const notification = await NotificationHistory.findOne({ 
      _id: notificationId, 
      userId: new mongoose.Types.ObjectId(userId) 
    });
    if (!notification) return null;
    
    notification.starred = !notification.starred;
    return await notification.save();
  }
}

export default new NotificationHistoryService();
