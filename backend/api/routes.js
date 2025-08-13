import express from 'express';
import { logger } from '../utils/logger.js';
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';
import { aiService } from '../ai/aiService.js';
import { configLoader } from '../config/settings.js';

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
    const workItems = await azureDevOpsClient.getCurrentSprintWorkItems();
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
    const workItems = await azureDevOpsClient.getCurrentSprintWorkItems();
    const summary = await aiService.summarizeSprintWorkItems(workItems.value || []);
    
    res.json({
      total: workItems.count || 0,
      active: workItems.value?.filter(wi => wi.fields?.['System.State'] !== 'Closed' && wi.fields?.['System.State'] !== 'Done').length || 0,
      completed: workItems.value?.filter(wi => wi.fields?.['System.State'] === 'Closed' || wi.fields?.['System.State'] === 'Done').length || 0,
      summary,
      workItemsByState: groupWorkItemsByState(workItems.value || []),
      workItemsByAssignee: groupWorkItemsByAssignee(workItems.value || [])
    });
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
    const config = {
      azureDevOps: {
        organization: configLoader.get('azureDevOps.organization'),
        project: configLoader.get('azureDevOps.project'),
        personalAccessToken: '***', // Don't expose the actual token
        baseUrl: configLoader.get('azureDevOps.baseUrl')
      },
      ai: {
        provider: configLoader.get('ai.provider'),
        openaiApiKey: configLoader.get('ai.openaiApiKey') ? '***' : '',
        groqApiKey: configLoader.get('ai.groqApiKey') ? '***' : '',
        model: configLoader.get('ai.model')
      },
      notifications: {
        teamsWebhookUrl: configLoader.get('notifications.teamsWebhookUrl') ? '***' : '',
        slackWebhookUrl: configLoader.get('notifications.slackWebhookUrl') ? '***' : '',
        googleChatWebhookUrl: configLoader.get('notifications.googleChatWebhookUrl') ? '***' : '',
        enabled: configLoader.get('notifications.enabled')
      },
      polling: {
        workItemsInterval: configLoader.get('polling.workItemsInterval'),
        pipelineInterval: configLoader.get('polling.pipelineInterval'),
        pullRequestInterval: configLoader.get('polling.pullRequestInterval'),
        overdueCheckInterval: configLoader.get('polling.overdueCheckInterval')
      }
    };
    res.json(config);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    // In a real implementation, you'd update the configuration
    // For now, just return success
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/settings/test-connection', async (req, res) => {
  try {
    // Test Azure DevOps connection
    const result = await azureDevOpsClient.testConnection();
    res.json({ 
      success: true, 
      message: 'Connection test successful',
      details: result.message
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
function groupWorkItemsByState(workItems) {
  return workItems.reduce((acc, item) => {
    const state = item.fields?.['System.State'] || 'Unknown';
    if (!acc[state]) acc[state] = [];
    acc[state].push({ id: item.id, title: item.fields?.['System.Title'] });
    return acc;
  }, {});
}

function groupWorkItemsByAssignee(workItems) {
  return workItems.reduce((acc, item) => {
    const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
    if (!acc[assignee]) acc[assignee] = [];
    acc[assignee].push({ id: item.id, title: item.fields?.['System.Title'] });
    return acc;
  }, {});
}

export { router as apiRoutes };
