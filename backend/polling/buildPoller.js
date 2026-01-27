import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';

class BuildPoller {
  constructor() {
    // Per-organization state - NO shared state across orgs
    this.lastPollTimeByOrg = new Map(); // organizationId -> Date
    this.processedBuildsByOrg = new Map(); // organizationId -> Set of build IDs
  }

  /**
   * Get last poll time for a specific organization
   */
  getLastPollTimeForOrg(organizationId) {
    if (!this.lastPollTimeByOrg.has(organizationId)) {
      this.lastPollTimeByOrg.set(organizationId, new Date(0)); // Epoch = never polled
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
   * Get or create processed builds set for an organization
   */
  getProcessedBuildsForOrg(organizationId) {
    if (!this.processedBuildsByOrg.has(organizationId)) {
      this.processedBuildsByOrg.set(organizationId, new Set());
    }
    return this.processedBuildsByOrg.get(organizationId);
  }

  // Organization-based polling (STRICT: organizationId required)
  async pollBuildsForOrg(organizationId, org) {
    if (!organizationId) {
      throw new Error('organizationId is required for pollBuildsForOrg');
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
        baseUrl: org.azureDevOps.baseUrl || 'https://dev.azure.com'
      });

      const processedBuilds = this.getProcessedBuildsForOrg(organizationId);
      const lastPollTime = this.getLastPollTimeForOrg(organizationId);

      logger.info(`Starting builds polling for org ${organizationId}`);
      const recentBuilds = await client.getRecentBuilds(20);
      
      if (recentBuilds.count > 0) {
        const newBuilds = recentBuilds.value.filter(build => {
          const finishTime = new Date(build.finishTime);
          return finishTime > lastPollTime && !processedBuilds.has(build.id);
        });

        if (newBuilds.length > 0) {
          logger.info(`Found ${newBuilds.length} new builds for org ${organizationId}`);
          for (const build of newBuilds) {
            processedBuilds.add(build.id);
          }
        }
      }

      this.setLastPollTimeForOrg(organizationId);
      this.cleanupProcessedBuilds(organizationId);
    } catch (error) {
      logger.error(`Error polling builds for org ${organizationId}:`, error);
    }
  }

  /**
   * @deprecated REMOVED - Use pollBuildsForOrg() with organizationId
   * Legacy user-based polling is no longer supported.
   */
  async pollBuilds(userId) {
    logger.error('DEPRECATED: pollBuilds(userId) called - this method is no longer supported', {
      userId,
      action: 'poll-builds',
      status: 'rejected'
    });
    throw new Error('Legacy user-based polling is not supported. Use pollBuildsForOrg(organizationId, org) instead.');
  }

  cleanupProcessedBuilds(organizationId) {
    if (!organizationId) {
      logger.warn('cleanupProcessedBuilds called without organizationId');
      return;
    }
    
    const processedBuilds = this.getProcessedBuildsForOrg(organizationId);
    if (processedBuilds.size > 500) {
      const buildsArray = Array.from(processedBuilds);
      const toKeep = buildsArray.slice(-250); // Keep last 250
      this.processedBuildsByOrg.set(organizationId, new Set(toKeep));
      logger.debug(`Cleaned up processed builds cache for org ${organizationId}`);
    }
  }

  /**
   * Clear all polling state for an organization (call when org is deleted/deactivated)
   */
  clearOrganizationState(organizationId) {
    if (!organizationId) return;
    
    this.processedBuildsByOrg.delete(organizationId);
    this.lastPollTimeByOrg.delete(organizationId);
    logger.info(`Cleared build poller state for org ${organizationId}`);
  }
}

export const buildPoller = new BuildPoller();
