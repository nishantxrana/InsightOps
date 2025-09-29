import express from 'express';
import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { aiService } from '../ai/aiService.js';
import { configLoader } from '../config/settings.js';
import { AI_MODELS, getModelsForProvider, getDefaultModel } from '../config/aiModels.js';
import { filterActiveWorkItems, filterCompletedWorkItems } from '../utils/workItemStates.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'Azure DevOps Monitoring Agent'
  });
});

// Work Items endpoints
router.get('/work-items', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per page
    
    const workItems = await azureDevOpsClient.getCurrentSprintWorkItems(page, limit);
    res.json(workItems);
  } catch (error) {
    logger.error('Error fetching work items:', error);
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Failed to fetch work items';
    res.status(statusCode).json({ 
      error: 'Failed to fetch work items',
      details: message,
      suggestion: statusCode === 401 ? 'Please check your Azure DevOps credentials' : 
                 statusCode === 404 ? 'Please check your organization and project names' :
                 'Please check your Azure DevOps configuration'
    });
  }
});

router.get('/work-items/sprint-summary', async (req, res) => {
  try {
    // Get all work items for summary calculations (without pagination)
    const allWorkItems = await azureDevOpsClient.getAllCurrentSprintWorkItems();
    
    // Use utility functions for consistent state categorization
    const activeItems = filterActiveWorkItems(allWorkItems.value || []);
    const completedItems = filterCompletedWorkItems(allWorkItems.value || []);
    
    // Get overdue items count for dashboard
    let overdueCount = 0;
    try {
      const overdueItems = await azureDevOpsClient.getOverdueWorkItems();
      overdueCount = overdueItems.count || 0;
    } catch (error) {
      logger.warn('Failed to fetch overdue items for summary:', error.message);
    }
    
    // Prepare immediate response
    const immediateResponse = {
      total: allWorkItems.count || 0,
      active: activeItems.length,
      completed: completedItems.length,
      overdue: overdueCount, // Add overdue count for dashboard
      workItemsByState: groupWorkItemsByState(allWorkItems.value || []),
      workItemsByAssignee: groupWorkItemsByAssignee(allWorkItems.value || []),
      summary: null, // Will be populated async
      summaryStatus: 'processing'
    };
    
    // Send immediate response
    res.json(immediateResponse);
    
    // Process AI summary asynchronously (don't await)
    if (allWorkItems.value && allWorkItems.value.length > 0) {
      processAISummaryAsync(allWorkItems.value)
        .then(summary => {
          // Store summary in cache or database for later retrieval
          logger.info('AI summary generated successfully', { 
            itemCount: allWorkItems.value.length,
            summaryLength: summary.length 
          });
          // TODO: Store summary in cache/database
        })
        .catch(error => {
          logger.error('Error generating AI summary:', error);
        });
    }
    
  } catch (error) {
    logger.error('Error fetching sprint summary:', error);
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Failed to fetch sprint summary';
    res.status(statusCode).json({ 
      error: 'Failed to fetch sprint summary',
      details: message,
      suggestion: statusCode === 401 ? 'Please check your Azure DevOps credentials' : 
                 statusCode === 404 ? 'Please check your organization and project names' :
                 'Please check your Azure DevOps configuration'
    });
  }
});

// New endpoint for AI summary
router.get('/work-items/ai-summary', async (req, res) => {
  try {
    const allWorkItems = await azureDevOpsClient.getAllCurrentSprintWorkItems();
    
    if (!allWorkItems.value || allWorkItems.value.length === 0) {
      return res.json({ summary: 'No work items found in current sprint.' });
    }
    
    // Check if dataset is too large for real-time processing
    if (allWorkItems.value.length > 100) {
      return res.json({ 
        summary: `Sprint contains ${allWorkItems.value.length} items. AI analysis is disabled for large datasets to maintain performance. Consider breaking into smaller sprints.`,
        status: 'disabled_large_dataset'
      });
    }
    
    const summary = await aiService.summarizeSprintWorkItems(allWorkItems.value);
    res.json({ summary, status: 'completed' });
    
  } catch (error) {
    logger.error('Error generating AI summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI summary',
      details: error.message,
      status: 'error'
    });
  }
});

// Work item AI explanation endpoint 
router.get('/work-items/:id/explain', async (req, res) => {
  try {
    const workItemId = req.params.id;
    
    // Get work item details
    const workItem = await azureDevOpsClient.getWorkItems([workItemId]);
    
    if (!workItem.value || workItem.value.length === 0) {
      return res.status(404).json({ 
        error: 'Work item not found',
        details: `Work item ${workItemId} not found`
      });
    }
    
    const item = workItem.value[0];
    
    // Use dedicated AI method for detailed work item explanation
    const explanation = await aiService.explainWorkItem(item);
    
    res.json({
      workItemId: workItemId,
      explanation: explanation,
      status: 'completed'
    });
    
  } catch (error) {
    logger.error('Error generating work item explanation:', error);
    res.status(500).json({ 
      error: 'Failed to generate work item explanation',
      details: error.message,
      status: 'error'
    });
  }
});
async function processAISummaryAsync(workItems) {
  try {
    if (workItems.length > 100) {
      logger.info('Skipping AI summary for large dataset', { count: workItems.length });
      return `Sprint contains ${workItems.length} items. AI analysis is disabled for large datasets.`;
    }
    
    const summary = await aiService.summarizeSprintWorkItems(workItems);
    return summary;
  } catch (error) {
    logger.error('Error in async AI processing:', error);
    throw error;
  }
}

router.get('/work-items/overdue', async (req, res) => {
  try {
    const overdueItems = await azureDevOpsClient.getOverdueWorkItems();
    res.json(overdueItems);
  } catch (error) {
    logger.error('Error fetching overdue items:', error);
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Failed to fetch overdue items';
    res.status(statusCode).json({ 
      error: 'Failed to fetch overdue items',
      details: message,
      suggestion: statusCode === 401 ? 'Please check your Azure DevOps credentials' : 
                 statusCode === 404 ? 'Please check your organization and project names' :
                 'Please check your Azure DevOps configuration'
    });
  }
});

// Builds endpoints
router.get('/builds/recent', async (req, res) => {
  try {
    const builds = await azureDevOpsClient.getRecentBuilds(20);
    res.json(builds);
  } catch (error) {
    logger.error('Error fetching recent builds:', error);
    res.status(500).json({ error: 'Failed to fetch recent builds' });
  }
});

router.get('/builds/:buildId', async (req, res) => {
  try {
    const build = await azureDevOpsClient.getBuild(req.params.buildId);
    res.json(build);
  } catch (error) {
    logger.error('Error fetching build details:', error);
    res.status(500).json({ error: 'Failed to fetch build details' });
  }
});

// Build analysis endpoint
router.post('/builds/:buildId/analyze', async (req, res) => {
  try {
    const buildId = req.params.buildId;
    
    // Get build details
    const build = await azureDevOpsClient.getBuild(buildId);
    
    if (!build) {
      return res.status(404).json({ 
        error: 'Build not found',
        details: `Build ${buildId} not found`
      });
    }
    
    // Get timeline and logs for analysis
    const [timeline, logs] = await Promise.all([
      azureDevOpsClient.getBuildTimeline(buildId),
      azureDevOpsClient.getBuildLogs(buildId)
    ]);
    
    // Generate AI analysis
    const analysis = await aiService.summarizeBuildFailure(build, timeline, logs);
    
    res.json({
      buildId: buildId,
      analysis: analysis,
      status: 'completed'
    });
    
  } catch (error) {
    logger.error('Error analyzing build:', error);
    res.status(500).json({ 
      error: 'Failed to analyze build',
      details: error.message,
      status: 'error'
    });
  }
});

// Pull Requests endpoints
router.get('/pull-requests', async (req, res) => {
  try {
    const pullRequests = await azureDevOpsClient.getPullRequests('active');
    res.json(pullRequests);
  } catch (error) {
    logger.error('Error fetching pull requests:', error);
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
});

router.get('/pull-requests/idle', async (req, res) => {
  try {
    const idlePRs = await azureDevOpsClient.getIdlePullRequests(48);
    res.json(idlePRs);
  } catch (error) {
    logger.error('Error fetching idle pull requests:', error);
    res.status(500).json({ error: 'Failed to fetch idle pull requests' });
  }
});

// Pull Request AI explanation endpoint
router.get('/pull-requests/:id/explain', async (req, res) => {
  try {
    const pullRequestId = req.params.id;
    
    // Get PR details
    const pullRequest = await azureDevOpsClient.getPullRequestDetails(pullRequestId);
    
    if (!pullRequest) {
      return res.status(404).json({ 
        error: 'Pull request not found',
        details: `Pull request ${pullRequestId} not found`
      });
    }

    // Get PR changes and commits for better analysis (don't fail if unavailable)
    let changes = null;
    let commits = null;
    
    try {
      changes = await azureDevOpsClient.getPullRequestIterationChanges(pullRequestId);
    } catch (error) {
      logger.warn('Failed to fetch PR changes:', error.message);
    }

    try {
      commits = await azureDevOpsClient.getPullRequestCommits(pullRequestId);
    } catch (error) {
      logger.warn('Failed to fetch PR commits:', error.message);
    }

    // Generate AI explanation
    const explanation = await aiService.explainPullRequest(pullRequest, changes, commits);
    
    res.json({
      pullRequestId: pullRequestId,
      explanation: explanation,
      changes: changes,
      commits: commits,
      status: 'completed'
    });
    
  } catch (error) {
    logger.error('Error generating pull request explanation:', error);
    res.status(500).json({ 
      error: 'Failed to generate pull request explanation',
      details: error.message,
      status: 'error'
    });
  }
});

// Get PR changes with diffs
// Logs endpoint
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    // This is a mock implementation - in a real app, you'd read from log files
    res.json({
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          service: 'system',
          message: 'Application started successfully'
        }
      ]
    });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Settings endpoints
router.get('/settings', async (req, res) => {
  try {
    const runtimeSettings = configLoader.getRuntimeSettings();
    
    // Return settings with sensitive fields masked
    const maskedSettings = {
      azureDevOps: {
        organization: runtimeSettings.azureDevOps?.organization || '',
        project: runtimeSettings.azureDevOps?.project || '',
        personalAccessToken: (runtimeSettings.azureDevOps?.personalAccessToken && runtimeSettings.azureDevOps.personalAccessToken.length > 0) ? '***' : '',
        baseUrl: runtimeSettings.azureDevOps?.baseUrl || 'https://dev.azure.com'
      },
      ai: {
        provider: runtimeSettings.ai?.provider || 'openai',
        openaiApiKey: (runtimeSettings.ai?.openaiApiKey && runtimeSettings.ai.openaiApiKey.length > 0) ? '***' : '',
        groqApiKey: (runtimeSettings.ai?.groqApiKey && runtimeSettings.ai.groqApiKey.length > 0) ? '***' : '',
        geminiApiKey: (runtimeSettings.ai?.geminiApiKey && runtimeSettings.ai.geminiApiKey.length > 0) ? '***' : '',
        model: runtimeSettings.ai?.model || 'gpt-3.5-turbo'
      },
      notifications: {
        teamsWebhookUrl: runtimeSettings.notifications?.teamsWebhookUrl ? '***' : '',
        slackWebhookUrl: runtimeSettings.notifications?.slackWebhookUrl ? '***' : '',
        googleChatWebhookUrl: runtimeSettings.notifications?.googleChatWebhookUrl ? '***' : '',
        teamsEnabled: runtimeSettings.notifications?.teamsEnabled || false,
        slackEnabled: runtimeSettings.notifications?.slackEnabled || false,
        googleChatEnabled: runtimeSettings.notifications?.googleChatEnabled || false,
        enabled: runtimeSettings.notifications?.enabled || false
      },
      polling: {
        workItemsInterval: runtimeSettings.polling?.workItemsInterval || '0 */1 * * *',
        pipelineInterval: runtimeSettings.polling?.pipelineInterval || '0 */1 * * *',
        pullRequestInterval: runtimeSettings.polling?.pullRequestInterval || '0 */1 * * *',
        overdueCheckInterval: runtimeSettings.polling?.overdueCheckInterval || '0 9 * * *'
      }
    };
    
    
    res.json(maskedSettings);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const newSettings = req.body;
    
    // Get current runtime settings
    const currentSettings = configLoader.getRuntimeSettings();
    
    // Merge new settings with current ones, handling masked values
    const mergedSettings = {
      azureDevOps: {
        ...currentSettings.azureDevOps,
        ...newSettings.azureDevOps,
        // Don't overwrite PAT if it's masked
        personalAccessToken: newSettings.azureDevOps?.personalAccessToken === '***' 
          ? currentSettings.azureDevOps?.personalAccessToken || ''
          : newSettings.azureDevOps?.personalAccessToken || ''
      },
      ai: {
        ...currentSettings.ai,
        ...newSettings.ai,
        // Don't overwrite API keys if they're masked
        openaiApiKey: newSettings.ai?.openaiApiKey === '***'
          ? currentSettings.ai?.openaiApiKey || ''
          : newSettings.ai?.openaiApiKey || '',
        groqApiKey: newSettings.ai?.groqApiKey === '***'
          ? currentSettings.ai?.groqApiKey || ''
          : newSettings.ai?.groqApiKey || '',
        geminiApiKey: newSettings.ai?.geminiApiKey === '***'
          ? currentSettings.ai?.geminiApiKey || ''
          : newSettings.ai?.geminiApiKey || ''
      },
      notifications: {
        ...currentSettings.notifications,
        ...newSettings.notifications
      },
      polling: {
        ...currentSettings.polling,
        ...newSettings.polling
      }
    };
    
    // Don't update fields that are masked (contain '***')
    for (const section in newSettings) {
      for (const field in newSettings[section]) {
        if (newSettings[section][field] === '***') {
          // Keep the current value for masked fields
          if (currentSettings[section] && currentSettings[section][field]) {
            mergedSettings[section][field] = currentSettings[section][field];
          }
        }
      }
    }
    
    // Update runtime settings (this will encrypt sensitive fields and notify services)
    await configLoader.updateRuntimeSettings(mergedSettings);
    
    res.json({ 
      message: 'Settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ 
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

router.post('/settings/test-connection', async (req, res) => {
  try {
    const { organization, project, personalAccessToken, baseUrl } = req.body;
    
    console.log('Received test request:', {
      organization: organization || 'EMPTY',
      project: project || 'EMPTY', 
      hasToken: !!personalAccessToken,
      baseUrl: baseUrl || 'EMPTY'
    });
    
    // Validate required fields
    if (!organization || !project || !personalAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Organization, project, and personal access token are required'
      });
    }
    
    logger.info('Testing Azure DevOps connection...');
    
    // Test the connection with provided credentials
    const testResult = await testAzureDevOpsConnection({
      organization,
      project, 
      personalAccessToken,
      baseUrl: baseUrl || 'https://dev.azure.com'
    });
    
    res.json({ 
      success: true, 
      message: 'Connection test successful',
      details: testResult.message
    });
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Connection test failed: ' + error.message 
    });
  }
});

// Helper functions
async function testAzureDevOpsConnection(config) {
  try {
    const axios = (await import('axios')).default;
    
    const org = config.organization.trim();
    const baseURL = `${config.baseUrl}/${encodeURIComponent(org)}/_apis`;
    const authHeader = `Basic ${Buffer.from(`:${config.personalAccessToken}`).toString('base64')}`;
    
    logger.info('Testing connection to:', { org, baseURL: `${baseURL}/projects` });
    
    const response = await axios.get(`${baseURL}/projects`, {
      headers: {
        'Authorization': authHeader
      },
      params: {
        'api-version': '7.0'
      },
      timeout: 10000
    });
    
    logger.info('API Response:', {
      status: response.status,
      dataKeys: Object.keys(response.data || {}),
      hasValue: !!response.data?.value,
      valueLength: response.data?.value?.length || 0,
      rawData: response.data
    });
    
    const projects = response.data.value || [];
    logger.info(`Found ${projects.length} projects`);
    
    if (projects.length === 0) {
      throw new Error(`No projects found in organization "${org}". Check: 1) Organization name is correct, 2) PAT token has 'Project and Team (read)' permissions, 3) You have access to this organization`);
    }
    
    // Check if project exists (case-insensitive)
    const projectName = config.project.trim();
    const projectExists = projects.some(p => 
      p.name.toLowerCase() === projectName.toLowerCase()
    );
    
    if (!projectExists) {
      const availableProjects = projects.map(p => p.name).join(', ');
      throw new Error(`Project "${projectName}" not found. Available projects: ${availableProjects}`);
    }
    
    return {
      success: true,
      message: `Connected successfully! Found project "${projectName}" in organization "${org}"`
    };
    
  } catch (error) {
    logger.error('Connection test error:', error.message);
    
    if (error.response?.status === 400) {
      throw new Error(`Invalid organization "${config.organization}". Check the organization name.`);
    } else if (error.response?.status === 401) {
      throw new Error('Invalid PAT token or insufficient permissions. Make sure your PAT has "Project and Team (read)" permissions.');
    } else if (error.response?.status === 403) {
      throw new Error(`Access denied to organization "${config.organization}". Check PAT permissions and organization access.`);
    } else if (error.response?.status === 404) {
      throw new Error(`Organization "${config.organization}" not found. Verify the organization name.`);
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Unable to connect to Azure DevOps. Check your internet connection.');
    } else {
      throw new Error(error.message || 'Connection test failed');
    }
  }
}

function groupWorkItemsByState(workItems) {
  return workItems.reduce((acc, item) => {
    const state = item.fields?.['System.State'] || 'Unknown';
    if (!acc[state]) acc[state] = [];
    // Include full work item data for modal
    acc[state].push(item);
    return acc;
  }, {});
}

function groupWorkItemsByAssignee(workItems) {
  return workItems.reduce((acc, item) => {
    const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
    if (!acc[assignee]) acc[assignee] = [];
    // Include full work item data for modal
    acc[assignee].push(item);
    return acc;
  }, {});
}

// AI Configuration endpoints
router.get('/ai/providers', (req, res) => {
  try {
    const providers = [
      { value: 'openai', label: 'OpenAI', description: 'GPT models from OpenAI' },
      { value: 'groq', label: 'Groq', description: 'Fast inference with open models' },
      { value: 'gemini', label: 'Google Gemini', description: 'Google\'s latest AI models' }
    ];
    
    res.json({
      success: true,
      providers
    });
  } catch (error) {
    logger.error('Error fetching AI providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI providers'
    });
  }
});

router.get('/ai/models/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const models = getModelsForProvider(provider);
    const defaultModel = getDefaultModel(provider);
    
    if (models.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Unsupported provider: ${provider}`
      });
    }
    
    res.json({
      success: true,
      provider,
      models,
      defaultModel
    });
  } catch (error) {
    logger.error('Error fetching AI models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI models'
    });
  }
});

router.get('/ai/config', (req, res) => {
  try {
    const config = configLoader.getAIConfig();
    
    // Don't expose API keys in the response
    const safeConfig = {
      provider: config.provider,
      model: config.model,
      hasOpenAIKey: !!config.openaiApiKey,
      hasGroqKey: !!config.groqApiKey,
      hasGeminiKey: !!config.geminiApiKey
    };
    
    res.json({
      success: true,
      config: safeConfig
    });
  } catch (error) {
    logger.error('Error fetching AI config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI configuration'
    });
  }
});

export { router as apiRoutes };
