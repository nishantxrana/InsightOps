import { logger } from "../utils/logger.js";
import { azureDevOpsClient } from "../devops/azureDevOpsClient.js";
import notificationHistoryService from "../services/notificationHistoryService.js";

class WorkItemPoller {
  constructor() {
    // Per-organization state - NO shared state across orgs
    this.lastPollTimeByOrg = new Map(); // organizationId -> Date
    this.processedWorkItemsByOrg = new Map(); // organizationId -> Set of work item IDs
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
   * Get or create processed work items set for an organization
   */
  getProcessedWorkItemsForOrg(organizationId) {
    if (!this.processedWorkItemsByOrg.has(organizationId)) {
      this.processedWorkItemsByOrg.set(organizationId, new Set());
    }
    return this.processedWorkItemsByOrg.get(organizationId);
  }

  // Organization-based polling (STRICT: organizationId required)
  async pollWorkItemsForOrg(organizationId, org) {
    if (!organizationId) {
      throw new Error("organizationId is required for pollWorkItemsForOrg");
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

      logger.info(`Starting work items polling for org ${organizationId}`);
      const sprintWorkItems = await client.getCurrentSprintWorkItems();

      if (sprintWorkItems.count > 0) {
        logger.info(`Found ${sprintWorkItems.count} work items for org ${organizationId}`);
      }

      this.setLastPollTimeForOrg(organizationId);
    } catch (error) {
      logger.error(`Error polling work items for org ${organizationId}:`, error);
    }
  }

  async checkOverdueItemsForOrg(organizationId, org) {
    if (!organizationId) {
      throw new Error("organizationId is required for checkOverdueItemsForOrg");
    }

    try {
      if (!org?.azureDevOps?.organization || !org?.azureDevOps?.pat) {
        logger.warn(`Org ${organizationId} missing Azure DevOps config - skipping overdue check`);
        return;
      }

      // Check org is active
      if (org.isActive === false) {
        logger.warn(`Org ${organizationId} is inactive - skipping overdue check`);
        return;
      }

      const client = azureDevOpsClient.createUserClient({
        organization: org.azureDevOps.organization,
        project: org.azureDevOps.project,
        pat: org.azureDevOps.pat,
        baseUrl: org.azureDevOps.baseUrl || "https://dev.azure.com",
      });

      logger.info(`Checking overdue items for org ${organizationId}`);
      const overdueItems = await client.getOverdueWorkItems();

      if (overdueItems.count > 0) {
        let filteredItems = overdueItems.value;
        const filterEnabled = org.polling?.overdueFilterEnabled === true;
        const maxDays = org.polling?.overdueMaxDays || 60;

        if (filterEnabled && maxDays > 0) {
          const cutoffDate = Date.now() - maxDays * 24 * 60 * 60 * 1000;
          filteredItems = overdueItems.value.filter((item) => {
            const dueDate = item.fields?.["Microsoft.VSTS.Scheduling.DueDate"];
            return dueDate && new Date(dueDate).getTime() >= cutoffDate;
          });
        }

        if (filteredItems.length > 0 && org.notifications?.enabled) {
          await this.sendOverdueNotificationForOrg(filteredItems, org, organizationId);
        }
      }
    } catch (error) {
      logger.error(`Error checking overdue items for org ${organizationId}:`, error);
    }
  }

  async sendOverdueNotificationForOrg(overdueItems, org, organizationId) {
    try {
      const batchSize = 10;
      const delayBetweenBatches = 5000;
      const totalBatches = Math.ceil(overdueItems.length / batchSize);
      const channels = [];

      for (let i = 0; i < overdueItems.length; i += batchSize) {
        const batch = overdueItems.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const card = this.formatOverdueItemsCard(
          batch,
          batchNumber,
          totalBatches,
          overdueItems.length
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

        if (i + batchSize < overdueItems.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      // Extract work item details for notification history (using 'items' to match frontend/CSV export)
      const items = overdueItems.map((item) => {
        const dueDate = item.fields?.["Microsoft.VSTS.Scheduling.DueDate"];
        const daysPastDue = dueDate
          ? Math.floor((Date.now() - new Date(dueDate)) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: item.id,
          title: item.fields?.["System.Title"] || "No title",
          type: item.fields?.["System.WorkItemType"] || "Item",
          state: item.fields?.["System.State"] || "Unknown",
          assignedTo: item.fields?.["System.AssignedTo"]?.displayName || "Unassigned",
          priority: item.fields?.["Microsoft.VSTS.Common.Priority"] || 4,
          dueDate: dueDate,
          daysPastDue,
          url: item.webUrl || item._links?.html?.href || null,
        };
      });

      // Save to notification history
      try {
        logger.info(
          `📝 [NOTIFICATION] Saving overdue notification to history for org ${organizationId}, userId: ${org.userId}`
        );
        await notificationHistoryService.saveNotification(org.userId, organizationId, {
          type: "overdue",
          title: `${overdueItems.length} Overdue Work Items`,
          message: `Found ${overdueItems.length} overdue work items`,
          source: "poller",
          metadata: {
            count: overdueItems.length,
            items, // Using 'items' to match frontend NotificationHistory.jsx and csvExport.js
          },
          channels,
        });
        logger.info(
          `✅ [NOTIFICATION] Saved overdue notification to history for org ${organizationId}`
        );
      } catch (historyError) {
        logger.error(
          `❌ [NOTIFICATION] Failed to save overdue notification to history for org ${organizationId}:`,
          historyError
        );
      }

      logger.info(`Overdue notifications sent for org ${organizationId}`);
    } catch (error) {
      logger.error(`Error sending overdue notification for org ${organizationId}:`, error);
    }
  }

  /**
   * @deprecated REMOVED - Use pollWorkItemsForOrg() with organizationId
   */
  async pollWorkItems(userId) {
    logger.error("DEPRECATED: pollWorkItems(userId) called - this method is no longer supported", {
      userId,
      action: "poll-work-items",
      status: "rejected",
    });
    throw new Error(
      "Legacy user-based polling is not supported. Use pollWorkItemsForOrg(organizationId, org) instead."
    );
  }

  /**
   * @deprecated REMOVED - Use checkOverdueItemsForOrg() with organizationId
   */
  async checkOverdueItems(userId) {
    logger.error(
      "DEPRECATED: checkOverdueItems(userId) called - this method is no longer supported",
      {
        userId,
        action: "check-overdue",
        status: "rejected",
      }
    );
    throw new Error(
      "Legacy user-based overdue check is not supported. Use checkOverdueItemsForOrg(organizationId, org) instead."
    );
  }

  /**
   * Clear all polling state for an organization (call when org is deleted/deactivated)
   */
  clearOrganizationState(organizationId) {
    if (!organizationId) return;

    this.processedWorkItemsByOrg.delete(organizationId);
    this.lastPollTimeByOrg.delete(organizationId);
    logger.info(`Cleared work item poller state for org ${organizationId}`);
  }
}

export const workItemPoller = new WorkItemPoller();

// Add notification formatting methods to the class (used by org-based methods)

WorkItemPoller.prototype.formatOverdueItemsCard = function (
  overdueItems,
  batchNumber,
  totalBatches,
  totalCount
) {
  const getPriorityColor = (priority) => {
    const priorityMap = {
      1: "#d32f2f", // Critical - Red
      2: "#ff9800", // High - Orange
      3: "#fbc02d", // Medium - Yellow
      4: "#757575", // Low - Gray
    };
    return priorityMap[priority] || "#757575";
  };

  const getPriorityText = (priority) => {
    const priorityMap = {
      1: "Critical",
      2: "High",
      3: "Medium",
      4: "Low",
    };
    return priorityMap[priority] || `Priority ${priority}`;
  };

  const workItemSections = overdueItems.map((item) => {
    const title = item.fields?.["System.Title"] || "No title";
    const assignee = item.fields?.["System.AssignedTo"]?.displayName || "Unassigned";
    const dueDate = item.fields?.["Microsoft.VSTS.Scheduling.DueDate"];
    const workItemType = item.fields?.["System.WorkItemType"] || "Item";
    const state = item.fields?.["System.State"] || "Unknown";
    const priority = item.fields?.["Microsoft.VSTS.Common.Priority"] || 4;
    const daysPastDue = dueDate
      ? Math.floor((Date.now() - new Date(dueDate)) / (1000 * 60 * 60 * 24))
      : 0;
    const itemUrl = item.webUrl || item._links?.html?.href || `#${item.id}`;

    const priorityColor = getPriorityColor(priority);
    const priorityText = getPriorityText(priority);
    const dueDateFormatted = dueDate
      ? new Date(dueDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "No due date";

    // Determine icon based on work item type
    const typeIcon = workItemType.toLowerCase().includes("bug")
      ? "🐛"
      : workItemType.toLowerCase().includes("task")
        ? "✅"
        : workItemType.toLowerCase().includes("user story")
          ? "📖"
          : "📋";

    return {
      header: `${typeIcon} ${workItemType} #${item.id} - ${title}`,
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        {
          decoratedText: {
            startIcon: { knownIcon: "CLOCK" },
            topLabel: "Days Overdue",
            text: `<b>${daysPastDue} days</b>`,
          },
        },
        {
          decoratedText: {
            startIcon: { knownIcon: "PERSON" },
            topLabel: "Assigned To",
            text: assignee,
          },
        },
        {
          decoratedText: {
            startIcon: { knownIcon: "STAR" },
            topLabel: "Priority",
            text: `<font color="${priorityColor}"><b>${priorityText}</b></font>`,
          },
        },
        {
          decoratedText: {
            startIcon: { knownIcon: "CALENDAR_TODAY" },
            topLabel: "Due Date",
            text: dueDateFormatted,
          },
        },
        {
          decoratedText: {
            startIcon: { knownIcon: "BOOKMARK" },
            topLabel: "State",
            text: state,
          },
        },
        {
          buttonList: {
            buttons: [
              {
                text: "Open Work Item",
                icon: { knownIcon: "OPEN_IN_NEW" },
                onClick: { openLink: { url: itemUrl } },
              },
            ],
          },
        },
      ],
    };
  });

  const allSections = [
    ...workItemSections,
    ...(batchNumber === totalBatches
      ? [
          {
            widgets: [
              {
                textParagraph: {
                  text: "⚠️ <b>Action Required:</b> Please review and update the status of these items to keep the project on track.",
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
        cardId: `overdue-items-batch-${batchNumber}`,
        card: {
          header: {
            title: `⚠️ Overdue Work Items - Batch ${batchNumber}/${totalBatches}`,
            subtitle: `${overdueItems.length} of ${totalCount} items past their due date`,
            imageUrl: "https://img.icons8.com/color/96/overtime.png",
            imageType: "CIRCLE",
          },
          sections: allSections,
        },
      },
    ],
  };
};

WorkItemPoller.prototype.sendGoogleChatCard = async function (card, webhookUrl) {
  try {
    const axios = (await import("axios")).default;
    await axios.post(webhookUrl, card);
  } catch (error) {
    logger.error("Error sending Google Chat card:", error);
    throw error;
  }
};
