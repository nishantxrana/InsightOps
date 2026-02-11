import { logger } from "../utils/logger.js";
import { filterActiveWorkItems, filterCompletedWorkItems } from "../utils/workItemStates.js";
import { productionFilterService } from "./productionFilterService.js";

/**
 * Activity Report Service
 *
 * Generates comprehensive DevOps activity reports for a given date range.
 * Aggregates metrics from Pull Requests, Builds, Releases, and Work Items.
 */

/**
 * Main report generator
 */
export async function generateActivityReport(
  client,
  releaseClient,
  orgId,
  startDate,
  endDate,
  productionOnly = false,
  productionFilters = null
) {
  const start = Date.now();

  logger.info(`[ActivityReport] Generating report for org ${orgId}`, {
    startDate,
    endDate,
    productionOnly,
    filters: productionOnly ? productionFilterService.getFilterSummary(productionFilters) : "None",
  });

  const [workItemsResult, buildsResult, releasesResult, prResult, discussionResult] =
    await Promise.allSettled([
      fetchWorkItemMetrics(client, startDate, endDate),
      fetchBuildMetrics(client, startDate, endDate, productionOnly, productionFilters),
      fetchReleaseMetrics(releaseClient, startDate, endDate, productionOnly, productionFilters),
      fetchPRMetrics(client, startDate, endDate, productionOnly, productionFilters),
      fetchPRDiscussionMetrics(client, startDate, endDate, productionOnly, productionFilters),
    ]);

  const duration = Date.now() - start;
  logger.info(`[ActivityReport] Report generated in ${duration}ms`);

  return {
    startDate,
    endDate,
    productionOnly,
    filters: productionOnly ? productionFilters : null,
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
async function fetchPRMetrics(client, startDate, endDate, productionOnly = false, filters = null) {
  try {
    // Fetch PRs using date filtering in API (much more efficient!)
    const fetchAllPRsByStatus = async (status) => {
      let allPRs = [];
      let skip = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const response = await client.client.get("/git/pullrequests", {
          params: {
            "api-version": "7.1",
            "searchCriteria.status": status,
            "searchCriteria.minTime": startDate,
            "searchCriteria.maxTime": endDate,
            "searchCriteria.queryTimeRangeType": "created",
            $top: batchSize,
            $skip: skip,
          },
        });

        const prs = response.data.value || [];
        allPRs = [...allPRs, ...prs];

        // If we got less than batchSize, we've reached the end
        hasMore = prs.length === batchSize;
        skip += batchSize;

        // Safety limit to prevent infinite loops (unlikely to hit with date filtering)
        if (allPRs.length >= 10000) {
          logger.warn(`[ActivityReport] Reached safety limit of 10000 PRs for status: ${status}`);
          break;
        }
      }

      return allPRs;
    };

    // Fetch all PRs for each status in parallel
    const [activePRs, completedPRs, abandonedPRs] = await Promise.all([
      fetchAllPRsByStatus("active"),
      fetchAllPRsByStatus("completed"),
      fetchAllPRsByStatus("abandoned"),
    ]);

    let allPRs = [...activePRs, ...completedPRs, ...abandonedPRs];

    // Apply production filter if enabled
    if (productionOnly && filters?.enabled) {
      const originalCount = allPRs.length;
      allPRs = allPRs.filter((pr) => productionFilterService.isProductionPR(pr, filters));
      logger.info(
        `[ActivityReport] Filtered PRs: ${allPRs.length}/${originalCount} (production only)`
      );
    }

    // Log fetched counts for debugging
    logger.info(`[ActivityReport] Fetched PRs in date range - Total: ${allPRs.length}`);

    // Calculate metrics from FILTERED PRs
    const byStatus = {
      active: allPRs.filter((pr) => pr.status === "active").length,
      completed: allPRs.filter((pr) => pr.status === "completed").length,
      abandoned: allPRs.filter((pr) => pr.status === "abandoned").length,
    };

    // Calculate avg time to complete (for completed PRs only)
    const completedPRsFiltered = allPRs.filter(
      (pr) => pr.status === "completed" && pr.creationDate && pr.closedDate
    );
    const avgTimeToComplete =
      completedPRsFiltered.length > 0
        ? completedPRsFiltered.reduce((sum, pr) => {
            const created = new Date(pr.creationDate);
            const closed = new Date(pr.closedDate);
            return sum + (closed - created) / (1000 * 60 * 60); // hours
          }, 0) / completedPRsFiltered.length
        : 0;

    return {
      totalPRs: allPRs.length,
      byStatus,
      avgTimeToComplete: Math.round(avgTimeToComplete * 10) / 10, // 1 decimal
      totalFetched: allPRs.length, // Show total fetched for transparency
    };
  } catch (error) {
    logger.error("[ActivityReport] Error fetching PR metrics:", error);
    throw error;
  }
}

/**
 * Fetch PR Discussion Health metrics (threads and comments)
 */
async function fetchPRDiscussionMetrics(
  client,
  startDate,
  endDate,
  productionOnly = false,
  filters = null
) {
  try {
    // Use same pagination logic as fetchPRMetrics to get ALL PRs
    const fetchAllPRsByStatus = async (status) => {
      let allPRs = [];
      let skip = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const response = await client.client.get("/git/pullrequests", {
          params: {
            "api-version": "7.1",
            "searchCriteria.status": status,
            "searchCriteria.minTime": startDate,
            "searchCriteria.maxTime": endDate,
            "searchCriteria.queryTimeRangeType": "created",
            $top: batchSize,
            $skip: skip,
          },
        });

        const prs = response.data.value || [];
        allPRs = [...allPRs, ...prs];

        hasMore = prs.length === batchSize;
        skip += batchSize;

        // Safety limit to prevent infinite loops
        if (allPRs.length >= 10000) {
          logger.warn(
            `[ActivityReport] Reached safety limit of 10000 PRs for status: ${status} in PR Discussion`
          );
          break;
        }
      }

      return allPRs;
    };

    // Fetch all PRs for each status in parallel
    const [activePRs, completedPRs] = await Promise.all([
      fetchAllPRsByStatus("active"),
      fetchAllPRsByStatus("completed"),
    ]);

    let prsInRange = [...activePRs, ...completedPRs];

    // Apply production filter if enabled
    if (productionOnly && filters?.enabled) {
      const originalCount = prsInRange.length;
      prsInRange = prsInRange.filter((pr) => productionFilterService.isProductionPR(pr, filters));
      logger.info(
        `[ActivityReport] Filtered PRs for discussion: ${prsInRange.length}/${originalCount} (production only)`
      );
    }

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

        if (threads.length > 0) {
          prsWithComments++;

          let prResolvedCount = 0;
          let prUnresolvedCount = 0;
          let prUserThreadCount = 0; // Only count user threads

          threads.forEach((thread) => {
            const status = thread.status?.toLowerCase();

            // Skip system threads (no status field) - they're not user discussions
            // System threads include: merge attempts, reviewer updates, vote updates, etc.
            if (!thread.status) {
              return; // Skip before counting anything
            }

            // Count comments only from user threads
            const commentCount = thread.comments?.length || 0;
            totalComments += commentCount;

            // Count user threads only
            prUserThreadCount++;
            totalThreads++;

            // Resolved: fixed, closed, wontFix, byDesign, resolved
            // Unresolved: active, pending, unknown
            if (
              status === "fixed" ||
              status === "closed" ||
              status === "wontfix" ||
              status === "bydesign" ||
              status === "resolved"
            ) {
              resolvedThreads++;
              prResolvedCount++;
            } else {
              // active, pending, unknown, or any other status
              unresolvedThreads++;
              prUnresolvedCount++;
            }
          });

          if (prUnresolvedCount > 0) {
            prsWithUnresolvedThreads++;
          }
          if (prUserThreadCount > 0 && prUnresolvedCount === 0) {
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
async function fetchBuildMetrics(
  client,
  startDate,
  endDate,
  productionOnly = false,
  filters = null
) {
  try {
    // Fetch ALL builds using continuation tokens (like releases)
    let allBuilds = [];
    let continuationToken = null;
    let hasMore = true;

    while (hasMore) {
      const params = {
        "api-version": "7.0",
        minTime: startDate,
        maxTime: endDate,
        $top: 200,
      };

      if (continuationToken) {
        params.continuationToken = continuationToken;
      }

      const response = await client.client.get("/build/builds", { params });
      const builds = response.data.value || [];
      allBuilds = [...allBuilds, ...builds];

      continuationToken = response.headers["x-ms-continuationtoken"];
      hasMore = !!continuationToken && builds.length > 0;
    }

    // Apply production filter if enabled
    let buildsToAnalyze = allBuilds;
    if (productionOnly && filters?.enabled) {
      buildsToAnalyze = allBuilds.filter((build) =>
        productionFilterService.isProductionBuild(build, filters)
      );
      logger.info(
        `[ActivityReport] Filtered builds: ${buildsToAnalyze.length}/${allBuilds.length} (production only)`
      );
    }

    const succeeded = buildsToAnalyze.filter((b) => b.result === "succeeded").length;
    const failed = buildsToAnalyze.filter((b) => b.result === "failed").length;
    const others = buildsToAnalyze.length - succeeded - failed;
    const failureRate = buildsToAnalyze.length > 0 ? (failed / buildsToAnalyze.length) * 100 : 0;

    // Calculate avg duration (in minutes) for completed builds
    const completedBuilds = buildsToAnalyze.filter((b) => b.finishTime && b.startTime);
    const avgDuration =
      completedBuilds.length > 0
        ? completedBuilds.reduce((sum, b) => {
            const start = new Date(b.startTime);
            const finish = new Date(b.finishTime);
            return sum + (finish - start) / (1000 * 60); // minutes
          }, 0) / completedBuilds.length
        : 0;

    return {
      totalBuilds: buildsToAnalyze.length,
      succeeded,
      failed,
      others,
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
async function fetchReleaseMetrics(
  releaseClient,
  startDate,
  endDate,
  productionOnly = false,
  filters = null
) {
  try {
    // Fetch ALL releases using continuation token pagination (like /releases/stats does)
    let allReleases = [];
    let continuationToken = null;
    let hasMore = true;

    while (hasMore) {
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

    // Apply production filter if enabled
    let releasesToAnalyze = allReleases;
    if (productionOnly && filters?.enabled) {
      releasesToAnalyze = allReleases.filter((release) =>
        productionFilterService.isProductionRelease(release, filters)
      );
      logger.info(
        `[ActivityReport] Filtered releases: ${releasesToAnalyze.length}/${allReleases.length} (production only)`
      );
    }

    let succeeded = 0;
    let failed = 0;
    let others = 0;
    let failedEnvironments = 0;

    releasesToAnalyze.forEach((release) => {
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
        } else {
          // Pending, in-progress, canceled, or other states
          others++;
        }
      }
    });

    const successRate =
      releasesToAnalyze.length > 0 ? (succeeded / releasesToAnalyze.length) * 100 : 0;

    return {
      totalReleases: releasesToAnalyze.length,
      succeeded,
      failed,
      others,
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
    // Get project name from client config
    const projectName = client.project;

    // Azure DevOps WIQL requires date-only format (YYYY-MM-DD), not ISO timestamps
    const start = new Date(startDate).toISOString().split("T")[0];
    const end = new Date(endDate).toISOString().split("T")[0];

    // Query 1: Created in range (filtered by project)
    const createdQuery = `
      SELECT [System.Id], [System.State]
      FROM WorkItems
      WHERE [System.TeamProject] = '${projectName}'
      AND [System.CreatedDate] >= '${start}'
      AND [System.CreatedDate] <= '${end}'
    `;

    // Query 2: Completed in range (filtered by project)
    const completedQuery = `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.TeamProject] = '${projectName}'
      AND [System.State] IN ('Closed', 'Released To Production')
      AND [System.ChangedDate] >= '${start}'
      AND [System.ChangedDate] <= '${end}'
    `;

    const [createdRes] = await Promise.allSettled([client.queryWorkItems(createdQuery)]);

    // Process created work items with batching (Azure DevOps limit: 200 items per request)
    let created = 0;
    let overdue = 0;
    let stateDistribution = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison

    // Define state categories for overdue calculation
    const completedStates = ["Closed", "Released To Production"];
    const removedStates = ["Removed", "Blocked"];

    if (createdRes.status === "fulfilled" && createdRes.value?.workItems) {
      const ids = createdRes.value.workItems.map((wi) => wi.id);
      if (ids.length > 0) {
        // Batch fetch in chunks of 200, include DueDate field
        const batchSize = 200;
        const allItems = [];

        for (let i = 0; i < ids.length; i += batchSize) {
          const batchIds = ids.slice(i, i + batchSize);
          const items = await client.getWorkItems(batchIds, [
            "System.State",
            "Microsoft.VSTS.Scheduling.DueDate",
          ]);
          if (items.value) {
            allItems.push(...items.value);
          }
        }

        created = allItems.length;

        // Calculate state distribution and overdue count
        allItems.forEach((item) => {
          const state = item.fields?.["System.State"] || "Unknown";
          stateDistribution[state] = (stateDistribution[state] || 0) + 1;

          // Check if this item is overdue (only for non-completed, non-removed items)
          const dueDate = item.fields?.["Microsoft.VSTS.Scheduling.DueDate"];
          const isCompleted = completedStates.includes(state);
          const isRemoved = removedStates.includes(state);

          if (dueDate && !isCompleted && !isRemoved) {
            const dueDateObj = new Date(dueDate);
            dueDateObj.setHours(0, 0, 0, 0);
            if (dueDateObj < today) {
              overdue++;
            }
          }
        });
      }
    }

    return {
      created,
      overdue,
      stateDistribution,
    };
  } catch (error) {
    logger.error("[ActivityReport] Error fetching work item metrics:", error);
    throw error;
  }
}

// Export individual fetch functions for streaming
export {
  fetchPRMetrics,
  fetchPRDiscussionMetrics,
  fetchBuildMetrics,
  fetchReleaseMetrics,
  fetchWorkItemMetrics,
};
