import { logger } from "../utils/logger.js";

/**
 * Service to determine if builds/releases/PRs are production-related
 * Uses organization-specific configuration
 */
class ProductionFilterService {
  /**
   * Check if a build is production-related
   * Uses ONLY build definition name (pipeline name)
   * Branch is ignored because production pipelines can run from any branch
   * @param {Object} build - Build object from Azure DevOps
   * @param {Object} filters - Organization production filters
   * @returns {boolean}
   */
  isProductionBuild(build, filters) {
    if (!filters?.enabled) return true; // If not enabled, include all

    const { buildDefinitions = [] } = filters;

    // If no build definitions configured, include all
    if (buildDefinitions.length === 0) return true;

    // Check build definition name only
    const definitionName = build.definition?.name || "";
    return buildDefinitions.some((pattern) => this.matchPattern(definitionName, pattern));
  }

  /**
   * Check if a release is production-related
   * Uses ONLY environment name
   * @param {Object} release - Release object from Azure DevOps
   * @param {Object} filters - Organization production filters
   * @returns {boolean}
   */
  isProductionRelease(release, filters) {
    if (!filters?.enabled) return true;

    const { environments = [] } = filters;

    // If no environments configured, include all
    if (environments.length === 0) return true;

    // Check if any environment matches production patterns
    const hasProductionEnv = release.environments?.some((env) => {
      const envName = env.name || "";
      return environments.some((pattern) => this.matchPattern(envName, pattern));
    });

    return hasProductionEnv;
  }

  /**
   * Check if a PR is production-related
   * Uses ONLY target branch (where PR is merging TO)
   * @param {Object} pr - Pull request object from Azure DevOps
   * @param {Object} filters - Organization production filters
   * @returns {boolean}
   */
  isProductionPR(pr, filters) {
    if (!filters?.enabled) return true;

    const { branches = [] } = filters;

    // If no branches configured, include all
    if (branches.length === 0) return true;

    // Check target branch only (where PR is merging to)
    const targetBranch = pr.targetRefName?.replace("refs/heads/", "") || "";
    return branches.some((pattern) => this.matchPattern(targetBranch, pattern));
  }

  /**
   * Match string against pattern (supports wildcards)
   * @param {string} str - String to match
   * @param {string} pattern - Pattern (supports * wildcard)
   * @returns {boolean}
   */
  matchPattern(str, pattern) {
    if (!str || !pattern) return false;

    const strLower = str.toLowerCase();
    const patternLower = pattern.toLowerCase();

    // 1. Exact match
    if (strLower === patternLower) return true;

    // 2. Wildcard support
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + patternLower.replace(/\*/g, ".*") + "$");
      return regex.test(strLower);
    }

    // 3. No contains match - only exact or wildcard
    return false;
  }

  /**
   * Get filter summary for logging/display
   * @param {Object} filters - Organization production filters
   * @returns {string}
   */
  getFilterSummary(filters) {
    if (!filters?.enabled) return "Disabled";

    const parts = [];
    if (filters.branches?.length > 0) {
      parts.push(`Branches: ${filters.branches.join(", ")}`);
    }
    if (filters.environments?.length > 0) {
      parts.push(`Environments: ${filters.environments.join(", ")}`);
    }
    if (filters.buildDefinitions?.length > 0) {
      parts.push(`Build Definitions: ${filters.buildDefinitions.join(", ")}`);
    }

    return parts.length > 0 ? parts.join(" | ") : "No filters configured";
  }
}

export const productionFilterService = new ProductionFilterService();
