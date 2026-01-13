import { Organization } from '../models/Organization.js';
import { PollingJob } from '../models/PollingJob.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

class OrganizationService {
  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId) {
    const orgs = await Organization.find({ userId, isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
    
    return orgs.map(org => this.sanitizeOrganization(org));
  }

  /**
   * Get a single organization by ID (with ownership check)
   */
  async getOrganization(organizationId, userId) {
    const org = await Organization.findOne({ 
      _id: organizationId, 
      userId, 
      isActive: true 
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
    if (org.azureDevOps?.pat) {
      try {
        org.azureDevOps.pat = decrypt(org.azureDevOps.pat);
      } catch (e) {
        logger.error('Failed to decrypt PAT for org:', organizationId);
      }
    }
    
    if (org.ai?.apiKeys) {
      for (const provider of ['openai', 'groq', 'gemini']) {
        if (org.ai.apiKeys[provider]) {
          try {
            org.ai.apiKeys[provider] = decrypt(org.ai.apiKeys[provider]);
          } catch (e) {
            logger.error(`Failed to decrypt ${provider} key for org:`, organizationId);
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
      'azureDevOps.organization': data.azureDevOps.organization
    });

    if (existing) {
      if (existing.isActive) {
        throw new Error('Organization already exists for this Azure DevOps org');
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
      isDefault
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
      throw new Error('Organization not found');
    }

    // Encrypt sensitive data if provided
    if (data.azureDevOps) {
      if (data.azureDevOps.pat && data.azureDevOps.pat !== '********') {
        data.azureDevOps.pat = encrypt(data.azureDevOps.pat);
      } else {
        delete data.azureDevOps.pat; // Keep existing
      }
      Object.assign(org.azureDevOps, data.azureDevOps);
    }

    if (data.ai) {
      if (data.ai.apiKeys) {
        for (const provider of ['openai', 'groq', 'gemini']) {
          if (data.ai.apiKeys[provider] && data.ai.apiKeys[provider] !== '********') {
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
    const pollingChanged = data.polling && (
      data.polling.pullRequestEnabled !== undefined ||
      data.polling.overdueCheckEnabled !== undefined ||
      data.polling.pullRequestInterval !== undefined ||
      data.polling.overdueCheckInterval !== undefined
    );

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
        const { userPollingManager } = await import('../polling/userPollingManager.js');
        logger.info(`🔄 [POLLING] Restarting polling for org ${organizationId} due to settings change`);
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
      throw new Error('Organization not found');
    }

    // Check if it's the only org
    const orgCount = await Organization.countDocuments({ userId, isActive: true });
    if (orgCount <= 1) {
      throw new Error('Cannot delete the only organization');
    }

    // If deleting default, set another as default
    if (org.isDefault) {
      const nextDefault = await Organization.findOne({ 
        userId, 
        isActive: true, 
        _id: { $ne: organizationId } 
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
    await Organization.updateMany(
      { userId, isDefault: true },
      { isDefault: false }
    );

    // Set new default
    const org = await Organization.findOneAndUpdate(
      { _id: organizationId, userId, isActive: true },
      { isDefault: true },
      { new: true }
    );

    if (!org) {
      throw new Error('Organization not found');
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
   * Test Azure DevOps connection
   */
  async testConnection(organizationId, userId) {
    const org = await this.getOrganizationWithCredentials(organizationId, userId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const { organization, project, pat, baseUrl } = org.azureDevOps;
    const url = `${baseUrl}/${organization}/${project}/_apis/projects/${project}?api-version=7.0`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(':' + pat).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        projectName: response.data.name,
        projectId: response.data.id
      };
    } catch (error) {
      logger.error('Azure DevOps connection test failed:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Fetch projects from Azure DevOps using saved credentials
   */
  async fetchProjects(organizationId, userId) {
    const org = await this.getOrganizationWithCredentials(organizationId, userId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const { organization, pat, baseUrl } = org.azureDevOps;
    const url = `${baseUrl}/${organization}/_apis/projects?api-version=7.0`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(':' + pat).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const projects = response.data.value?.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description
      })) || [];

      return { projects };
    } catch (error) {
      logger.error('Failed to fetch projects:', error.message);
      return {
        error: error.response?.data?.message || error.message
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
      for (const provider of ['openai', 'groq', 'gemini']) {
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
      sanitized.azureDevOps = { ...sanitized.azureDevOps, pat: '********' };
    }
    
    if (sanitized.ai?.apiKeys) {
      sanitized.ai = { 
        ...sanitized.ai, 
        apiKeys: {
          openai: sanitized.ai.apiKeys.openai ? '********' : '',
          groq: sanitized.ai.apiKeys.groq ? '********' : '',
          gemini: sanitized.ai.apiKeys.gemini ? '********' : ''
        }
      };
    }

    return sanitized;
  }
}

export const organizationService = new OrganizationService();
