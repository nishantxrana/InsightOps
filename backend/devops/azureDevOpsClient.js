import axios from 'axios';
import { logger } from '../utils/logger.js';
import { configLoader } from '../config/settings.js';

class AzureDevOpsClient {
  constructor() {
    this.config = configLoader.getAzureDevOpsConfig();
    this.baseURL = `${this.config.baseUrl}/${this.config.organization}/${this.config.project}/_apis`;
    
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${this.config.personalAccessToken}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Azure DevOps API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Azure DevOps API request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Azure DevOps API response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('Azure DevOps API response error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  // Work Items API
  async getWorkItems(ids, fields = null) {
    try {
      const params = {
        ids: Array.isArray(ids) ? ids.join(',') : ids,
        'api-version': '7.0'
      };
      
      if (fields) {
        params.fields = Array.isArray(fields) ? fields.join(',') : fields;
      }

      const response = await this.client.get('/wit/workitems', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching work items:', error);
      throw error;
    }
  }

  async queryWorkItems(wiql) {
    try {
      const response = await this.client.post('/wit/wiql', {
        query: wiql
      }, {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error('Error querying work items:', error);
      throw error;
    }
  }

  async getCurrentSprintWorkItems() {
    try {
      const wiql = `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
        FROM WorkItems
        WHERE [System.TeamProject] = '${this.config.project}'
        AND [System.IterationPath] UNDER @CurrentIteration
        ORDER BY [System.State] ASC, [System.CreatedDate] DESC
      `;
      
      const queryResult = await this.queryWorkItems(wiql);
      
      if (queryResult.workItems && queryResult.workItems.length > 0) {
        const workItemIds = queryResult.workItems.map(wi => wi.id);
        return await this.getWorkItems(workItemIds);
      }
      
      return { count: 0, value: [] };
    } catch (error) {
      logger.error('Error fetching current sprint work items:', error);
      throw error;
    }
  }

  async getOverdueWorkItems() {
    try {
      const wiql = `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
        FROM WorkItems
        WHERE [System.TeamProject] = '${this.config.project}'
        AND [System.State] NOT IN ('Closed', 'Done', 'Resolved')
        AND [Microsoft.VSTS.Scheduling.DueDate] < @Today
        ORDER BY [Microsoft.VSTS.Scheduling.DueDate] ASC
      `;
      
      const queryResult = await this.queryWorkItems(wiql);
      
      if (queryResult.workItems && queryResult.workItems.length > 0) {
        const workItemIds = queryResult.workItems.map(wi => wi.id);
        return await this.getWorkItems(workItemIds);
      }
      
      return { count: 0, value: [] };
    } catch (error) {
      logger.error('Error fetching overdue work items:', error);
      throw error;
    }
  }

  // Build API
  async getBuild(buildId) {
    try {
      const response = await this.client.get(`/build/builds/${buildId}`, {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching build ${buildId}:`, error);
      throw error;
    }
  }

  async getBuildTimeline(buildId) {
    try {
      const response = await this.client.get(`/build/builds/${buildId}/timeline`, {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching build timeline for ${buildId}:`, error);
      throw error;
    }
  }

  async getBuildLogs(buildId) {
    try {
      const response = await this.client.get(`/build/builds/${buildId}/logs`, {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching build logs for ${buildId}:`, error);
      throw error;
    }
  }

  async getRecentBuilds(top = 10) {
    try {
      const response = await this.client.get('/build/builds', {
        params: {
          'api-version': '7.0',
          '$top': top,
          'statusFilter': 'completed'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching recent builds:', error);
      throw error;
    }
  }

  // Pull Request API
  async getPullRequests(status = 'active') {
    try {
      const response = await this.client.get('/git/pullrequests', {
        params: {
          'api-version': '7.0',
          'searchCriteria.status': status
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching pull requests:', error);
      throw error;
    }
  }

  async getPullRequestDetails(pullRequestId) {
    try {
      const response = await this.client.get(`/git/pullrequests/${pullRequestId}`, {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching pull request ${pullRequestId}:`, error);
      throw error;
    }
  }

  async getIdlePullRequests(hoursThreshold = 48) {
    try {
      const allPRs = await this.getPullRequests('active');
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

      const idlePRs = allPRs.value.filter(pr => {
        const lastActivityDate = new Date(pr.lastMergeCommit?.committer?.date || pr.creationDate);
        return lastActivityDate < thresholdDate;
      });

      return { count: idlePRs.length, value: idlePRs };
    } catch (error) {
      logger.error('Error fetching idle pull requests:', error);
      throw error;
    }
  }

  // Repository API
  async getRepositories() {
    try {
      const response = await this.client.get('/git/repositories', {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching repositories:', error);
      throw error;
    }
  }
}

export const azureDevOpsClient = new AzureDevOpsClient();
