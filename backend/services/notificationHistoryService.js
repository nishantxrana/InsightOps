import NotificationHistory from "../models/NotificationHistory.js";
import mongoose from "mongoose";
import { createComponentLogger } from "../utils/logger.js";

const log = createComponentLogger("notification-history");

class NotificationHistoryService {
  async saveNotification(userId, organizationId, notificationData) {
    try {
      const notification = new NotificationHistory({
        userId: new mongoose.Types.ObjectId(userId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        ...notificationData,
        createdAt: new Date(),
      });

      return await notification.save();
    } catch (error) {
      log.error("Failed to save notification", {
        userId: userId?.toString(),
        organizationId: organizationId?.toString(),
        type: notificationData?.type,
        error: error.message,
        status: "failure",
      });
      throw error;
    }
  }

  async getNotifications(userId, organizationId, filters = {}) {
    const { type, read, starred, limit = 50, skip = 0 } = filters;

    const query = {
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      archived: false,
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
      archived: false,
    });
  }

  async getCountsByType(userId, organizationId) {
    const counts = await NotificationHistory.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          organizationId: new mongoose.Types.ObjectId(organizationId),
          archived: false,
        },
      },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const result = counts.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});

    // Add total count
    result.total = Object.values(result).reduce((sum, count) => sum + count, 0);

    return result;
  }

  /**
   * Mark a notification as read
   *
   * @param {string} notificationId - The notification ID
   * @param {string} userId - The user ID (REQUIRED)
   * @param {string} organizationId - The organization ID (REQUIRED for multi-tenant isolation)
   * @throws {Error} If organizationId is not provided
   */
  async markAsRead(notificationId, userId, organizationId) {
    // ENFORCE: organizationId is REQUIRED for multi-tenant isolation
    if (!organizationId) {
      const error = new Error(
        "organizationId is required for markAsRead - multi-tenant isolation violation"
      );
      error.code = "MISSING_ORGANIZATION_ID";
      log.error("markAsRead called without organizationId", {
        notificationId,
        userId: userId?.toString(),
        action: "mark-read",
        status: "rejected",
      });
      throw error;
    }

    if (!userId) {
      const error = new Error("userId is required for markAsRead");
      error.code = "MISSING_USER_ID";
      throw error;
    }

    const query = {
      _id: notificationId,
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    const result = await NotificationHistory.findOneAndUpdate(query, { read: true }, { new: true });

    if (result) {
      log.debug("Notification marked as read", {
        notificationId,
        userId: userId.toString(),
        organizationId: organizationId.toString(),
      });
    }

    return result;
  }

  /**
   * Toggle star status on a notification
   *
   * @param {string} notificationId - The notification ID
   * @param {string} userId - The user ID (REQUIRED)
   * @param {string} organizationId - The organization ID (REQUIRED for multi-tenant isolation)
   * @throws {Error} If organizationId is not provided
   */
  async toggleStar(notificationId, userId, organizationId) {
    // ENFORCE: organizationId is REQUIRED for multi-tenant isolation
    if (!organizationId) {
      const error = new Error(
        "organizationId is required for toggleStar - multi-tenant isolation violation"
      );
      error.code = "MISSING_ORGANIZATION_ID";
      log.error("toggleStar called without organizationId", {
        notificationId,
        userId: userId?.toString(),
        action: "toggle-star",
        status: "rejected",
      });
      throw error;
    }

    if (!userId) {
      const error = new Error("userId is required for toggleStar");
      error.code = "MISSING_USER_ID";
      throw error;
    }

    const query = {
      _id: notificationId,
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    const notification = await NotificationHistory.findOne(query);
    if (!notification) return null;

    notification.starred = !notification.starred;
    const result = await notification.save();

    log.debug("Notification star toggled", {
      notificationId,
      userId: userId.toString(),
      organizationId: organizationId.toString(),
      starred: result.starred,
    });

    return result;
  }
}

export default new NotificationHistoryService();
