import { logger } from "../utils/logger.js";

/**
 * Service to determine if builds/releases/PRs are production-related
 * Uses organization-specific configuration
 */
class ProductionFilterService {
  /**
   * Check if a build is production-related
   * @param {Object} build - Build object from Azure DevOps
   * @param {Object} filters - Organization production filters
   * @returns {boolean}
   */
  isProductionBuild(build, filters) {
    if (!filters?.enabled) return true; // If not enabled, include all

    const { branches = [], buildDefinitions = [] } = filters;

    // Check branch
    const sourceBranch = build.sourceBranch?.replace("refs/heads/", "") || "";
    const branchMatch =
      branches.length === 0 || branches.some((pattern) => this.matchPattern(sourceBranch, pattern));

    // Check build definition
    const definitionName = build.definition?.name || "";
    const definitionMatch =
      buildDefinitions.length === 0 ||
      buildDefinitions.some((pattern) => this.matchPattern(definitionName, pattern));

    // Match if either branch OR definition matches (OR logic)
    return branchMatch || definitionMatch;
  }

  /**
   * Check if a release is production-related
   * @param {Object} release - Release object from Azure DevOps
   * @param {Object} filters - Organization production filters
   * @returns {boolean}
   */
  isProductionRelease(release, filters) {
    if (!filters?.enabled) return true;

    const { environments = [] } = filters;

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
   * @param {Object} pr - Pull request object from Azure DevOps
   * @param {Object} filters - Organization production filters
   * @returns {boolean}
   */
  isProductionPR(pr, filters) {
    if (!filters?.enabled) return true;

    const { branches = [] } = filters;

    if (branches.length === 0) return true;

    // Check target branch (where PR is merging to)
    const targetBranch = pr.targetRefName?.replace("refs/heads/", "") || "";
    const branchMatch = branches.some((pattern) => this.matchPattern(targetBranch, pattern));

    return branchMatch;
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
