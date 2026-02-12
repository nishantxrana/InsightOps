import express from "express";
import { EmailLog } from "../models/EmailLog.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

// Get email delivery statistics
router.get(
  "/stats",
  authenticate,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Last 24 hours stats
    const last24HoursLogs = await EmailLog.find({
      sentAt: { $gte: last24Hours },
    });

    const last24HoursStats = {
      total: last24HoursLogs.length,
      sent: last24HoursLogs.filter((log) => log.status === "sent").length,
      failed: last24HoursLogs.filter((log) => log.status === "failed").length,
      successRate: 0,
    };

    if (last24HoursStats.total > 0) {
      last24HoursStats.successRate = (
        (last24HoursStats.sent / last24HoursStats.total) *
        100
      ).toFixed(2);
    }

    // Last 7 days stats
    const last7DaysLogs = await EmailLog.find({
      sentAt: { $gte: last7Days },
    });

    const last7DaysStats = {
      total: last7DaysLogs.length,
      sent: last7DaysLogs.filter((log) => log.status === "sent").length,
      failed: last7DaysLogs.filter((log) => log.status === "failed").length,
      successRate: 0,
    };

    if (last7DaysStats.total > 0) {
      last7DaysStats.successRate = ((last7DaysStats.sent / last7DaysStats.total) * 100).toFixed(2);
    }

    // By type breakdown
    const byType = {
      signup_otp: {
        sent: last24HoursLogs.filter((log) => log.type === "signup_otp" && log.status === "sent")
          .length,
        failed: last24HoursLogs.filter(
          (log) => log.type === "signup_otp" && log.status === "failed"
        ).length,
      },
      password_reset_otp: {
        sent: last24HoursLogs.filter(
          (log) => log.type === "password_reset_otp" && log.status === "sent"
        ).length,
        failed: last24HoursLogs.filter(
          (log) => log.type === "password_reset_otp" && log.status === "failed"
        ).length,
      },
    };

    // Recent failures
    const recentFailures = await EmailLog.find({
      status: "failed",
      sentAt: { $gte: last24Hours },
    })
      .sort({ sentAt: -1 })
      .limit(10)
      .select("email type lastError sentAt attempts");

    res.json({
      last24Hours: last24HoursStats,
      last7Days: last7DaysStats,
      byType,
      recentFailures,
    });
  })
);

// Get recent email logs
router.get(
  "/logs",
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status; // 'sent', 'failed', or undefined for all

    const query = status ? { status } : {};

    const logs = await EmailLog.find(query)
      .sort({ sentAt: -1 })
      .limit(limit)
      .select("email type status messageId attempts lastError sentAt");

    res.json({ logs });
  })
);

export default router;
