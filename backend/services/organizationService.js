import { Organization } from "../models/Organization.js";
import { PollingJob } from "../models/PollingJob.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";
import axios from "axios";

class OrganizationService {
  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId) {
    const orgs = await Organization.find({ userId, isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return orgs.map((org) => this.sanitizeOrganization(org));
  }

  /**
   * Get a single organization by ID (with ownership check)
   */
  async getOrganization(organizationId, userId) {
    const org = await Organization.findOne({
      _id: organizationId,
      userId,
      isActive: true,
    }).lean();

    if (!org) return null;
    return this.sanitizeOrganization(org);
  }

  /**
   * Get organization with decrypted credentials (internal use only)
   */
  async getOrganizationWithCredentials(organizationId, userId = null) {
    const query = { _id: organizationId, isActive: true };
    if (userId) query.userId = userId;

    const org = await Organization.findOne(query).lean();
    if (!org) return null;

    // Decrypt sensitive fields
    // Note: decrypt() returns null on failure (key mismatch, corruption, etc.)
    if (org.azureDevOps?.pat) {
      const encryptedPat = org.azureDevOps.pat;
      const decryptedPat = decrypt(encryptedPat);

      if (decryptedPat === null) {
        // Decryption failed - likely ENCRYPTION_KEY changed
        logger.error("Failed to decrypt PAT - ENCRYPTION_KEY may have changed", {
          component: "org-service",
          organizationId: organizationId.toString(),
          hint: "Re-save the organization credentials to encrypt with the current key",
        });
        org.azureDevOps.pat = null;
        org.azureDevOps._decryptionFailed = true; // Flag for callers to check
      } else {
        org.azureDevOps.pat = decryptedPat;
        logger.debug("PAT decrypted successfully", {
          component: "org-service",
          organizationId: organizationId.toString(),
        });
      }
    } else {
      logger.warn("No PAT found in database for organization", {
        component: "org-service",
        organizationId: organizationId.toString(),
      });
    }

    if (org.ai?.apiKeys) {
      for (const provider of ["openai", "groq", "gemini"]) {
        if (org.ai.apiKeys[provider]) {
          const decryptedKey = decrypt(org.ai.apiKeys[provider]);

          if (decryptedKey === null) {
            logger.error(
              `Failed to decrypt ${provider} API key - ENCRYPTION_KEY may have changed`,
              {
                component: "org-service",
                organizationId: organizationId.toString(),
                hint: "Re-save the AI configuration to encrypt with the current key",
              }
            );
            org.ai.apiKeys[provider] = null;
            org.ai._decryptionFailed = org.ai._decryptionFailed || {};
            org.ai._decryptionFailed[provider] = true;
          } else {
            org.ai.apiKeys[provider] = decryptedKey;
          }
        }
      }
    }

    return org;
  }

  /**
   * Create a new organization
   */
  async createOrganization(userId, data) {
    // Check if org already exists (including soft-deleted)
    const existing = await Organization.findOne({
      userId,
      "azureDevOps.organization": data.azureDevOps.organization,
    });

    if (existing) {
      if (existing.isActive) {
        throw new Error("Organization already exists for this Azure DevOps org");
      }
      // Reactivate soft-deleted org with new data
      // Check if there are other active orgs - if so, don't make this default
      const activeOrgCount = await Organization.countDocuments({ userId, isActive: true });

      existing.isActive = true;
      existing.isDefault = activeOrgCount === 0; // Only default if no other active orgs
      existing.name = data.name || data.azureDevOps.organization;
      existing.azureDevOps = this.encryptSensitiveData(data).azureDevOps;
      if (data.ai) existing.ai = this.encryptSensitiveData(data).ai;
      if (data.notifications) existing.notifications = data.notifications;
      if (data.polling) existing.polling = data.polling;
      await existing.save();
      logger.info(`Reactivated organization ${existing.name} for user ${userId}`);
      return this.sanitizeOrganization(existing.toObject());
    }

    // Check if this is the first org (make it default)
    const orgCount = await Organization.countDocuments({ userId, isActive: true });
    const isDefault = orgCount === 0;

    // Encrypt sensitive data
    const encryptedData = this.encryptSensitiveData(data);

    const org = new Organization({
      userId,
      name: data.name || data.azureDevOps.organization,
      azureDevOps: encryptedData.azureDevOps,
      ai: encryptedData.ai,
      notifications: data.notifications || {},
      polling: data.polling || {},
      isDefault,
    });

    await org.save();
    logger.info(`Created organization ${org.name} for user ${userId}`);

    return this.sanitizeOrganization(org.toObject());
  }

  /**
   * Update an organization
   */
  async updateOrganization(organizationId, userId, data) {
    const org = await Organization.findOne({ _id: organizationId, userId, isActive: true });
    if (!org) {
      throw new Error("Organization not found");
    }

    // Encrypt sensitive data if provided
    if (data.azureDevOps) {
      if (data.azureDevOps.pat && data.azureDevOps.pat !== "********") {
        data.azureDevOps.pat = encrypt(data.azureDevOps.pat);
      } else {
        delete data.azureDevOps.pat; // Keep existing
      }
      Object.assign(org.azureDevOps, data.azureDevOps);
    }

    if (data.ai) {
      if (data.ai.apiKeys) {
        for (const provider of ["openai", "groq", "gemini"]) {
          if (data.ai.apiKeys[provider] && data.ai.apiKeys[provider] !== "********") {
            data.ai.apiKeys[provider] = encrypt(data.ai.apiKeys[provider]);
          } else {
            delete data.ai.apiKeys[provider];
          }
        }
        org.ai.apiKeys = { ...org.ai.apiKeys, ...data.ai.apiKeys };
      }
      if (data.ai.provider) org.ai.provider = data.ai.provider;
      if (data.ai.model) org.ai.model = data.ai.model;
    }

    if (data.notifications) {
      Object.assign(org.notifications, data.notifications);
    }

    // Track if polling settings changed
    const pollingChanged =
      data.polling &&
      (data.polling.pullRequestEnabled !== undefined ||
        data.polling.overdueCheckEnabled !== undefined ||
        data.polling.pullRequestInterval !== undefined ||
        data.polling.overdueCheckInterval !== undefined);

    if (data.polling) {
      Object.assign(org.polling, data.polling);
    }

    if (data.name) {
      org.name = data.name;
    }

    await org.save();
    logger.info(`Updated organization ${org.name}`);

    // Restart polling if polling settings changed
    if (pollingChanged) {
      try {
        const { userPollingManager } = await import("../polling/userPollingManager.js");
        logger.info(
          `🔄 [POLLING] Restarting polling for org ${organizationId} due to settings change`
        );
        await userPollingManager.startOrganizationPolling(organizationId);
      } catch (pollingError) {
        logger.error(`Failed to restart polling for org ${organizationId}:`, pollingError);
      }
    }

    return this.sanitizeOrganization(org.toObject());
  }

  /**
   * Delete an organization (soft delete)
   */
  async deleteOrganization(organizationId, userId) {
    const org = await Organization.findOne({ _id: organizationId, userId, isActive: true });
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if it's the only org
    const orgCount = await Organization.countDocuments({ userId, isActive: true });
    if (orgCount <= 1) {
      throw new Error("Cannot delete the only organization");
    }

    // If deleting default, set another as default
    if (org.isDefault) {
      const nextDefault = await Organization.findOne({
        userId,
        isActive: true,
        _id: { $ne: organizationId },
      });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    // Soft delete
    org.isActive = false;
    await org.save();

    // Clean up polling jobs
    await PollingJob.deleteMany({ organizationId });

    logger.info(`Deleted organization ${org.name}`);
    return true;
  }

  /**
   * Set default organization for user
   */
  async setDefaultOrganization(organizationId, userId) {
    // Unset current default
    await Organization.updateMany({ userId, isDefault: true }, { isDefault: false });

    // Set new default
    const org = await Organization.findOneAndUpdate(
      { _id: organizationId, userId, isActive: true },
      { isDefault: true },
      { new: true }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    return this.sanitizeOrganization(org.toObject());
  }

  /**
   * Get user's default organization
   */
  async getDefaultOrganization(userId) {
    let org = await Organization.findOne({ userId, isDefault: true, isActive: true }).lean();

    // If no default, get first active org
    if (!org) {
      org = await Organization.findOne({ userId, isActive: true }).lean();
      if (org) {
        await Organization.updateOne({ _id: org._id }, { isDefault: true });
        org.isDefault = true;
      }
    }

    return org ? this.sanitizeOrganization(org) : null;
  }

  /**
   * Test Azure DevOps connection using saved credentials
   */
  async testConnection(organizationId, userId) {
    const org = await this.getOrganizationWithCredentials(organizationId, userId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const { organization, project, pat, baseUrl, _decryptionFailed } = org.azureDevOps || {};

    // Debug: Log what we have (without exposing PAT)
    logger.info("Testing connection with saved credentials", {
      component: "org-service",
      action: "test-connection",
      organizationId,
      hasOrg: !!organization,
      hasProject: !!project,
      hasPat: !!pat,
      patLength: pat?.length || 0,
      baseUrl: baseUrl || "not set",
      decryptionFailed: !!_decryptionFailed,
    });

    // Validate we have credentials
    if (!organization || !project) {
      return {
        success: false,
        error: "Azure DevOps organization and project are not configured",
      };
    }

    // Check if decryption failed (key mismatch)
    if (_decryptionFailed) {
      return {
        success: false,
        error:
          "Unable to decrypt saved credentials. The encryption key may have changed. Please re-enter your Personal Access Token.",
        code: "DECRYPTION_FAILED",
      };
    }

    if (!pat || pat.length < 20) {
      return {
        success: false,
        error:
          "Personal Access Token is not configured or invalid. Please update your PAT in settings.",
      };
    }

    const url = `${baseUrl || "https://dev.azure.com"}/${organization}/_apis/projects?api-version=7.0`;

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(":" + pat).toString("base64")}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // Verify project exists
      const projects = response.data.value || [];
      const projectExists = projects.some((p) => p.name.toLowerCase() === project.toLowerCase());

      if (!projectExists) {
        return {
          success: false,
          error: `Project "${project}" not found in organization "${organization}"`,
        };
      }

      logger.info("Connection test successful", {
        component: "org-service",
        action: "test-connection",
        organizationId,
        projectCount: projects.length,
      });

      return {
        success: true,
        message: `Connected successfully to ${organization}/${project}`,
        projectCount: projects.length,
      };
    } catch (error) {
      const errorMessage =
        error.response?.status === 401
          ? "Authentication failed. Your PAT may have expired or been revoked."
          : error.response?.status === 403
            ? "Access denied. Check your PAT permissions."
            : error.response?.data?.message || error.message;

      logger.error("Azure DevOps connection test failed", {
        component: "org-service",
        action: "test-connection",
        organizationId,
        status: error.response?.status,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch projects from Azure DevOps using saved credentials
   */
  async fetchProjects(organizationId, userId) {
    const org = await this.getOrganizationWithCredentials(organizationId, userId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const { organization, pat, baseUrl } = org.azureDevOps;
    const url = `${baseUrl}/${organization}/_apis/projects?api-version=7.0`;

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(":" + pat).toString("base64")}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const projects =
        response.data.value?.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
        })) || [];

      return { projects };
    } catch (error) {
      logger.error("Failed to fetch projects:", error.message);
      return {
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Encrypt sensitive data before storage
   */
  encryptSensitiveData(data) {
    const result = { ...data };

    if (result.azureDevOps?.pat) {
      result.azureDevOps = { ...result.azureDevOps };
      result.azureDevOps.pat = encrypt(result.azureDevOps.pat);
    }

    if (result.ai?.apiKeys) {
      result.ai = { ...result.ai, apiKeys: { ...result.ai.apiKeys } };
      for (const provider of ["openai", "groq", "gemini"]) {
        if (result.ai.apiKeys[provider]) {
          result.ai.apiKeys[provider] = encrypt(result.ai.apiKeys[provider]);
        }
      }
    }

    return result;
  }

  /**
   * Remove sensitive data for API responses
   */
  sanitizeOrganization(org) {
    const sanitized = { ...org };

    if (sanitized.azureDevOps?.pat) {
      sanitized.azureDevOps = { ...sanitized.azureDevOps, pat: "********" };
    }

    if (sanitized.ai?.apiKeys) {
      sanitized.ai = {
        ...sanitized.ai,
        apiKeys: {
          openai: sanitized.ai.apiKeys.openai ? "********" : "",
          groq: sanitized.ai.apiKeys.groq ? "********" : "",
          gemini: sanitized.ai.apiKeys.gemini ? "********" : "",
        },
      };
    }

    return sanitized;
  }
}

export const organizationService = new OrganizationService();
