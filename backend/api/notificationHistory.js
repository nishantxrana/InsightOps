import express from "express";
import notificationHistoryService from "../services/notificationHistoryService.js";
import { createRequestLogger } from "../utils/logger.js";

const router = express.Router();

// Get notifications with filters (STRICT: org context required)
router.get("/", async (req, res) => {
  const log = createRequestLogger(req, "notifications-api");
  try {
    const { type, read, starred, limit, skip } = req.query;
    const userId = req.user._id;
    const organizationId = req.organizationId;

    // STRICT: Organization context is required
    if (!organizationId) {
      log.warn("GET /notifications called without organization context", {
        userId: userId?.toString(),
        action: "get-notifications",
      });
      return res.status(400).json({
        error: "Organization context required",
        message: "Please select an organization to view notifications",
        code: "MISSING_ORGANIZATION_ID",
      });
    }

    const notifications = await notificationHistoryService.getNotifications(
      userId,
      organizationId,
      {
        type,
        read: read !== undefined ? read === "true" : undefined,
        starred: starred !== undefined ? starred === "true" : undefined,
        limit: limit ? parseInt(limit) : 50,
        skip: skip ? parseInt(skip) : 0,
      }
    );

    res.json(notifications);
  } catch (error) {
    log.error("Failed to fetch notifications", {
      error: error.message,
      action: "get-notifications",
    });
    res.status(500).json({ error: "Failed to fetch notifications", details: error.message });
  }
});

// Get unread count (STRICT: org context required)
router.get("/unread-count", async (req, res) => {
  const log = createRequestLogger(req, "notifications-api");
  try {
    const userId = req.user._id;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: "Organization context required",
        code: "MISSING_ORGANIZATION_ID",
      });
    }

    const count = await notificationHistoryService.getUnreadCount(userId, organizationId);
    res.json({ count });
  } catch (error) {
    log.error("Failed to fetch unread count", { error: error.message, action: "get-unread-count" });
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Get counts by type (STRICT: org context required)
router.get("/counts", async (req, res) => {
  const log = createRequestLogger(req, "notifications-api");
  try {
    const userId = req.user._id;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: "Organization context required",
        code: "MISSING_ORGANIZATION_ID",
      });
    }

    const counts = await notificationHistoryService.getCountsByType(userId, organizationId);
    res.json(counts);
  } catch (error) {
    log.error("Failed to fetch notification counts", {
      error: error.message,
      action: "get-counts",
    });
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// Mark as read
router.patch("/:id/read", async (req, res) => {
  const log = createRequestLogger(req, "notifications-api");
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const organizationId = req.organizationId;

    // ENFORCE: organizationId is required for mutation operations
    if (!organizationId) {
      log.warn("Attempted markAsRead without organization context", {
        notificationId: id,
        userId: userId?.toString(),
        action: "mark-read",
      });
      return res.status(400).json({
        error: "Organization context required",
        message: "Please select an organization to manage notifications",
        code: "MISSING_ORGANIZATION_ID",
      });
    }

    const notification = await notificationHistoryService.markAsRead(id, userId, organizationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    // Handle specific error codes
    if (error.code === "MISSING_ORGANIZATION_ID") {
      return res.status(400).json({
        error: "Organization context required",
        code: error.code,
      });
    }

    log.error("Failed to mark notification as read", {
      error: error.message,
      action: "mark-read",
      notificationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// Toggle star
router.patch("/:id/star", async (req, res) => {
  const log = createRequestLogger(req, "notifications-api");
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const organizationId = req.organizationId;

    // ENFORCE: organizationId is required for mutation operations
    if (!organizationId) {
      log.warn("Attempted toggleStar without organization context", {
        notificationId: id,
        userId: userId?.toString(),
        action: "toggle-star",
      });
      return res.status(400).json({
        error: "Organization context required",
        message: "Please select an organization to manage notifications",
        code: "MISSING_ORGANIZATION_ID",
      });
    }

    const notification = await notificationHistoryService.toggleStar(id, userId, organizationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    // Handle specific error codes
    if (error.code === "MISSING_ORGANIZATION_ID") {
      return res.status(400).json({
        error: "Organization context required",
        code: error.code,
      });
    }

    log.error("Failed to toggle notification star", {
      error: error.message,
      action: "toggle-star",
      notificationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to toggle star" });
  }
});

export default router;
