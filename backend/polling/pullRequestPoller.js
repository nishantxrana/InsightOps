import { logger } from "../utils/logger.js";
import { azureDevOpsClient } from "../devops/azureDevOpsClient.js";
import notificationHistoryService from "../services/notificationHistoryService.js";

class PullRequestPoller {
  constructor() {
    // Per-organization state - NO shared state across orgs
    this.lastPollTimeByOrg = new Map(); // organizationId -> Date
    this.processedPRsByOrg = new Map(); // organizationId -> Set of PR IDs
  }

  /**
   * Get last poll time for a specific organization
   */
  getLastPollTimeForOrg(organizationId) {
    if (!this.lastPollTimeByOrg.has(organizationId)) {
      this.lastPollTimeByOrg.set(organizationId, new Date(0));
    }
    return this.lastPollTimeByOrg.get(organizationId);
  }

  /**
   * Update last poll time for a specific organization
   */
  setLastPollTimeForOrg(organizationId) {
    this.lastPollTimeByOrg.set(organizationId, new Date());
  }

  /**
   * Get or create processed PRs set for an organization
   */
  getProcessedPRsForOrg(organizationId) {
    if (!this.processedPRsByOrg.has(organizationId)) {
      this.processedPRsByOrg.set(organizationId, new Set());
    }
    return this.processedPRsByOrg.get(organizationId);
  }

  // Organization-based polling (STRICT: organizationId required)
  async pollPullRequestsForOrg(organizationId, org) {
    if (!organizationId) {
      throw new Error("organizationId is required for pollPullRequestsForOrg");
    }

    try {
      if (!org?.azureDevOps?.organization || !org?.azureDevOps?.pat) {
        logger.warn(`Org ${organizationId} missing Azure DevOps config - skipping poll`);
        return;
      }

      // Check org is active
      if (org.isActive === false) {
        logger.warn(`Org ${organizationId} is inactive - skipping poll`);
        return;
      }

      const client = azureDevOpsClient.createUserClient({
        organization: org.azureDevOps.organization,
        project: org.azureDevOps.project,
        pat: org.azureDevOps.pat,
        baseUrl: org.azureDevOps.baseUrl || "https://dev.azure.com",
      });

      logger.info(`Starting pull requests polling for org ${organizationId}`);
      await this.checkIdlePullRequestsForOrg(organizationId, org, client);
      this.setLastPollTimeForOrg(organizationId);
    } catch (error) {
      logger.error(`Error polling pull requests for org ${organizationId}:`, error);
    }
  }

  async checkIdlePullRequestsForOrg(organizationId, org, client) {
    try {
      const idlePRs = await client.getIdlePullRequests(48);

      if (idlePRs.count > 0) {
        let filteredPRs = idlePRs.value;
        const filterEnabled = org.polling?.idlePRFilterEnabled === true;
        const maxDays = org.polling?.idlePRMaxDays || 90;

        if (filterEnabled && maxDays > 0) {
          const cutoffDate = Date.now() - maxDays * 24 * 60 * 60 * 1000;
          filteredPRs = idlePRs.value.filter((pr) => {
            const createdDate = new Date(pr.creationDate).getTime();
            return createdDate >= cutoffDate;
          });

          logger.info(
            `Filtered idle PRs for org ${organizationId}: ${idlePRs.value.length} -> ${filteredPRs.length} (ignoring PRs older than ${maxDays} days)`
          );
        }

        if (filteredPRs.length > 0) {
          logger.warn(`Found ${filteredPRs.length} idle pull requests for org ${organizationId}`);

          if (org.notifications?.enabled) {
            await this.sendIdlePRNotificationForOrg(filteredPRs, org, organizationId);
          }
        } else {
          logger.info(`No idle pull requests found for org ${organizationId} after filtering`);
        }
      } else {
        logger.info(`No idle pull requests found for org ${organizationId}`);
      }
    } catch (error) {
      logger.error(`Error checking idle PRs for org ${organizationId}:`, error);
    }
  }

  async sendIdlePRNotificationForOrg(idlePRs, org, organizationId) {
    try {
      const batchSize = 10;
      const delayBetweenBatches = 5000;
      const totalBatches = Math.ceil(idlePRs.length / batchSize);
      const channels = [];

      for (let i = 0; i < idlePRs.length; i += batchSize) {
        const batch = idlePRs.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const card = this.formatIdlePRCard(
          batch,
          batchNumber,
          totalBatches,
          idlePRs.length,
          org.azureDevOps
        );

        if (org.notifications?.googleChatEnabled && org.notifications?.webhooks?.googleChat) {
          try {
            await this.sendGoogleChatCard(card, org.notifications.webhooks.googleChat);
            if (i === 0)
              channels.push({ platform: "google-chat", status: "sent", sentAt: new Date() });
          } catch (error) {
            if (i === 0)
              channels.push({ platform: "google-chat", status: "failed", error: error.message });
          }
        }

        if (i + batchSize < idlePRs.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      // Extract PR details for notification history (matching original format)
      const baseUrl = org.azureDevOps?.baseUrl || "https://dev.azure.com";
      const organization = org.azureDevOps?.organization;
      const project = org.azureDevOps?.project;

      const pullRequests = idlePRs.map((pr) => {
        const lastActivity = pr.lastMergeCommit?.committer?.date || pr.creationDate;
        const idleDays = Math.floor((Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
        const repository = pr.repository?.name;

        return {
          id: pr.pullRequestId,
          title: pr.title || "No title",
          repository: repository || "Unknown",
          sourceBranch: pr.sourceRefName?.replace("refs/heads/", "") || "unknown",
          targetBranch: pr.targetRefName?.replace("refs/heads/", "") || "unknown",
          createdBy: pr.createdBy?.displayName || "Unknown",
          createdDate: pr.creationDate,
          idleDays,
          url:
            pr._links?.web?.href ||
            (organization && project && repository
              ? `${baseUrl}/${organization}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repository)}/pullrequest/${pr.pullRequestId}`
              : null),
        };
      });

      // Save to notification history with organizationId
      try {
        logger.info(
          `📝 [NOTIFICATION] Saving idle PR notification to history for org ${organizationId}, userId: ${org.userId}`
        );
        await notificationHistoryService.saveNotification(org.userId, organizationId, {
          type: "idle-pr",
          title: `${idlePRs.length} Idle Pull Requests`,
          message: `Found ${idlePRs.length} pull requests idle for >48 hours`,
          source: "poller",
          metadata: {
            count: idlePRs.length,
            pullRequests,
          },
          channels,
        });
        logger.info(
          `✅ [NOTIFICATION] Saved idle PR notification to history for org ${organizationId}`
        );
      } catch (historyError) {
        logger.error(
          `❌ [NOTIFICATION] Failed to save idle PR notification to history for org ${organizationId}:`,
          historyError
        );
      }

      logger.info(`Idle PR notifications sent for org ${organizationId}`);
    } catch (error) {
      logger.error(`Error sending idle PR notification for org ${organizationId}:`, error);
    }
  }

  /**
   * @deprecated REMOVED - Use pollPullRequestsForOrg() with organizationId
   */
  async pollPullRequests(userId) {
    logger.error(
      "DEPRECATED: pollPullRequests(userId) called - this method is no longer supported",
      {
        userId,
        action: "poll-pull-requests",
        status: "rejected",
      }
    );
    throw new Error(
      "Legacy user-based polling is not supported. Use pollPullRequestsForOrg(organizationId, org) instead."
    );
  }

  /**
   * @deprecated REMOVED - Use checkIdlePullRequestsForOrg() with organizationId
   */
  async checkIdlePullRequests(userId, client) {
    logger.error(
      "DEPRECATED: checkIdlePullRequests(userId) called - this method is no longer supported",
      {
        userId,
        action: "check-idle-prs",
        status: "rejected",
      }
    );
    throw new Error(
      "Legacy user-based idle PR check is not supported. Use checkIdlePullRequestsForOrg(organizationId, org, client) instead."
    );
  }

  cleanupProcessedPRs(organizationId) {
    if (!organizationId) {
      logger.warn("cleanupProcessedPRs called without organizationId");
      return;
    }

    const processedPRs = this.getProcessedPRsForOrg(organizationId);
    if (processedPRs.size > 500) {
      const prsArray = Array.from(processedPRs);
      const toKeep = prsArray.slice(-250);
      this.processedPRsByOrg.set(organizationId, new Set(toKeep));
      logger.debug(`Cleaned up processed PRs cache for org ${organizationId}`);
    }
  }

  /**
   * Clear all polling state for an organization (call when org is deleted/deactivated)
   */
  clearOrganizationState(organizationId) {
    if (!organizationId) return;

    this.processedPRsByOrg.delete(organizationId);
    this.lastPollTimeByOrg.delete(organizationId);
    logger.info(`Cleared PR poller state for org ${organizationId}`);
  }
}

// Add notification formatting methods to the class (used by org-based methods)
PullRequestPoller.prototype.formatIdlePRCard = function (
  pullRequests,
  batchNumber,
  totalBatches,
  totalCount,
  userConfig
) {
  const prSections = pullRequests.map((pr) => {
    const title = pr.title || "No title";
    const createdBy = pr.createdBy?.displayName || "Unknown";
    const lastActivity = pr.lastMergeCommit?.committer?.date || pr.creationDate;
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
    );
    const repository = pr.repository?.name || "Unknown";
    const sourceBranch = pr.sourceRefName?.replace("refs/heads/", "") || "unknown";
    const targetBranch = pr.targetRefName?.replace("refs/heads/", "") || "unknown";
    const description =
      (pr.description || "No description").slice(0, 150) +
      ((pr.description?.length ?? 0) > 150 ? "..." : "");

    // Use web URL from _links, or construct proper web UI URL
    const baseUrl = userConfig?.baseUrl || "https://dev.azure.com";
    const org = userConfig?.organization;
    const project = userConfig?.project;
    const prUrl =
      pr._links?.web?.href ||
      (org && project && repository
        ? `${baseUrl}/${org}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repository)}/pullrequest/${pr.pullRequestId}`
        : null);

    return {
      header: `🔀 PR #${pr.pullRequestId} - ${title}`,
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        {
          decoratedText: {
            startIcon: { knownIcon: "CLOCK" },
            topLabel: "Idle Duration",
            text: `<b>${daysSinceActivity} days</b>`,
          },
        },
        {
          decoratedText: {
            startIcon: { knownIcon: "PERSON" },
            topLabel: "Created By",
            text: createdBy,
          },
        },
        {
          decoratedText: {
            startIcon: { knownIcon: "DESCRIPTION" },
            topLabel: "Repository",
            text: repository,
          },
        },
        {
          decoratedText: {
            startIcon: { knownIcon: "BOOKMARK" },
            topLabel: "Branches",
            text: `${sourceBranch} → ${targetBranch}`,
          },
        },
        {
          textParagraph: {
            text: `<b>Description:</b> ${description}`,
          },
        },
        {
          buttonList: {
            buttons: [
              {
                text: "Review Pull Request",
                icon: { knownIcon: "OPEN_IN_NEW" },
                onClick: { openLink: { url: prUrl } },
              },
            ],
          },
        },
      ],
    };
  });

  const allSections = [
    ...prSections,
    ...(batchNumber === totalBatches
      ? [
          {
            widgets: [
              {
                textParagraph: {
                  text: "⚠️ <b>Action Required:</b> Please review these pull requests to keep the development process moving.",
                },
              },
            ],
          },
        ]
      : []),
  ];

  return {
    cardsV2: [
      {
        cardId: `idle-prs-batch-${batchNumber}`,
        card: {
          header: {
            title: `⏰ Idle Pull Requests - Batch ${batchNumber}/${totalBatches}`,
            subtitle: `${pullRequests.length} of ${totalCount} PRs inactive for more than 48 hours`,
            imageUrl: "https://img.icons8.com/color/96/pull-request.png",
            imageType: "CIRCLE",
          },
          sections: allSections,
        },
      },
    ],
  };
};

PullRequestPoller.prototype.sendGoogleChatCard = async function (card, webhookUrl) {
  try {
    const axios = (await import("axios")).default;
    await axios.post(webhookUrl, card);
  } catch (error) {
    logger.error("Error sending Google Chat card:", error);
    throw error;
  }
};

export const pullRequestPoller = new PullRequestPoller();
