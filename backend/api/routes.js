import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { logger, sanitizeForLogging } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { aiService } from '../ai/aiService.js';
import { authenticate } from '../middleware/auth.js';
import { getUserSettings, updateUserSettings } from '../utils/userSettings.js';
import { AI_MODELS, getModelsForProvider, getDefaultModel } from '../config/aiModels.js';
import { filterActiveWorkItems, filterCompletedWorkItems } from '../utils/workItemStates.js';
import { userPollingManager } from '../polling/userPollingManager.js';
import { validateRequest } from '../middleware/validation.js';
import { settingsSchema, testConnectionSchema } from '../validators/schemas.js';
import { AzureDevOpsReleaseClient } from '../devops/releaseClient.js';
import emergencyRoutes from './emergency.js';

const router = express.Router();

// Health check endpoint (public - no auth required)
router.get('/health', async (req, res) => {
  const serverStartTime = Date.now() - (process.uptime() * 1000);
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    serverStartTime: serverStartTime,
    service: 'Azure DevOps Monitoring InsightOps',
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };

  // Check database connection
  try {
    await mongoose.connection.db.admin().ping();
    health.database = 'connected';
  } catch (error) {
    health.status = 'unhealthy';
    health.database = 'disconnected';
    logger.error('Health check: Database connection failed', error);
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Apply authentication to all other routes
router.use(authenticate);

// User settings endpoints
router.get('/settings', async (req, res) => {
  try {
    const settings = await getUserSettings(req.user._id);
    
    // Return settings with sensitive fields masked for display
    const maskedSettings = {
      azureDevOps: {
        organization: settings.azureDevOps?.organization || '',
        project: settings.azureDevOps?.project || '',
        pat: settings.azureDevOps?.pat ? '***' : '',
        baseUrl: settings.azureDevOps?.baseUrl || 'https://dev.azure.com'
      },
      ai: {
        provider: settings.ai?.provider || 'gemini',
        model: settings.ai?.model || 'gemini-2.0-flash',
        apiKeys: {
          openai: settings.ai?.apiKeys?.openai ? '***' : '',
          groq: settings.ai?.apiKeys?.groq ? '***' : '',
          gemini: settings.ai?.apiKeys?.gemini ? '***' : ''
        }
      },
      notifications: settings.notifications || { enabled: true },
      polling: settings.polling || {
        workItems: '*/10 * * * *',
        pipelines: '0 */10 * * *',
        pullRequests: '0 */10 * * *',
        overdueCheck: '0 */10 * * *'
      }
    };
    
    res.json(maskedSettings);
  } catch (error) {
    logger.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', validateRequest(settingsSchema), async (req, res) => {
  try {
    const updates = { ...req.validatedData };
    
    // Handle masked values - don't update if value is '***'
    if (updates.azureDevOps?.pat === '***') {
      delete updates.azureDevOps.pat;
    }
    
    if (updates.ai?.apiKeys) {
      Object.keys(updates.ai.apiKeys).forEach(key => {
        if (updates.ai.apiKeys[key] === '***') {
          delete updates.ai.apiKeys[key];
        }
      });
    }
    
    const settings = await updateUserSettings(req.user._id, updates);
    
    // Update user polling with new settings if polling settings were updated
    if (updates.polling) {
      logger.info('Polling settings updated - updating user polling configuration');
      await userPollingManager.updateUserPolling(req.user._id, updates);
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/settings/test-connection', validateRequest(testConnectionSchema), async (req, res) => {
  try {
    const { organization, project, pat, baseUrl } = req.validatedData;
    
    logger.info('Testing Azure DevOps connection...', sanitizeForLogging({ organization, project }));
    
    // Test the connection with provided credentials
    const testResult = await testAzureDevOpsConnection({
      organization,
      project, 
      personalAccessToken: pat,
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

// Work Items endpoints
router.get('/projects', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const projects = await client.getAllProjects();
    res.json(projects);
  } catch (error) {
    logger.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/work-items', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const workItems = await client.getCurrentSprintWorkItems(page, limit);
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
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    
    // Get all work items for summary calculations (without pagination)
    const allWorkItems = await client.getAllCurrentSprintWorkItems();
    
    // Use utility functions for consistent state categorization
    const activeItems = filterActiveWorkItems(allWorkItems.value || []);
    const completedItems = filterCompletedWorkItems(allWorkItems.value || []);
    
    // Get overdue items count for dashboard
    let overdueCount = 0;
    try {
      const overdueItems = await client.getOverdueWorkItems();
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
      summary: null, // Will be populated via separate AI endpoint
      summaryStatus: 'available'
    };
    
    // Send immediate response
    res.json(immediateResponse);
    
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
    const userSettings = await getUserSettings(req.user._id);
    
    // Check AI configuration
    if (!userSettings.ai?.provider || !userSettings.ai?.apiKeys) {
      return res.json({ 
        summary: 'AI analysis not available - please configure AI provider in settings.',
        status: 'not_configured'
      });
    }
    
    const hasApiKey = userSettings.ai.apiKeys[userSettings.ai.provider];
    if (!hasApiKey) {
      return res.json({ 
        summary: `AI analysis not available - please configure ${userSettings.ai.provider} API key in settings.`,
        status: 'not_configured'
      });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const allWorkItems = await client.getAllCurrentSprintWorkItems();
    
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
    
    // Initialize AI service with user settings
    aiService.initializeWithUserSettings(userSettings);
    
    // Check cache first (cache by sprint + item count + last update)
    const { cacheManager } = await import('../cache/CacheManager.js');
    const itemIds = allWorkItems.value.map(i => i.id).sort().join(',');
    const cacheKey = `sprint_summary_${itemIds.substring(0, 50)}_${allWorkItems.value.length}`;
    const cached = cacheManager.get('ai', cacheKey);
    
    if (cached) {
      logger.info('Sprint summary cache hit', { itemCount: allWorkItems.value.length });
      return res.json({ summary: cached, status: 'completed', cached: true });
    }
    
    const summary = await aiService.summarizeSprintWorkItems(allWorkItems.value);
    
    // Cache for 30 minutes
    cacheManager.set('ai', cacheKey, summary, 1800);
    
    res.json({ summary, status: 'completed', cached: false });
    
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
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const workItemId = req.params.id;
    
    // Get work item details
    const workItem = await client.getWorkItems([workItemId]);
    
    if (!workItem.value || workItem.value.length === 0) {
      return res.status(404).json({ 
        error: 'Work item not found',
        details: `Work item ${workItemId} not found`
      });
    }
    
    const item = workItem.value[0];
    
    // Check cache first
    const { cacheManager } = await import('../cache/CacheManager.js');
    const cacheKey = `workitem_explain_${workItemId}_${item.rev}`;
    const cached = cacheManager.get('ai', cacheKey);
    
    if (cached) {
      logger.info('Work item explanation cache hit', { workItemId });
      return res.json({
        workItemId: workItemId,
        explanation: cached,
        status: 'completed',
        cached: true
      });
    }
    
    // Use dedicated AI method for detailed work item explanation
    const explanation = await aiService.explainWorkItem(item, userSettings);
    
    // Cache for 1 hour
    cacheManager.set('ai', cacheKey, explanation, 3600);
    
    res.json({
      workItemId: workItemId,
      explanation: explanation,
      status: 'completed',
      cached: false
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
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const overdueItems = await client.getOverdueWorkItems();
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

// Emergency cleanup endpoint (for development/debugging)
router.post('/polling/emergency-cleanup', async (req, res) => {
  try {
    await userPollingManager.emergencyCleanup();
    res.json({ message: 'Emergency cleanup completed' });
  } catch (error) {
    logger.error('Emergency cleanup failed:', error);
    res.status(500).json({ error: 'Emergency cleanup failed' });
  }
});

// Builds endpoints
router.get('/builds/recent', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    // Get limit from query parameter, default to 20, min 10, max 50
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 10), 50);
    const repositoryFilter = req.query.repository;
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    let builds = await client.getRecentBuilds(limit);
    
    // Filter by repository if specified
    if (repositoryFilter && repositoryFilter !== 'all') {
      builds.value = builds.value?.filter(build => 
        build.repository?.name === repositoryFilter ||
        build.definition?.name?.includes(repositoryFilter)
      );
    }
    res.json(builds);
  } catch (error) {
    logger.error('Error fetching recent builds:', error);
    res.status(500).json({ error: 'Failed to fetch recent builds' });
  }
});

router.get('/builds/:buildId', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const build = await client.getBuild(req.params.buildId);
    res.json(build);
  } catch (error) {
    logger.error('Error fetching build details:', error);
    res.status(500).json({ error: 'Failed to fetch build details' });
  }
});

// Build analysis endpoint
router.post('/builds/:buildId/analyze', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const buildId = req.params.buildId;
    
    // Get build details
    const build = await client.getBuild(buildId);
    
    if (!build) {
      return res.status(404).json({ 
        error: 'Build not found',
        details: `Build ${buildId} not found`
      });
    }
    
    // Get timeline and logs for analysis
    const [timeline, logs] = await Promise.all([
      client.getBuildTimeline(buildId),
      client.getBuildLogs(buildId)
    ]);
    
    // Initialize AI service with user settings
    aiService.initializeWithUserSettings(userSettings);
    
    // Initialize FreeModelRouter with user AI config
    const { freeModelRouter } = await import('../ai/FreeModelRouter.js');
    freeModelRouter.initialize(userSettings.ai || {
      provider: userSettings.aiProvider,
      openaiApiKey: userSettings.openaiApiKey,
      groqApiKey: userSettings.groqApiKey,
      geminiApiKey: userSettings.geminiApiKey,
      model: userSettings.aiModel
    });
    
    // Route through agentic system (cache → rules → AI)
    const { monitorAgent } = await import('../agents/MonitorAgent.js');
    const agentResult = await monitorAgent.monitorBuildFailure(build, timeline, logs, client);
    
    // Extract analysis from agent result
    const analysis = agentResult.success 
      ? (agentResult.result?.solution || agentResult.result?.action || 'Analysis completed')
      : 'Analysis failed';
    
    res.json({
      buildId: buildId,
      analysis: analysis,
      status: 'completed',
      agentic: {
        success: agentResult.success,
        method: agentResult.result?.method || 'unknown',
        cacheHit: agentResult.stats?.cacheHits > 0,
        ruleUsed: agentResult.stats?.rulesUsed > 0,
        duration: agentResult.duration
      }
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
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const pullRequests = await client.getPullRequests('active');
    res.json(pullRequests);
  } catch (error) {
    logger.error('Error fetching pull requests:', error);
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
});

router.get('/pull-requests/idle', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const idlePRs = await client.getIdlePullRequests(48);
    res.json(idlePRs);
  } catch (error) {
    logger.error('Error fetching idle pull requests:', error);
    res.status(500).json({ error: 'Failed to fetch idle pull requests' });
  }
});

// Pull Request AI explanation endpoint
router.get('/pull-requests/:id/explain', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    
    if (!userSettings.azureDevOps?.organization || !userSettings.azureDevOps?.pat) {
      return res.status(400).json({ error: 'Azure DevOps configuration required' });
    }
    
    const client = azureDevOpsClient.createUserClient(userSettings.azureDevOps);
    const pullRequestId = req.params.id;
    
    // Get PR details
    const pullRequest = await client.getPullRequestDetails(pullRequestId);
    
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
      changes = await client.getPullRequestIterationChanges(pullRequestId);
    } catch (error) {
      logger.warn('Failed to fetch PR changes:', error.message);
    }

    try {
      commits = await client.getPullRequestCommits(pullRequestId);
    } catch (error) {
      logger.warn('Failed to fetch PR commits:', error.message);
    }

    // Check cache first
    const { cacheManager } = await import('../cache/CacheManager.js');
    const cacheKey = `pr_explain_${pullRequestId}_${pullRequest.lastMergeSourceCommit?.commitId || 'initial'}`;
    const cached = cacheManager.get('ai', cacheKey);
    
    if (cached) {
      logger.info('PR explanation cache hit', { pullRequestId });
      return res.json({
        pullRequestId: pullRequestId,
        explanation: cached,
        changes: changes,
        commits: commits,
        status: 'completed',
        cached: true
      });
    }

    // Generate AI explanation
    const explanation = await aiService.explainPullRequest(pullRequest, changes, commits);
    
    // Cache for 1 hour
    cacheManager.set('ai', cacheKey, explanation, 3600);
    
    res.json({
      pullRequestId: pullRequestId,
      explanation: explanation,
      changes: changes,
      commits: commits,
      status: 'completed',
      cached: false
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

router.get('/ai/models/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userSettings = await getUserSettings(req.user._id);
    
    let models = [];
    let apiKey = null;
    
    // Get API key from correct location
    if (provider === 'openai') {
      apiKey = userSettings.ai?.apiKeys?.openai;
    } else if (provider === 'groq') {
      apiKey = userSettings.ai?.apiKeys?.groq;
    } else if (provider === 'gemini') {
      apiKey = userSettings.ai?.apiKeys?.gemini;
    }
    
    if (provider === 'openai' && apiKey) {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });
      const response = await openai.models.list();
      models = response.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          value: model.id,
          label: model.id.toUpperCase(),
          description: `OpenAI ${model.id}`
        }));
    } else if (provider === 'groq' && apiKey) {
      const { default: Groq } = await import('groq-sdk');
      const groq = new Groq({ apiKey });
      const response = await groq.models.list();
      models = response.data.map(model => ({
        value: model.id,
        label: model.id,
        description: `Groq ${model.id}`
      }));
    } else if (provider === 'gemini' && apiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        models = data.models
          .filter(model => {
            const supportedMethods = model.supportedGenerationMethods || [];
            const modelId = model.name.replace('models/', '');
            return supportedMethods.includes('generateContent') && 
                   !modelId.toLowerCase().includes('embedding') &&
                   !modelId.toLowerCase().includes('aqa');
          })
          .map(model => ({
            value: model.name.replace('models/', ''),
            label: model.displayName || model.name.replace('models/', ''),
            description: model.description || `Google ${model.name.replace('models/', '')}`
          }));
      }
    } else {
      // Fallback to static models
      models = getModelsForProvider(provider);
    }
    
    const defaultModel = getDefaultModel(provider);
    
    if (models.length === 0) {
      return res.status(400).json({
        success: false,
        error: `No models available for provider: ${provider}`
      });
    }
    
    res.json({
      success: true,
      provider,
      models,
      defaultModel,
      source: apiKey ? 'live' : 'static'
    });
  } catch (error) {
    logger.error('Error fetching AI models:', error);
    // Fallback to static models on error
    const models = getModelsForProvider(req.params.provider);
    res.json({
      success: true,
      provider: req.params.provider,
      models,
      defaultModel: getDefaultModel(req.params.provider),
      source: 'static'
    });
  }
});

router.get('/ai/config', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user._id);
    
    // Don't expose API keys in the response
    const safeConfig = {
      provider: userSettings.ai?.provider || 'gemini',
      model: userSettings.ai?.model || 'gemini-2.0-flash',
      hasOpenAIKey: !!(userSettings.ai?.apiKeys?.openai),
      hasGroqKey: !!(userSettings.ai?.apiKeys?.groq),
      hasGeminiKey: !!(userSettings.ai?.apiKeys?.gemini)
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

// Get user-specific webhook URLs
router.get('/webhooks/urls', async (req, res) => {
  try {
    const userId = req.user._id;
    // Check for X-Forwarded-Proto header for proper HTTPS detection behind reverse proxy
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const baseUrl = `${protocol}://${req.get('host')}`;
    
    const webhookUrls = {
      buildCompleted: `${baseUrl}/api/webhooks/${userId}/build/completed`,
      pullRequestCreated: `${baseUrl}/api/webhooks/${userId}/pullrequest/created`,
      pullRequestUpdated: `${baseUrl}/api/webhooks/${userId}/pullrequest/updated`,
      workItemCreated: `${baseUrl}/api/webhooks/${userId}/workitem/created`,
      workItemUpdated: `${baseUrl}/api/webhooks/${userId}/workitem/updated`
    };
    
    res.json({
      success: true,
      webhookUrls
    });
  } catch (error) {
    logger.error('Error generating webhook URLs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate webhook URLs'
    });
  }
});

// Emergency routes
router.use('/emergency', emergencyRoutes);

// Cache and performance stats routes
import cacheStatsRoutes from './cacheStats.js';
router.use('/performance', cacheStatsRoutes);

// Agent dashboard routes
import agentDashboardRoutes from './agentDashboard.js';
router.use('/agent-dashboard', agentDashboardRoutes);

// Releases endpoints
router.get('/releases', async (req, res) => {
  try {
    const { limit = 20, environment, status, definitionId, fromDate, toDate } = req.query;
    const userSettings = await getUserSettings(req.user.id);
    
    if (!userSettings?.azureDevOps?.organization || !userSettings?.azureDevOps?.project || !userSettings?.azureDevOps?.pat) {
      return res.status(400).json({
        success: false,
        error: 'Azure DevOps configuration is incomplete'
      });
    }

    const releaseClient = new AzureDevOpsReleaseClient(
      userSettings.azureDevOps.organization,
      userSettings.azureDevOps.project,
      userSettings.azureDevOps.pat,
      userSettings.azureDevOps.baseUrl
    );

    const options = {
      top: parseInt(limit),
      definitionId: definitionId ? parseInt(definitionId) : undefined,
      statusFilter: status,
      minCreatedTime: fromDate,
      maxCreatedTime: toDate
    };

    try {
      const azureResponse = await releaseClient.getReleases(options);
      const releases = azureResponse.value || [];

      // Transform Azure DevOps data to our format
      const transformedReleases = releases.map(release => ({
        id: release.id,
        name: release.name,
        definitionName: release.releaseDefinition?.name || 'Unknown',
        status: release.status?.toLowerCase() || 'unknown',
        createdOn: release.createdOn,
        organization: userSettings.azureDevOps.organization,
        project: userSettings.azureDevOps.project,
        createdBy: {
          displayName: release.createdBy?.displayName || 'Unknown',
          uniqueName: release.createdBy?.uniqueName || ''
        },
        environments: (release.environments || []).map(env => ({
          id: env.id,
          name: env.name,
          status: env.status?.toLowerCase() || 'unknown',
          deployedOn: env.preDeployApprovals?.[0]?.createdOn || env.createdOn,
          rank: env.rank
        })).sort((a, b) => a.rank - b.rank),
        artifacts: (release.artifacts || []).map(artifact => ({
          alias: artifact.alias,
          type: artifact.type,
          definitionReference: artifact.definitionReference
        }))
      }));
      
      res.json({
        success: true,
        data: {
          releases: transformedReleases,
          total: releases.length,
          hasMore: releases.length >= parseInt(limit)
        }
      });
    } catch (apiError) {
      // If 404, likely no release pipelines exist
      if (apiError.response?.status === 404) {
        logger.info('No release pipelines found for project');
        res.json({
          success: true,
          data: {
            releases: [],
            total: 0,
            hasMore: false
          }
        });
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    logger.error('Error fetching releases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch releases'
    });
  }
});

router.get('/releases/stats', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user.id);
    
    if (!userSettings?.azureDevOps?.organization || !userSettings?.azureDevOps?.project || !userSettings?.azureDevOps?.pat) {
      return res.status(400).json({
        success: false,
        error: 'Azure DevOps configuration is incomplete'
      });
    }

    const releaseClient = new AzureDevOpsReleaseClient(
      userSettings.azureDevOps.organization,
      userSettings.azureDevOps.project,
      userSettings.azureDevOps.pat,
      userSettings.azureDevOps.baseUrl
    );

    // Get recent releases for statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const [releasesResponse, approvalsResponse] = await Promise.all([
        releaseClient.getReleases({ 
          top: 100, 
          minCreatedTime: thirtyDaysAgo.toISOString() 
        }),
        releaseClient.getPendingApprovals().catch(() => ({ value: [] })) // Fallback for approvals
      ]);

      const releases = releasesResponse.value || [];
      const approvals = approvalsResponse.value || [];

      // Calculate statistics
      const totalReleases = releases.length;
      const succeededReleases = releases.filter(r => r.status === 'succeeded').length;
      const successRate = totalReleases > 0 ? Math.round((succeededReleases / totalReleases) * 100) : 0;
      const pendingApprovals = approvals.length;
      const activeDeployments = releases.filter(r => r.status === 'inProgress').length;

      // Environment statistics
      const environmentStats = {};
      releases.forEach(release => {
        (release.environments || []).forEach(env => {
          if (!environmentStats[env.name]) {
            environmentStats[env.name] = { total: 0, success: 0, failed: 0 };
          }
          environmentStats[env.name].total++;
          if (env.status === 'succeeded') {
            environmentStats[env.name].success++;
          } else if (env.status === 'failed' || env.status === 'rejected') {
            environmentStats[env.name].failed++;
          }
        });
      });

      const stats = {
        totalReleases,
        successRate,
        pendingApprovals,
        activeDeployments,
        environmentStats
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (apiError) {
      // If 404, likely no release pipelines exist
      if (apiError.response?.status === 404) {
        logger.info('No release pipelines found for project stats');
        res.json({
          success: true,
          data: {
            totalReleases: 0,
            successRate: 0,
            pendingApprovals: 0,
            activeDeployments: 0,
            environmentStats: {}
          }
        });
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    logger.error('Error fetching release stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch release statistics'
    });
  }
});

router.get('/releases/definitions', async (req, res) => {
  try {
    // TODO: Fetch release definitions from Azure DevOps
    const definitions = [];
    
    res.json({
      success: true,
      data: definitions
    });
  } catch (error) {
    logger.error('Error fetching release definitions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch release definitions'
    });
  }
});

router.get('/releases/approvals', async (req, res) => {
  try {
    // TODO: Fetch pending approvals from Azure DevOps
    const approvals = [];
    
    res.json({
      success: true,
      data: approvals
    });
  } catch (error) {
    logger.error('Error fetching release approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch release approvals'
    });
  }
});

router.get('/releases/ai-analysis', async (req, res) => {
  try {
    const userSettings = await getUserSettings(req.user.id);
    
    if (!userSettings?.azureDevOps?.organization || !userSettings?.azureDevOps?.project || !userSettings?.azureDevOps?.pat) {
      return res.status(400).json({
        success: false,
        error: 'Azure DevOps configuration is incomplete'
      });
    }

    const releaseClient = new AzureDevOpsReleaseClient(
      userSettings.azureDevOps.organization,
      userSettings.azureDevOps.project,
      userSettings.azureDevOps.pat,
      userSettings.azureDevOps.baseUrl
    );

    try {
      // Get recent releases for analysis (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const releasesResponse = await releaseClient.getReleases({ 
        top: 50, 
        minCreatedTime: thirtyDaysAgo.toISOString() 
      });

      const releases = releasesResponse.value || [];

      if (releases.length === 0) {
        return res.json({
          success: true,
          data: {
            summary: "No recent releases found for analysis.",
            insights: [],
            recommendations: []
          }
        });
      }

      // Prepare data for AI analysis
      const analysisData = {
        totalReleases: releases.length,
        timeframe: "last 30 days",
        releases: releases.map(release => ({
          name: release.name,
          status: release.status,
          createdOn: release.createdOn,
          environments: (release.environments || []).map(env => ({
            name: env.name,
            status: env.status,
            rank: env.rank
          }))
        }))
      };

      // Generate AI analysis
      const aiPrompt = `Analyze the following Azure DevOps release data and provide insights:

${JSON.stringify(analysisData, null, 2)}

Please provide:
1. A brief summary of release patterns and trends
2. Key insights about deployment success rates and environment health
3. Specific recommendations for improving release processes

Keep the response concise and actionable. Focus on practical insights that would help a DevOps team.`;

      const messages = [
        {
          role: 'user',
          content: aiPrompt
        }
      ];

      // Initialize AI service with user settings
      aiService.initializeWithUserSettings(userSettings);
      const aiAnalysis = await aiService.generateCompletion(messages);

      res.json({
        success: true,
        data: {
          summary: aiAnalysis,
          generatedAt: new Date().toISOString(),
          dataPoints: releases.length
        }
      });

    } catch (apiError) {
      if (apiError.response?.status === 404) {
        res.json({
          success: true,
          data: {
            summary: "No release pipelines found for analysis.",
            insights: [],
            recommendations: []
          }
        });
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    logger.error('Error generating AI release analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI analysis'
    });
  }
});

export { router as apiRoutes };
