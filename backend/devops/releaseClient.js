import axios from 'axios';
import { logger } from '../utils/logger.js';

class AzureDevOpsReleaseClient {
  constructor(organization, project, pat, baseUrl = 'https://dev.azure.com') {
    this.organization = organization;
    this.project = project;
    this.pat = pat;
    this.baseUrl = baseUrl;
    this.apiVersion = '6.0';
    
    // Use Release Management API endpoint
    const releaseApiUrl = baseUrl.includes('dev.azure.com') 
      ? `https://vsrm.dev.azure.com/${organization}/${project}/_apis`
      : `${baseUrl}/${organization}/${project}/_apis`;
    
    this.client = axios.create({
      baseURL: releaseApiUrl,
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async getReleases(options = {}) {
    try {
      const {
        top = 20,
        definitionId,
        environmentStatusFilter,
        statusFilter,
        minCreatedTime,
        maxCreatedTime
      } = options;

      const params = {
        'api-version': this.apiVersion,
        '$top': top,
        '$expand': 'environments,artifacts,variables'
      };

      if (definitionId) params.definitionId = definitionId;
      if (environmentStatusFilter) params.environmentStatusFilter = environmentStatusFilter;
      if (statusFilter) params.statusFilter = statusFilter;
      if (minCreatedTime) params.minCreatedTime = minCreatedTime;
      if (maxCreatedTime) params.maxCreatedTime = maxCreatedTime;

      const response = await this.client.get('/release/releases', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching releases from Azure DevOps:', error);
      throw error;
    }
  }

  async getReleaseDefinitions() {
    try {
      const params = {
        'api-version': this.apiVersion,
        '$expand': 'environments'
      };

      const response = await this.client.get('/release/definitions', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching release definitions from Azure DevOps:', error);
      throw error;
    }
  }

  async getPendingApprovals() {
    try {
      const params = {
        'api-version': this.apiVersion,
        'statusFilter': 'pending'
      };

      const response = await this.client.get('/release/approvals', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching pending approvals from Azure DevOps:', error);
      throw error;
    }
  }

  async getDeployments(options = {}) {
    try {
      const {
        top = 50,
        definitionId,
        definitionEnvironmentId,
        deploymentStatus
      } = options;

      const params = {
        'api-version': this.apiVersion,
        '$top': top
      };

      if (definitionId) params.definitionId = definitionId;
      if (definitionEnvironmentId) params.definitionEnvironmentId = definitionEnvironmentId;
      if (deploymentStatus) params.deploymentStatus = deploymentStatus;

      const response = await this.client.get('/release/deployments', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching deployments from Azure DevOps:', error);
      throw error;
    }
  }
}

export { AzureDevOpsReleaseClient };
