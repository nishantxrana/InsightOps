import { PollingJob } from "../models/PollingJob.js";
import { logger } from "../utils/logger.js";

class PollingService {
  /**
   * Create or update a polling job for an organization
   */
  async createOrUpdateJob(userId, organizationId, jobType, config) {
    try {
      const job = await PollingJob.findOneAndUpdate(
        { organizationId, jobType },
        {
          userId,
          organizationId,
          jobType,
          config: {
            enabled: config.enabled || false,
            interval: config.interval,
            lastResult: "pending",
          },
          status: "active",
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return job;
    } catch (error) {
      logger.error(`Failed to create/update ${jobType} job for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active jobs for an organization
   */
  async getActiveJobs(organizationId) {
    try {
      return await PollingJob.find({
        organizationId,
        status: "active",
        "config.enabled": true,
      });
    } catch (error) {
      logger.error(`Failed to get active jobs for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Get all jobs for an organization
   */
  async getJobsByOrganization(organizationId) {
    try {
      return await PollingJob.find({ organizationId });
    } catch (error) {
      logger.error(`Failed to get jobs for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Pause all jobs for an organization
   */
  async pauseOrganizationJobs(organizationId) {
    try {
      const result = await PollingJob.updateMany(
        { organizationId },
        { status: "paused", updatedAt: new Date() }
      );
      return result;
    } catch (error) {
      logger.error(`Failed to pause jobs for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Pause all jobs for a user (legacy)
   */
  async pauseUserJobs(userId) {
    try {
      const result = await PollingJob.updateMany(
        { userId },
        { status: "paused", updatedAt: new Date() }
      );
      return result;
    } catch (error) {
      logger.error(`Failed to pause jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update last run time for a job
   */
  async updateLastRun(organizationId, jobType) {
    try {
      await PollingJob.findOneAndUpdate(
        { organizationId, jobType },
        { "config.lastRun": new Date(), updatedAt: new Date() }
      );
    } catch (error) {
      logger.error(`Failed to update last run for org ${organizationId}/${jobType}:`, error);
    }
  }

  /**
   * Update job result
   */
  async updateJobResult(organizationId, jobType, result, errorMessage = null) {
    try {
      const update = {
        "config.lastResult": result,
        updatedAt: new Date(),
      };

      if (errorMessage) {
        update["config.lastError"] = errorMessage;
        update.status = "error";
      } else if (result === "success") {
        update["config.lastError"] = null;
        update.status = "active";
      }

      await PollingJob.findOneAndUpdate({ organizationId, jobType }, update);
    } catch (error) {
      logger.error(`Failed to update job result for org ${organizationId}/${jobType}:`, error);
    }
  }

  /**
   * Update job config
   */
  async updateJobConfig(organizationId, jobType, pollingConfig) {
    try {
      const configMap = {
        workItems: {
          enabled: pollingConfig.workItemsEnabled,
          interval: pollingConfig.workItemsInterval,
        },
        pullRequests: {
          enabled: pollingConfig.pullRequestEnabled,
          interval: pollingConfig.pullRequestInterval,
        },
        overdue: {
          enabled: pollingConfig.overdueCheckEnabled,
          interval: pollingConfig.overdueCheckInterval,
        },
      };

      const config = configMap[jobType];
      if (!config) return;

      await PollingJob.findOneAndUpdate(
        { organizationId, jobType },
        {
          "config.enabled": config.enabled || false,
          "config.interval": config.interval,
          status: "active",
          updatedAt: new Date(),
        }
      );
    } catch (error) {
      logger.error(`Failed to update ${jobType} config for org ${organizationId}:`, error);
    }
  }

  /**
   * Get all active organizations with polling jobs
   */
  async getActiveOrganizations() {
    try {
      const result = await PollingJob.distinct("organizationId", {
        status: "active",
        "config.enabled": true,
      });
      return result.map((id) => id.toString());
    } catch (error) {
      logger.error("Failed to get active organizations:", error);
      return [];
    }
  }

  /**
   * Get all users with active polling jobs (legacy)
   */
  async getActiveUsers() {
    try {
      const result = await PollingJob.distinct("userId", {
        status: "active",
        "config.enabled": true,
      });
      return result.map((id) => id.toString());
    } catch (error) {
      logger.error("Failed to get active users:", error);
      return [];
    }
  }
}

export const pollingService = new PollingService();
