import express from "express";
import { logger } from "../utils/logger.js";
import { azureDevOpsClient } from "../devops/azureDevOpsClient.js";
import {
  getOrganizationSettings,
  hasAzureDevOpsConfig,
  getAzureDevOpsConfig,
} from "../utils/organizationSettings.js";
import { filterActiveWorkItems, filterCompletedWorkItems } from "../utils/workItemStates.js";
import { AzureDevOpsReleaseClient } from "../devops/releaseClient.js";
import { azureDevOpsCache } from "../cache/AzureDevOpsCache.js";
import { CACHE_TTL } from "../config/cache.js";
import { generateActivityReport } from "../services/activityReportService.js";
import pdfService from "../services/pdfService.js";

const router = express.Router();

/**
 * Aggregated Dashboard Summary Endpoint
 *
 * This endpoint fetches ALL dashboard data in a single request:
 * - Work Items (sprint summary + overdue count)
 * - Builds (recent)
 * - Pull Requests (all + idle)
 * - Release Stats
 *
 * Benefits:
 * - Single HTTP request instead of 5-6 separate calls
 * - Parallelizes Azure DevOps API calls internally
 * - Shares data (PRs used for both total and idle counts)
 * - Uses caching to reduce Azure DevOps API calls
 * - Reduces dashboard load time by 50-70%
 *
 * Multi-tenant: All data is scoped to req.organizationId
 */
router.get("/summary", async (req, res) => {
  const startTime = Date.now();

  try {
    const org = await getOrganizationSettings(req);

    if (!hasAzureDevOpsConfig(org)) {
      return res.status(400).json({
        success: false,
        error: "Azure DevOps configuration required",
        data: getEmptyDashboardData(),
      });
    }

    const orgId = org._id?.toString();
    const azureConfig = getAzureDevOpsConfig(org);
    const client = azureDevOpsClient.createUserClient(azureConfig);

    // Parallel fetch all data with caching
    const [workItemsResult, buildsResult, pullRequestsResult, releaseStatsResult] =
      await Promise.allSettled([
        fetchWorkItemsSummary(client, orgId, org),
        fetchBuilds(client, orgId, org),
        fetchPullRequests(client, orgId, org),
        fetchReleaseStats(azureConfig, orgId, org),
      ]);

    // Process results (handle failures gracefully)
    const workItems =
      workItemsResult.status === "fulfilled"
        ? workItemsResult.value
        : { total: 0, active: 0, completed: 0, overdue: 0, error: workItemsResult.reason?.message };

    const builds =
      buildsResult.status === "fulfilled"
        ? buildsResult.value
        : { total: 0, succeeded: 0, failed: 0, error: buildsResult.reason?.message };

    const pullRequests =
      pullRequestsResult.status === "fulfilled"
        ? pullRequestsResult.value
        : { total: 0, active: 0, idle: 0, error: pullRequestsResult.reason?.message };

    const releases =
      releaseStatsResult.status === "fulfilled"
        ? releaseStatsResult.value
        : { total: 0, successRate: 0, error: releaseStatsResult.reason?.message };

    const duration = Date.now() - startTime;
    logger.info(`[Dashboard] Summary fetched in ${duration}ms for org ${org.name}`);

    res.json({
      success: true,
      data: {
        workItems,
        builds,
        pullRequests,
        releases,
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        durationMs: duration,
        organizationId: orgId,
      },
    });
  } catch (error) {
    logger.error("Error fetching dashboard summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard summary",
      data: getEmptyDashboardData(),
    });
  }
});

/**
 * Fetch work items summary with caching
 */
async function fetchWorkItemsSummary(client, orgId, org) {
  const projectName = org.azureDevOps?.project;

  // Check cache
  let allWorkItems = azureDevOpsCache.getSprintWorkItems(orgId, projectName);

  if (!allWorkItems) {
    allWorkItems = await client.getAllCurrentSprintWorkItems();
    azureDevOpsCache.setSprintWorkItems(orgId, allWorkItems, CACHE_TTL, projectName);
  }

  const items = allWorkItems.value || [];
  const activeItems = filterActiveWorkItems(items);
  const completedItems = filterCompletedWorkItems(items);

  // Get overdue count (separate query but cached)
  let overdueCount = 0;
  try {
    const overdueCacheKey = "workItems:overdue";
    let overdueItems = azureDevOpsCache.get(orgId, overdueCacheKey, projectName);

    if (!overdueItems) {
      overdueItems = await client.getOverdueWorkItems();
      azureDevOpsCache.set(orgId, overdueCacheKey, overdueItems, CACHE_TTL, projectName);
    }

    overdueCount = overdueItems.count || 0;
  } catch (error) {
    logger.warn("Failed to fetch overdue items:", error.message);
  }

  return {
    total: allWorkItems.count || items.length,
    active: activeItems.length,
    completed: completedItems.length,
    overdue: overdueCount,
  };
}

/**
 * Fetch builds with caching
 */
async function fetchBuilds(client, orgId, org) {
  const projectName = org.azureDevOps?.project;
  const limit = 20;
  const cacheKey = `builds:recent:${limit}`;

  let builds = azureDevOpsCache.get(orgId, cacheKey, projectName);

  if (!builds) {
    builds = await client.getRecentBuilds(limit);
    azureDevOpsCache.set(orgId, cacheKey, builds, CACHE_TTL, projectName);
  }

  const buildList = builds.value || [];

  return {
    total: builds.count || buildList.length,
    succeeded: buildList.filter((b) => b.result === "succeeded").length,
    failed: buildList.filter((b) => b.result === "failed").length,
  };
}

/**
 * Fetch pull requests with caching - shared data for both total and idle
 */
async function fetchPullRequests(client, orgId, org) {
  const projectName = org.azureDevOps?.project;

  // Get PRs (shared between total and idle)
  let allPRs = azureDevOpsCache.getPullRequests(orgId, projectName);

  if (!allPRs) {
    allPRs = await client.getPullRequests("active");
    azureDevOpsCache.setPullRequests(orgId, allPRs, CACHE_TTL, projectName);
  }

  const prList = allPRs.value || [];

  // Calculate idle PRs from cached data
  const hoursThreshold = 48;
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

  const idlePRs = prList.filter((pr) => {
    const activityDates = [
      pr.creationDate,
      pr.lastMergeCommit?.committer?.date,
      pr.lastMergeSourceCommit?.committer?.date,
      pr.closedDate,
    ].filter((date) => date != null);

    const lastActivityDate = new Date(
      Math.max(...activityDates.map((date) => new Date(date).getTime()))
    );
    return lastActivityDate < thresholdDate;
  });

  return {
    total: allPRs.count || prList.length,
    active: prList.filter((pr) => pr.status === "active").length,
    idle: idlePRs.length,
  };
}

/**
 * Fetch release stats with caching
 */
async function fetchReleaseStats(azureConfig, orgId, org) {
  const projectName = org.azureDevOps?.project;
  const dateRange = "90d_now";

  // Check cache
  const cached = azureDevOpsCache.getReleaseStats(orgId, dateRange, projectName);
  if (cached?.success) {
    return {
      total: cached.data.totalReleases || 0,
      successRate: cached.data.successRate || 0,
    };
  }

  try {
    const releaseClient = new AzureDevOpsReleaseClient(
      azureConfig.organization,
      azureConfig.project,
      azureConfig.pat,
      azureConfig.baseUrl
    );

    // Fetch releases (with limit to avoid excessive API calls)
    const minCreatedTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Use a reasonable limit for dashboard (not full pagination)
    const response = await releaseClient.getReleases({
      top: 100,
      minCreatedTime,
    });

    const releases = response.value || [];
    const totalReleases = releases.length;

    // Calculate success rate using mapped statuses
    const succeededReleases = releases.filter((release) => {
      if (release.environments && release.environments.length > 0) {
        const envStatuses = release.environments.map((env) => env.status?.toLowerCase());
        return envStatuses.every(
          (status) => status === "succeeded" || status === "partiallysucceeded"
        );
      }
      return release.status?.toLowerCase() === "succeeded";
    }).length;

    const successRate =
      totalReleases > 0 ? Math.round((succeededReleases / totalReleases) * 100 * 10) / 10 : 0;

    const stats = {
      total: totalReleases,
      successRate,
    };

    // Cache the result
    azureDevOpsCache.setReleaseStats(
      orgId,
      dateRange,
      {
        success: true,
        data: {
          totalReleases,
          successRate,
        },
      },
      CACHE_TTL,
      projectName
    );

    return stats;
  } catch (error) {
    if (error.response?.status === 404) {
      return { total: 0, successRate: 0 };
    }
    throw error;
  }
}

/**
 * Get empty dashboard data structure
 */
function getEmptyDashboardData() {
  return {
    workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
    builds: { total: 0, succeeded: 0, failed: 0 },
    pullRequests: { total: 0, active: 0, idle: 0 },
    releases: { total: 0, successRate: 0 },
  };
}

/**
 * Activity Report Endpoint
 *
 * Generates comprehensive DevOps activity report for a date range.
 * This is a MANUAL, ON-DEMAND endpoint - not called on dashboard load.
 */
router.post("/activity-report", async (req, res) => {
  const startTime = Date.now();

  try {
    const { startDate, endDate } = req.body;

    // Validate inputs
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: "startDate must be before endDate",
      });
    }

    if (end > new Date()) {
      return res.status(400).json({
        success: false,
        error: "endDate cannot be in the future",
      });
    }

    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return res.status(400).json({
        success: false,
        error: "Date range cannot exceed 90 days",
      });
    }

    // Get organization settings
    const org = await getOrganizationSettings(req);

    if (!hasAzureDevOpsConfig(org)) {
      return res.status(400).json({
        success: false,
        error: "Azure DevOps configuration required",
      });
    }

    const orgId = org._id?.toString();
    const azureConfig = getAzureDevOpsConfig(org);

    // Check if production-only report requested
    const productionOnly = req.query.productionOnly === "true";
    const productionFilters = productionOnly ? org.productionFilters : null;

    // NO CACHING - Always generate fresh report for accurate real-time data
    logger.info(`[ActivityReport] Generating fresh report for org ${org.name}`, {
      productionOnly,
      filtersEnabled: productionFilters?.enabled || false,
    });

    // Generate report
    const client = azureDevOpsClient.createUserClient(azureConfig);
    const releaseClient = new AzureDevOpsReleaseClient(
      azureConfig.organization,
      azureConfig.project,
      azureConfig.pat,
      azureConfig.baseUrl
    );

    const report = await generateActivityReport(
      client,
      releaseClient,
      orgId,
      startDate,
      endDate,
      productionOnly,
      productionFilters
    );

    const duration = Date.now() - startTime;
    logger.info(`[ActivityReport] Report generated in ${duration}ms for org ${org.name}`);

    res.json({
      success: true,
      data: report,
      cached: false,
    });
  } catch (error) {
    logger.error("[ActivityReport] Error generating report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate activity report",
      message: error.message,
    });
  }
});

// SSE endpoint for streaming activity report
router.get("/activity-report/stream", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate inputs
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: "startDate must be before endDate",
      });
    }

    if (end > new Date()) {
      return res.status(400).json({
        success: false,
        error: "endDate cannot be in the future",
      });
    }

    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return res.status(400).json({
        success: false,
        error: "Date range cannot exceed 90 days",
      });
    }

    const org = await getOrganizationSettings(req);

    if (!hasAzureDevOpsConfig(org)) {
      return res.status(400).json({
        success: false,
        error: "Azure DevOps configuration required",
      });
    }

    const orgId = org._id?.toString();
    const azureConfig = getAzureDevOpsConfig(org);

    // Check if production-only report requested
    const productionOnly = req.query.productionOnly === "true";
    const productionFilters = productionOnly ? org.productionFilters : null;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);

      // Force flush to send immediately (critical for streaming!)
      if (res.flush) {
        res.flush();
      }
    };

    logger.info(`[ActivityReport] Streaming report for org ${org.name}`, {
      productionOnly,
      filtersEnabled: productionFilters?.enabled || false,
    });

    const client = azureDevOpsClient.createUserClient(azureConfig);
    const releaseClient = new AzureDevOpsReleaseClient(
      azureConfig.organization,
      azureConfig.project,
      azureConfig.pat,
      azureConfig.baseUrl
    );

    // Import fetch functions
    const {
      fetchPRMetrics,
      fetchPRDiscussionMetrics,
      fetchBuildMetrics,
      fetchReleaseMetrics,
      fetchWorkItemMetrics,
    } = await import("../services/activityReportService.js");

    // Fetch each section and stream as it completes
    const sections = [
      {
        name: "pullRequests",
        fn: () => fetchPRMetrics(client, startDate, endDate, productionOnly, productionFilters),
      },
      {
        name: "prDiscussion",
        fn: () =>
          fetchPRDiscussionMetrics(client, startDate, endDate, productionOnly, productionFilters),
      },
      {
        name: "builds",
        fn: () => fetchBuildMetrics(client, startDate, endDate, productionOnly, productionFilters),
      },
      {
        name: "releases",
        fn: () =>
          fetchReleaseMetrics(releaseClient, startDate, endDate, productionOnly, productionFilters),
      },
      { name: "workItems", fn: () => fetchWorkItemMetrics(client, startDate, endDate) },
    ];

    const startTime = Date.now();

    for (const section of sections) {
      try {
        const sectionStart = Date.now();
        const data = await section.fn();
        const sectionDuration = Date.now() - sectionStart;

        sendEvent("section", {
          name: section.name,
          data,
          duration: sectionDuration,
        });

        logger.info(`[ActivityReport] Streamed ${section.name} in ${sectionDuration}ms`);
      } catch (error) {
        sendEvent("section", {
          name: section.name,
          error: error.message,
        });
        logger.error(`[ActivityReport] Error streaming ${section.name}:`, error);
      }
    }

    // Send completion event
    const totalDuration = Date.now() - startTime;
    sendEvent("complete", {
      duration: totalDuration,
      generatedAt: new Date().toISOString(),
    });

    logger.info(`[ActivityReport] Stream completed in ${totalDuration}ms`);

    res.end();
  } catch (error) {
    logger.error("[ActivityReport] Error in stream:", error);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Generate PDF Report
 * POST /api/dashboard/activity-report/pdf
 */
router.post("/activity-report/pdf", async (req, res) => {
  try {
    const { startDate, endDate, reportData: existingData, productionOnly } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    logger.info(`[PDF] Generating report, range: ${startDate} to ${endDate}`, {
      environment: "development",
      productionOnly: productionOnly || false,
    });

    // Get organization settings from request
    const org = await getOrganizationSettings(req);

    if (!hasAzureDevOpsConfig(org)) {
      logger.error("[PDF] Azure DevOps configuration not found", { environment: "development" });
      return res.status(400).json({ error: "Azure DevOps configuration required" });
    }

    const azureConfig = getAzureDevOpsConfig(org);
    const productionFilters = productionOnly ? org.productionFilters : null;

    logger.info("[PDF] Config retrieved", {
      environment: "development",
      org: org.name,
      project: azureConfig.project,
      organization: azureConfig.organization,
      productionOnly: productionOnly || false,
      filtersEnabled: productionFilters?.enabled || false,
    });

    let reportData;

    // Use existing data if provided, otherwise fetch fresh
    if (existingData) {
      logger.info("[PDF] Using existing report data (no refetch)", { environment: "development" });
      reportData = {
        startDate,
        endDate,
        productionOnly: productionOnly || false,
        filters: productionFilters,
        ...existingData,
      };
    } else {
      logger.info("[PDF] Fetching fresh report data...", { environment: "development" });

      // Import fetch functions
      const {
        fetchPRMetrics,
        fetchPRDiscussionMetrics,
        fetchBuildMetrics,
        fetchReleaseMetrics,
        fetchWorkItemMetrics,
      } = await import("../services/activityReportService.js");

      // Fetch all report data
      const client = azureDevOpsClient.createUserClient(azureConfig);
      const releaseClient = new AzureDevOpsReleaseClient(
        azureConfig.organization,
        azureConfig.project,
        azureConfig.pat,
        azureConfig.baseUrl
      );

      reportData = {
        startDate,
        endDate,
        productionOnly: productionOnly || false,
        filters: productionFilters,
        workItems: await fetchWorkItemMetrics(client, startDate, endDate),
        builds: await fetchBuildMetrics(
          client,
          startDate,
          endDate,
          productionOnly,
          productionFilters
        ),
        releases: await fetchReleaseMetrics(
          releaseClient,
          startDate,
          endDate,
          productionOnly,
          productionFilters
        ),
        pullRequests: await fetchPRMetrics(
          client,
          startDate,
          endDate,
          productionOnly,
          productionFilters
        ),
        prDiscussion: await fetchPRDiscussionMetrics(
          client,
          startDate,
          endDate,
          productionOnly,
          productionFilters
        ),
      };
      logger.info("[PDF] Report data fetched", { environment: "development" });
    }

    // Generate PDF
    logger.info("[PDF] Calling PDF service...", { environment: "development" });

    // Pass both org settings and Azure config for proper display
    const userSettings = {
      name: org.name,
      azureDevOpsOrg: azureConfig.organization,
      azureDevOpsProject: azureConfig.project,
    };

    const pdfBuffer = await pdfService.generateActivityReportPDF(reportData, userSettings);
    logger.info("[PDF] PDF buffer received", {
      environment: "development",
      size: pdfBuffer.length,
    });

    // Set response headers
    const startDateStr = startDate.split("T")[0];
    const endDateStr = endDate.split("T")[0];
    const orgName = azureConfig.organization || "org";
    const projectName = azureConfig.project || "project";
    const prodSuffix = productionOnly ? "_PRODUCTION" : "";
    const filename = `${orgName}_${projectName}${prodSuffix}_${startDateStr}_to_${endDateStr}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send as Buffer, not JSON
    res.end(pdfBuffer, "binary");

    logger.info(`[PDF] Generated successfully for org ${org.name}`, { environment: "development" });
  } catch (error) {
    logger.error("[PDF] Generation failed", {
      environment: "development",
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to generate PDF", message: error.message });
  }
});

export default router;
