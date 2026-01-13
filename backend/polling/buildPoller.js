import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';

class BuildPoller {
  constructor() {
    this.lastPollTime = new Date();
    // Per-organization processed builds to prevent cross-org ID collision
    this.processedBuildsByOrg = new Map(); // organizationId -> Set of build IDs
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

  // Organization-based polling
  async pollBuildsForOrg(organizationId, org) {
    try {
      if (!org?.azureDevOps?.organization || !org?.azureDevOps?.pat) {
        logger.warn(`Org ${organizationId} missing Azure DevOps config`);
        return;
      }

      const client = azureDevOpsClient.createUserClient({
        organization: org.azureDevOps.organization,
        project: org.azureDevOps.project,
        pat: org.azureDevOps.pat,
        baseUrl: org.azureDevOps.baseUrl || 'https://dev.azure.com'
      });

      const processedBuilds = this.getProcessedBuildsForOrg(organizationId);

      logger.info(`Starting builds polling for org ${organizationId}`);
      const recentBuilds = await client.getRecentBuilds(20);
      
      if (recentBuilds.count > 0) {
        const newBuilds = recentBuilds.value.filter(build => {
          const finishTime = new Date(build.finishTime);
          return finishTime > this.lastPollTime && !processedBuilds.has(build.id);
        });

        if (newBuilds.length > 0) {
          logger.info(`Found ${newBuilds.length} new builds for org ${organizationId}`);
          for (const build of newBuilds) {
            processedBuilds.add(build.id);
          }
        }
      }

      this.lastPollTime = new Date();
      this.cleanupProcessedBuilds(organizationId);
    } catch (error) {
      logger.error(`Error polling builds for org ${organizationId}:`, error);
    }
  }

  // Legacy method for backward compatibility
  async pollBuilds(userId) {
    try {
      let client = azureDevOpsClient;
      
      if (userId) {
        const { getUserSettings } = await import('../utils/userSettings.js');
        const settings = await getUserSettings(userId);
        if (!settings.azureDevOps?.organization || !settings.azureDevOps?.project || !settings.azureDevOps?.pat) {
          return;
        }
        client = azureDevOpsClient.createUserClient({
          organization: settings.azureDevOps.organization,
          project: settings.azureDevOps.project,
          pat: settings.azureDevOps.pat,
          baseUrl: settings.azureDevOps.baseUrl || 'https://dev.azure.com'
        });
      }

      // Use userId as key for legacy flow, or 'global' if no userId
      const legacyKey = userId ? `legacy_${userId}` : 'legacy_global';
      const processedBuilds = this.getProcessedBuildsForOrg(legacyKey);

      logger.info(`Starting builds polling${userId ? ` for user ${userId}` : ''}`);

      // Get recent builds
      const recentBuilds = await client.getRecentBuilds(20);
      
      if (recentBuilds.count > 0) {
        logger.info(`Found ${recentBuilds.count} recent builds`);
        
        // Filter builds that completed since last poll
        const newBuilds = recentBuilds.value.filter(build => {
          const finishTime = new Date(build.finishTime);
          return finishTime > this.lastPollTime && !processedBuilds.has(build.id);
        });

        if (newBuilds.length > 0) {
          logger.info(`Found ${newBuilds.length} new completed builds since last poll`);
          
          for (const build of newBuilds) {
            await this.processBuild(build);
            processedBuilds.add(build.id);
          }
        }
      } else {
        logger.info('No recent builds found');
      }

      this.lastPollTime = new Date();
      
      // Clean up processed builds set to prevent memory leaks
      this.cleanupProcessedBuilds(legacyKey);
      
    } catch (error) {
      logger.error('Error polling builds:', error);
    }
  }

  async processBuild(build) {
    try {
      logger.info(`Processing build: ${build.definition?.name} #${build.buildNumber}`, {
        buildId: build.id,
        result: build.result,
        status: build.status
      });

      // Note: In a real scenario, build completion notifications would typically
      // be handled by webhooks rather than polling. This polling is mainly for
      // backup/fallback scenarios or when webhooks aren't available.
      
      // For now, we'll just log the build information
      // The actual notification logic is handled in the webhook handlers
      
    } catch (error) {
      logger.error(`Error processing build ${build.id}:`, error);
    }
  }

  cleanupProcessedBuilds(organizationId = null) {
    if (organizationId) {
      // Clean up specific org's processed builds
      const processedBuilds = this.getProcessedBuildsForOrg(organizationId);
      if (processedBuilds.size > 500) {
        const buildsArray = Array.from(processedBuilds);
        const toKeep = buildsArray.slice(-250); // Keep last 250
        this.processedBuildsByOrg.set(organizationId, new Set(toKeep));
        logger.debug(`Cleaned up processed builds cache for org ${organizationId}`);
      }
    } else {
      // Clean up all orgs
      for (const [orgId, processedBuilds] of this.processedBuildsByOrg) {
        if (processedBuilds.size > 500) {
          const buildsArray = Array.from(processedBuilds);
          const toKeep = buildsArray.slice(-250);
          this.processedBuildsByOrg.set(orgId, new Set(toKeep));
          logger.debug(`Cleaned up processed builds cache for org ${orgId}`);
        }
      }
    }
  }
}

export const buildPoller = new BuildPoller();
