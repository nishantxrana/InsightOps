import { logger } from "../utils/logger.js";
import { filterActiveWorkItems, filterCompletedWorkItems } from "../utils/workItemStates.js";

/**
 * Activity Report Service
 *
 * Generates comprehensive DevOps activity reports for a given date range.
 * Aggregates metrics from Pull Requests, Builds, Releases, and Work Items.
 */

/**
 * Main report generator
 */
export async function generateActivityReport(client, releaseClient, orgId, startDate, endDate) {
  const start = Date.now();

  logger.info(`[ActivityReport] Generating report for org ${orgId}`, {
    startDate,
    endDate,
  });

  const [prResult, discussionResult, buildsResult, releasesResult, workItemsResult] =
    await Promise.allSettled([
      fetchPRMetrics(client, startDate, endDate),
      fetchPRDiscussionMetrics(client, startDate, endDate),
      fetchBuildMetrics(client, startDate, endDate),
      fetchReleaseMetrics(releaseClient, startDate, endDate),
      fetchWorkItemMetrics(client, startDate, endDate),
    ]);

  const duration = Date.now() - start;
  logger.info(`[ActivityReport] Report generated in ${duration}ms`);

  return {
    pullRequests:
      prResult.status === "fulfilled" ? prResult.value : { error: prResult.reason?.message },
    prDiscussion:
      discussionResult.status === "fulfilled"
        ? discussionResult.value
        : { error: discussionResult.reason?.message },
    builds:
      buildsResult.status === "fulfilled"
        ? buildsResult.value
        : { error: buildsResult.reason?.message },
    releases:
      releasesResult.status === "fulfilled"
        ? releasesResult.value
        : { error: releasesResult.reason?.message },
    workItems:
      workItemsResult.status === "fulfilled"
        ? workItemsResult.value
        : { error: workItemsResult.reason?.message },
    meta: {
      generatedAt: new Date().toISOString(),
      durationMs: duration,
      dateRange: { startDate, endDate },
    },
  };
}

/**
 * Fetch Pull Request metrics
 */
async function fetchPRMetrics(client, startDate, endDate) {
  try {
    // Fetch all PRs (Azure DevOps doesn't support date filtering in list API)
    const [activeRes, completedRes, abandonedRes] = await Promise.all([
      client.getPullRequests("active"),
      client.getPullRequests("completed"),
      client.getPullRequests("abandoned"),
    ]);

    const allPRs = [
      ...(activeRes.value || []),
      ...(completedRes.value || []),
      ...(abandonedRes.value || []),
    ];

    // Filter by creation date
    const start = new Date(startDate);
    const end = new Date(endDate);
    const prsInRange = allPRs.filter((pr) => {
      const created = new Date(pr.creationDate);
      return created >= start && created <= end;
    });

    // Calculate metrics
    const byStatus = {
      active: prsInRange.filter((pr) => pr.status === "active").length,
      completed: prsInRange.filter((pr) => pr.status === "completed").length,
      abandoned: prsInRange.filter((pr) => pr.status === "abandoned").length,
    };

    // Calculate avg time to complete (for completed PRs only)
    const completedPRs = prsInRange.filter((pr) => pr.status === "completed" && pr.closedDate);
    const avgTimeToComplete =
      completedPRs.length > 0
        ? completedPRs.reduce((sum, pr) => {
            const created = new Date(pr.creationDate);
            const closed = new Date(pr.closedDate);
            return sum + (closed - created) / (1000 * 60 * 60); // hours
          }, 0) / completedPRs.length
        : 0;

    return {
      totalPRs: prsInRange.length,
      byStatus,
      avgTimeToComplete: Math.round(avgTimeToComplete * 10) / 10, // 1 decimal
    };
  } catch (error) {
    logger.error("[ActivityReport] Error fetching PR metrics:", error);
    throw error;
  }
}

/**
 * Fetch PR Discussion Health metrics (threads and comments)
 */
async function fetchPRDiscussionMetrics(client, startDate, endDate) {
  try {
    // Get ALL PRs in date range (no artificial limit)
    const activeRes = await client.getPullRequests("active");
    const completedRes = await client.getPullRequests("completed");

    const allPRs = [...(activeRes.value || []), ...(completedRes.value || [])];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const prsInRange = allPRs.filter((pr) => {
      const created = new Date(pr.creationDate);
      return created >= start && created <= end;
    });

    if (prsInRange.length === 0) {
      return {
        totalThreads: 0,
        resolvedThreads: 0,
        unresolvedThreads: 0,
        resolutionRate: 0,
        totalComments: 0,
        avgCommentsPerPR: 0,
        avgCommentsPerThread: 0,
        prsWithComments: 0,
        prsWithUnresolvedThreads: 0,
        prsWithAllThreadsResolved: 0,
        totalPRsAnalyzed: 0,
      };
    }

    // Fetch threads for ALL PRs in batches to avoid overwhelming the API
    const batchSize = 10;
    const threadResults = [];

    for (let i = 0; i < prsInRange.length; i += batchSize) {
      const batch = prsInRange.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((pr) => client.getPullRequestThreads(pr.repository.id, pr.pullRequestId))
      );
      threadResults.push(...batchResults);
    }

    let totalThreads = 0;
    let resolvedThreads = 0;
    let unresolvedThreads = 0;
    let totalComments = 0;
    let prsWithComments = 0;
    let prsWithUnresolvedThreads = 0;
    let prsWithAllThreadsResolved = 0;

    threadResults.forEach((result) => {
      if (result.status === "fulfilled" && result.value?.value) {
        const threads = result.value.value;
        const prThreadCount = threads.length;

        if (prThreadCount > 0) {
          prsWithComments++;
          totalThreads += prThreadCount;

          let prResolvedCount = 0;
          let prUnresolvedCount = 0;

          threads.forEach((thread) => {
            const status = thread.status?.toLowerCase();
            const commentCount = thread.comments?.length || 0;
            totalComments += commentCount;

            // Resolved: fixed, closed, wontFix, byDesign
            // Unresolved: active, pending, unknown, or any other status
            if (
              status === "fixed" ||
              status === "closed" ||
              status === "wontfix" ||
              status === "bydesign"
            ) {
              resolvedThreads++;
              prResolvedCount++;
            } else {
              // Everything else is unresolved (active, pending, unknown, etc.)
              unresolvedThreads++;
              prUnresolvedCount++;
            }
          });

          if (prUnresolvedCount > 0) {
            prsWithUnresolvedThreads++;
          }
          if (prThreadCount > 0 && prUnresolvedCount === 0) {
            prsWithAllThreadsResolved++;
          }
        }
      }
    });

    const resolutionRate = totalThreads > 0 ? (resolvedThreads / totalThreads) * 100 : 0;
    const avgCommentsPerPR = prsInRange.length > 0 ? totalComments / prsInRange.length : 0;
    const avgCommentsPerThread = totalThreads > 0 ? totalComments / totalThreads : 0;

    return {
      totalThreads,
      resolvedThreads,
      unresolvedThreads,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      totalComments,
      avgCommentsPerPR: Math.round(avgCommentsPerPR * 10) / 10,
      avgCommentsPerThread: Math.round(avgCommentsPerThread * 10) / 10,
      prsWithComments,
      prsWithUnresolvedThreads,
      prsWithAllThreadsResolved,
      totalPRsAnalyzed: prsInRange.length,
    };
  } catch (error) {
    logger.error("[ActivityReport] Error fetching PR discussion metrics:", error);
    throw error;
  }
}

/**
 * Fetch Build metrics
 */
async function fetchBuildMetrics(client, startDate, endDate) {
  try {
    const builds = await client.getBuildsInDateRange(startDate, endDate, 200);
    const buildList = builds.value || [];

    const succeeded = buildList.filter((b) => b.result === "succeeded").length;
    const failed = buildList.filter((b) => b.result === "failed").length;
    const failureRate = buildList.length > 0 ? (failed / buildList.length) * 100 : 0;

    // Calculate avg duration (in minutes) for completed builds
    const completedBuilds = buildList.filter((b) => b.finishTime && b.startTime);
    const avgDuration =
      completedBuilds.length > 0
        ? completedBuilds.reduce((sum, b) => {
            const start = new Date(b.startTime);
            const finish = new Date(b.finishTime);
            return sum + (finish - start) / (1000 * 60); // minutes
          }, 0) / completedBuilds.length
        : 0;

    return {
      totalBuilds: buildList.length,
      succeeded,
      failed,
      failureRate: Math.round(failureRate * 10) / 10,
      avgDuration: Math.round(avgDuration * 10) / 10,
    };
  } catch (error) {
    logger.error("[ActivityReport] Error fetching build metrics:", error);
    throw error;
  }
}

/**
 * Fetch Release metrics
 */
async function fetchReleaseMetrics(releaseClient, startDate, endDate) {
  try {
    // Fetch ALL releases using continuation token pagination (like /releases/stats does)
    let allReleases = [];
    let continuationToken = null;
    let hasMore = true;

    while (hasMore && allReleases.length < 1000) {
      const response = await releaseClient.getReleases({
        top: 100,
        minCreatedTime: startDate,
        maxCreatedTime: endDate,
        continuationToken,
      });

      const releases = response.value || [];
      allReleases = [...allReleases, ...releases];

      continuationToken = response.continuationToken;
      hasMore = !!continuationToken && releases.length > 0;
    }

    let succeeded = 0;
    let failed = 0;
    let failedEnvironments = 0;

    allReleases.forEach((release) => {
      if (release.environments && release.environments.length > 0) {
        const envStatuses = release.environments.map((env) => env.status?.toLowerCase());
        const hasFailure = envStatuses.some((s) => s === "rejected" || s === "failed");
        const allSucceeded = envStatuses.every((s) => s === "succeeded");

        if (allSucceeded) {
          succeeded++;
        } else if (hasFailure) {
          failed++;
          failedEnvironments += envStatuses.filter(
            (s) => s === "rejected" || s === "failed"
          ).length;
        }
      }
    });

    const successRate = allReleases.length > 0 ? (succeeded / allReleases.length) * 100 : 0;

    return {
      totalReleases: allReleases.length,
      succeeded,
      failed,
      failedEnvironments,
      successRate: Math.round(successRate * 10) / 10,
    };
  } catch (error) {
    logger.error("[ActivityReport] Error fetching release metrics:", error);
    throw error;
  }
}

/**
 * Fetch Work Item metrics
 */
async function fetchWorkItemMetrics(client, startDate, endDate) {
  try {
    // Azure DevOps WIQL requires date-only format (YYYY-MM-DD), not ISO timestamps
    const start = new Date(startDate).toISOString().split("T")[0];
    const end = new Date(endDate).toISOString().split("T")[0];

    // Query 1: Created in range
    const createdQuery = `
      SELECT [System.Id], [System.State]
      FROM WorkItems
      WHERE [System.CreatedDate] >= '${start}'
      AND [System.CreatedDate] <= '${end}'
    `;

    // Query 2: Completed in range
    const completedQuery = `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.State] IN ('Done', 'Closed', 'Resolved')
      AND [System.ChangedDate] >= '${start}'
      AND [System.ChangedDate] <= '${end}'
    `;

    const [createdRes, completedRes, overdueRes] = await Promise.allSettled([
      client.queryWorkItems(createdQuery),
      client.queryWorkItems(completedQuery),
      client.getOverdueWorkItems(),
    ]);

    // Process created work items with batching (Azure DevOps limit: 200 items per request)
    let created = 0;
    let stateDistribution = {};
    if (createdRes.status === "fulfilled" && createdRes.value?.workItems) {
      const ids = createdRes.value.workItems.map((wi) => wi.id);
      if (ids.length > 0) {
        // Batch fetch in chunks of 200
        const batchSize = 200;
        const allItems = [];

        for (let i = 0; i < ids.length; i += batchSize) {
          const batchIds = ids.slice(i, i + batchSize);
          const items = await client.getWorkItems(batchIds, ["System.State"]);
          if (items.value) {
            allItems.push(...items.value);
          }
        }

        created = allItems.length;
        allItems.forEach((item) => {
          const state = item.fields?.["System.State"] || "Unknown";
          stateDistribution[state] = (stateDistribution[state] || 0) + 1;
        });
      }
    }

    // Process completed work items
    const completed =
      completedRes.status === "fulfilled" ? completedRes.value?.workItems?.length || 0 : 0;

    // Process overdue work items
    const overdue = overdueRes.status === "fulfilled" ? overdueRes.value?.count || 0 : 0;

    return {
      created,
      completed,
      overdue,
      stateDistribution,
    };
  } catch (error) {
    logger.error("[ActivityReport] Error fetching work item metrics:", error);
    throw error;
  }
}
