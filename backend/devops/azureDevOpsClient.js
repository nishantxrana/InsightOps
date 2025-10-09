import axios from 'axios';
import { logger } from '../utils/logger.js';
import { getWiqlExcludeCompletedCondition } from '../utils/workItemStates.js';

class AzureDevOpsClient {
  constructor() {
    this.config = null;
    this.orgBaseURL = null;
    this.baseURL = null;
    this.client = null;
    this.orgClient = null;
    this.initialized = false;
  }

  createUserClient(userConfig) {
    const orgBaseURL = `${userConfig.baseUrl}/${encodeURIComponent(userConfig.organization)}/_apis`;
    const baseURL = `${userConfig.baseUrl}/${encodeURIComponent(userConfig.organization)}/${encodeURIComponent(userConfig.project)}/_apis`;
    
    const client = axios.create({
      baseURL: baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${userConfig.pat}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const orgClient = axios.create({
      baseURL: orgBaseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${userConfig.pat}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return new UserAzureDevOpsClient(client, orgClient, userConfig);
  }

  initializeClient() {
    if (this.initialized) return;
    
    // Legacy method for backward compatibility
    this.config = {
      organization: process.env.AZURE_DEVOPS_ORG,
      project: process.env.AZURE_DEVOPS_PROJECT,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT,
      baseUrl: process.env.AZURE_DEVOPS_BASE_URL || 'https://dev.azure.com'
    };
    
    this.orgBaseURL = `${this.config.baseUrl}/${encodeURIComponent(this.config.organization)}/_apis`;
    this.baseURL = `${this.config.baseUrl}/${encodeURIComponent(this.config.organization)}/${encodeURIComponent(this.config.project)}/_apis`;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${this.config.personalAccessToken}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Create axios instance for organization-level APIs
    this.orgClient = axios.create({
      baseURL: this.orgBaseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${this.config.personalAccessToken}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.initialized = true;
    this.setupInterceptors();
  }

  ensureInitialized() {
    if (!this.initialized) {
      this.initializeClient();
    }
  }

  // Add request interceptor for logging
  setupInterceptors() {
    if (!this.client) return;
    
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
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message
        };
        
        // Add specific error messages for common issues
        if (error.response?.status === 401) {
          errorDetails.userMessage = 'Authentication failed. Please check your Personal Access Token.';
        } else if (error.response?.status === 404) {
          errorDetails.userMessage = 'Resource not found. Please check your organization and project names.';
        } else if (error.response?.status === 403) {
          errorDetails.userMessage = 'Access denied. Please check your Personal Access Token permissions.';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          errorDetails.userMessage = 'Cannot connect to Azure DevOps. Please check your internet connection.';
        }
        
        logger.error('Azure DevOps API response error:', errorDetails);
        return Promise.reject(error);
      }
    );
  }

  // Add a method to test the connection
  async testConnection() {
    this.ensureInitialized();
    try {
      logger.info('Testing Azure DevOps connection...');
      // Test organization-level access first
      const orgResponse = await this.orgClient.get('/projects', {
        params: { 'api-version': '7.0' }
      });
      
      // Check if our specific project exists
      const projects = orgResponse.data.value || [];
      const targetProject = projects.find(p => p.name === this.config.project);
      
      if (!targetProject) {
        throw new Error(`Project "${this.config.project}" not found in organization "${this.config.organization}"`);
      }
      
      logger.info('Azure DevOps connection test successful');
      return { 
        success: true, 
        message: `Connection successful. Found project "${this.config.project}" in organization "${this.config.organization}"`,
        projectCount: projects.length
      };
    } catch (error) {
      logger.error('Azure DevOps connection test failed:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check your Personal Access Token.');
      } else if (error.response?.status === 404) {
        throw new Error(`Organization "${this.config.organization}" not found or not accessible.`);
      } else if (error.response?.status === 403) {
        throw new Error('Access denied. Please check your Personal Access Token permissions.');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to Azure DevOps. Please check your internet connection.');
      }
      
      throw new Error(error.message || 'Connection test failed');
    }
  }

  // Work Items API
  async getWorkItems(ids, fields = null) {
    this.ensureInitialized();
    try {
      const params = {
        ids: Array.isArray(ids) ? ids.join(',') : ids,
        'api-version': '7.0'
      };
      
      if (fields) {
        params.fields = Array.isArray(fields) ? fields.join(',') : fields;
      }

      const response = await this.client.get('/wit/workitems', { params });
      
      // Add web URL to each work item
      if (response.data && response.data.value) {
        response.data.value = response.data.value.map(workItem => ({
          ...workItem,
          webUrl: this.constructWorkItemWebUrl(workItem)
        }));
      }
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching work items:', error);
      throw error;
    }
  }

  async queryWorkItems(wiql) {
    this.ensureInitialized();
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

  async getAllCurrentSprintWorkItems() {
    this.ensureInitialized();
    try {
      // Get all work items without pagination for summary calculations
      const wiql = `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
        FROM WorkItems
        WHERE [System.TeamProject] = '${this.config.project}'
        AND [System.IterationPath] = @CurrentIteration
        ORDER BY [System.State] ASC, [System.CreatedDate] DESC
      `;
      
      const queryResult = await this.queryWorkItems(wiql);
      
      if (queryResult.workItems && queryResult.workItems.length > 0) {
        const workItemIds = queryResult.workItems.map(wi => wi.id);
        return await this.getWorkItems(workItemIds);
      }
      
      return { count: 0, value: [] };
    } catch (error) {
      logger.error('Error fetching all current sprint work items:', error);
      throw error;
    }
  }

  async getCurrentSprintWorkItems(page = 1, limit = 50) {
    try {
      logger.info('Fetching current sprint work items', { page, limit });
      
      // Use instance config instead of configLoader
      const config = this.config;
      if (!config || !config.project) {
        throw new Error('Azure DevOps configuration not found or incomplete');
      }
      
      // First try to get work items from current iteration
      const wiql = `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
        FROM WorkItems
        WHERE [System.TeamProject] = '${config.project}'
        AND [System.IterationPath] = @CurrentIteration
        ORDER BY [System.State] ASC, [System.CreatedDate] DESC
      `;
      
      const queryResult = await this.queryWorkItems(wiql);
      
      if (queryResult.workItems && queryResult.workItems.length > 0) {
        const allWorkItemIds = queryResult.workItems.map(wi => wi.id);
        
        // Log total count for monitoring
        logger.info(`Found ${allWorkItemIds.length} work items in current sprint`);
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedIds = allWorkItemIds.slice(startIndex, endIndex);
        
        const workItems = await this.getWorkItems(paginatedIds);
        
        return {
          ...workItems,
          pagination: {
            page,
            limit,
            total: allWorkItemIds.length,
            totalPages: Math.ceil(allWorkItemIds.length / limit),
            hasMore: endIndex < allWorkItemIds.length
          }
        };
      }
      
      // If no items in current iteration, try to get recent work items
      logger.warn('No work items found in current iteration, trying recent work items');
      const recentWiql = `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
        FROM WorkItems
        WHERE [System.TeamProject] = '${this.config.project}'
        AND [System.CreatedDate] >= @Today - 30
        ORDER BY [System.CreatedDate] DESC
      `;
      
      const recentQueryResult = await this.queryWorkItems(recentWiql);
      
      if (recentQueryResult.workItems && recentQueryResult.workItems.length > 0) {
        const allWorkItemIds = recentQueryResult.workItems.map(wi => wi.id);
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedIds = allWorkItemIds.slice(startIndex, endIndex);
        
        const workItems = await this.getWorkItems(paginatedIds);
        
        return {
          ...workItems,
          pagination: {
            page,
            limit,
            total: allWorkItemIds.length,
            totalPages: Math.ceil(allWorkItemIds.length / limit),
            hasMore: endIndex < allWorkItemIds.length
          }
        };
      }
      
      return { 
        count: 0, 
        value: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false
        }
      };
    } catch (error) {
      logger.error('Error fetching current sprint work items:', error);
      throw error;
    }
  }

  async getOverdueWorkItems() {
    this.ensureInitialized();
    try {
      // Query for overdue items across all active iterations, not just current
      const wiql = `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType], [Microsoft.VSTS.Scheduling.DueDate]
        FROM WorkItems
        WHERE [System.TeamProject] = '${this.config.project}'
        AND ${getWiqlExcludeCompletedCondition()}
        AND [Microsoft.VSTS.Scheduling.DueDate] < @Today
        AND [Microsoft.VSTS.Scheduling.DueDate] <> ''
        ORDER BY [Microsoft.VSTS.Scheduling.DueDate] ASC
      `;
      
      logger.debug('Overdue work items query:', wiql);
      
      const queryResult = await this.queryWorkItems(wiql);
      
      logger.debug(`Overdue query returned ${queryResult.workItems?.length || 0} work items`);
      
      if (queryResult.workItems && queryResult.workItems.length > 0) {
        const workItemIds = queryResult.workItems.map(wi => wi.id);
        const detailedItems = await this.getWorkItems(workItemIds);
        logger.debug(`Retrieved details for ${detailedItems.count} overdue items`);
        return detailedItems;
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

  async getBuildDefinition(definitionId) {
    try {
      if (!this.client) {
        throw new Error('Azure DevOps client not initialized - this.client is null');
      }
      const response = await this.client.get(`/build/definitions/${definitionId}`, {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching build definition ${definitionId}:`, error);
      throw error;
    }
  }

  async getRepositoryFile(repositoryId, filePath, branch) {
    try {
      // Remove leading slash if present
      const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      
      const response = await this.client.get(`/git/repositories/${repositoryId}/items`, {
        params: {
          'api-version': '7.0',
          'path': `/${cleanPath}`,
          'versionDescriptor.version': branch,
          'versionDescriptor.versionType': 'branch',
          'includeContent': true
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching repository file ${filePath} from branch ${branch}:`, error);
      throw error;
    }
  }

  async getRecentBuilds(top = 10) {
    this.ensureInitialized();
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
    this.ensureInitialized();
    try {
      const response = await this.client.get('/git/pullrequests', {
        params: {
          'api-version': '7.0',
          'searchCriteria.status': status
        }
      });
      
      // Add web URL to each pull request
      if (response.data && response.data.value) {
        response.data.value = response.data.value.map(pr => ({
          ...pr,
          webUrl: this.constructPullRequestWebUrl(pr)
        }));
      }
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching pull requests:', error);
      throw error;
    }
  }

  /**
   * Construct the web URL for a pull request
   * @param {Object} pullRequest - The pull request object from Azure DevOps API
   * @returns {string} The web URL for the pull request
   */
  constructPullRequestWebUrl(pullRequest) {
    try {
      const organization = this.config.organization;
      const project = pullRequest.repository?.project?.name || this.config.project;
      const repository = pullRequest.repository?.name;
      const pullRequestId = pullRequest.pullRequestId;

      if (!repository || !pullRequestId) {
        logger.warn('Missing repository or pullRequestId for web URL construction', {
          repository,
          pullRequestId,
          prTitle: pullRequest.title
        });
        return pullRequest.url || ''; // Fallback to API URL
      }

      // Encode components for URL safety
      const encodedProject = encodeURIComponent(project);
      const encodedRepository = encodeURIComponent(repository);
      
      return `${this.config.baseUrl}/${organization}/${encodedProject}/_git/${encodedRepository}/pullrequest/${pullRequestId}`;
    } catch (error) {
      logger.error('Error constructing pull request web URL:', error);
      return pullRequest.url || ''; // Fallback to API URL
    }
  }

  /**
   * Construct the web URL for a work item
   * @param {Object} workItem - The work item object from Azure DevOps API
   * @returns {string} The web URL for the work item
   */
  constructWorkItemWebUrl(workItem) {
    try {
      const organization = this.config?.organization;
      const project = workItem.fields?.['System.TeamProject'] || this.config?.project;
      const workItemId = workItem.id;

      if (!organization || !project || !workItemId) {
        logger.warn('Missing required data for web URL construction', {
          hasOrganization: !!organization,
          hasProject: !!project,
          hasWorkItemId: !!workItemId
        });
        return null;
      }

      // Encode components for URL safety
      const encodedProject = encodeURIComponent(project);
      
      return `${this.config.baseUrl}/${organization}/${encodedProject}/_workitems/edit/${workItemId}`;
    } catch (error) {
      logger.error('Error constructing work item web URL:', error);
      return workItem.url || ''; // Fallback to API URL
    }
  }

  async getPullRequestDetails(pullRequestId) {
    try {
      const response = await this.client.get(`/git/pullrequests/${pullRequestId}`, {
        params: { 
          'api-version': '7.0',
          'includeCommits': true,
          'includeWorkItemRefs': true
        }
      });
      
      // Add web URL to the pull request details
      if (response.data) {
        response.data.webUrl = this.constructPullRequestWebUrl(response.data);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching pull request ${pullRequestId}:`, error);
      throw error;
    }
  }

  // async getIdlePullRequests(hoursThreshold = 48) {
  //   try {
  //     const allPRs = await this.getPullRequests('active');
  //     const thresholdDate = new Date();
  //     thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

  //     const idlePRs = allPRs.value.filter(pr => {
  //       const lastActivityDate = new Date(pr.lastMergeCommit?.committer?.date || pr.creationDate);
  //       return lastActivityDate < thresholdDate;
  //     });

  //     return { count: idlePRs.length, value: idlePRs };
  //   } catch (error) {
  //     logger.error('Error fetching idle pull requests:', error);
  //     throw error;
  //   }
  // }

  // adding more comprehensive functions for determining idle pull requests

  /**
   * Get idle pull requests based on activity threshold
   * 
   * BUG: This function uses the PR list API (/git/pullrequests) which has
   * limited commit information. The lastMergeCommit and lastMergeSourceCommit fields are
   * often null/undefined in the list response, causing the function to fall back to 
   * creationDate only, which leads to incorrect idle detection.
   * 
   * FIXME: Idle detection is inaccurate - uses creation date instead of actual last activity
   * 
   * TODO: Implement proper activity date calculation:
   * 1. For each PR, make individual API calls to /git/pullrequests/{id} to get complete
   *    commit information including lastMergeCommit.committer.date
   * 2. Consider fetching recent commits via /git/repositories/{repositoryId}/pullRequests/{pullRequestId}/commits
   * 3. Include PR update activities like comments, reviews, and status changes
   * 4. Add caching mechanism to avoid excessive API calls
   * 
   * TODO: Example of correct implementation:
   * - Get PR list first
   * - For each PR, fetch detailed info: await this.getPullRequest(pr.pullRequestId)
   * - Use all available dates: creationDate, lastMergeCommit.committer.date, 
   *   lastMergeSourceCommit.committer.date, recent comments, etc.
   * 
   * @param {number} hoursThreshold - Hours of inactivity to consider PR as idle (default: 48)
   * @returns {Object} Object with count and array of idle PRs
   */
  async getIdlePullRequests(hoursThreshold = 48) {
  try {
    const allPRs = await this.getPullRequests('active');
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

    const idlePRs = allPRs.value.filter(pr => {
      const activityDates = [
        pr.creationDate,
        pr.lastMergeCommit?.committer?.date,
        pr.lastMergeSourceCommit?.committer?.date,
        pr.closedDate,
      ].filter(date => date != null);

      const lastActivityDate = new Date(Math.max(...activityDates.map(date => new Date(date).getTime())));      
      return lastActivityDate < thresholdDate;
    });

    return { count: idlePRs.length, value: idlePRs };
  } catch (error) {
    logger.error('Error fetching idle pull requests:', error);
    throw error;
  }
}

  async getPullRequestChanges(pullRequestId) {
    try {
      const response = await this.client.get(`/git/pullrequests/${pullRequestId}/changes`, {
        params: { 'api-version': '7.0' }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching PR ${pullRequestId} changes:`, error);
      return { changeEntries: [] };
    }
  }

  async getPullRequestCommits(pullRequestId) {
    try {
      // Try repository-specific endpoint
      const prDetails = await this.getPullRequestDetails(pullRequestId);
      const repositoryId = prDetails.repository?.id;
      
      if (repositoryId) {
        const response = await this.client.get(`/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/commits`, {
          params: { 'api-version': '7.0' }
        });
        return response.data;
      } else {
        // Fallback to project-level endpoint
        const response = await this.client.get(`/git/pullrequests/${pullRequestId}/commits`, {
          params: { 'api-version': '7.0' }
        });
        return response.data;
      }
    } catch (error) {
      logger.error(`Error fetching PR ${pullRequestId} commits:`, error);
      // Return empty commits instead of throwing
      return { value: [] };
    }
  }

  async getPullRequestIterationChanges(pullRequestId, iterationId = 1) {
    try {
      const prDetails = await this.getPullRequestDetails(pullRequestId);
      const repositoryId = prDetails.repository?.id;
      
      if (!repositoryId) {
        throw new Error('Repository ID not found');
      }

      // Get the changes list - this gives us file paths and change types
      const changesResponse = await this.client.get(`/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/iterations/${iterationId}/changes`, {
        params: { 
          'api-version': '7.0',
          '$top': 1000, // Increase limit to get all changes
          'includeContent': false // We don't need content, just the list
        }
      });
      
      logger.info(`Fetched ${changesResponse.data.changeEntries?.length || 0} changes for PR ${pullRequestId}`);
      
      // Process ALL changes to extract useful information
      const processedChanges = (changesResponse.data.changeEntries || []).map(change => {
        const filePath = change.item?.path || 'unknown';
        const changeType = change.changeType || 'edit';
        const isFolder = change.item?.isFolder || false;
        
        // Extract file extension and type
        const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
        const fileType = this.getFileType(fileExtension);
        
        logger.debug(`Processing change: ${changeType} - ${filePath}`, {
          changeType,
          filePath,
          isFolder,
          fileType
        });
        
        return {
          path: filePath,
          changeType: changeType,
          isFolder: isFolder,
          fileExtension: fileExtension,
          fileType: fileType,
          url: change.item?.url
        };
      });
      
      // Calculate summary statistics
      const summary = {
        totalFiles: processedChanges.filter(c => !c.isFolder).length,
        addedFiles: processedChanges.filter(c => !c.isFolder && c.changeType === 'add').length,
        modifiedFiles: processedChanges.filter(c => !c.isFolder && (c.changeType === 'edit' || c.changeType === 'rename')).length,
        deletedFiles: processedChanges.filter(c => !c.isFolder && c.changeType === 'delete').length,
        renamedFiles: processedChanges.filter(c => !c.isFolder && c.changeType === 'rename').length,
        fileTypes: this.groupFilesByType(processedChanges)
      };
      
      logger.info('PR changes summary', {
        pullRequestId,
        ...summary
      });
      
      return {
        ...changesResponse.data,
        changeEntries: processedChanges,
        summary: summary
      };
      
    } catch (error) {
      logger.error(`Error fetching PR ${pullRequestId} iteration changes:`, error);
      return {
        changeEntries: [],
        summary: { totalFiles: 0, addedFiles: 0, modifiedFiles: 0, deletedFiles: 0, renamedFiles: 0, fileTypes: {} }
      };
    }
  }

  getFileType(extension) {
    const typeMap = {
      'js': 'JavaScript', 'jsx': 'React', 'ts': 'TypeScript', 'tsx': 'React TypeScript',
      'py': 'Python', 'java': 'Java', 'cs': 'C#', 'cpp': 'C++', 'c': 'C',
      'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'json': 'JSON',
      'xml': 'XML', 'yml': 'YAML', 'yaml': 'YAML', 'md': 'Markdown',
      'sql': 'SQL', 'txt': 'Text', 'sh': 'Shell', 'bat': 'Batch',
      'dockerfile': 'Docker', 'gitignore': 'Git', 'env': 'Environment'
    };
    return typeMap[extension] || 'Other';
  }

  groupFilesByType(changes) {
    return changes.reduce((acc, change) => {
      if (!change.isFolder) {
        const type = change.fileType;
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {});
  }

  // Alternative method using diffs API
  async getPullRequestDiffs(pullRequestId) {
    try {
      const prDetails = await this.getPullRequestDetails(pullRequestId);
      const repositoryId = prDetails.repository?.id;
      
      if (!repositoryId) {
        throw new Error('Repository ID not found');
      }

      // Get diffs using the diffs API
      const diffsResponse = await this.client.get(`/git/repositories/${repositoryId}/diffs/commits`, {
        params: {
          'api-version': '7.0',
          'baseVersionDescriptor.version': prDetails.targetRefName,
          'baseVersionDescriptor.versionType': 'branch',
          'targetVersionDescriptor.version': prDetails.sourceRefName,
          'targetVersionDescriptor.versionType': 'branch',
          '$top': 100
        }
      });

      return diffsResponse.data;
    } catch (error) {
      logger.error(`Error fetching PR ${pullRequestId} diffs:`, error);
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

class UserAzureDevOpsClient extends AzureDevOpsClient {
  constructor(client, orgClient, config) {
    super();
    this.client = client;
    this.orgClient = orgClient;
    this.config = config;
    this.initialized = true;
  }
}

export const azureDevOpsClient = new AzureDevOpsClient();
