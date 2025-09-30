import Joi from 'joi';
import { logger } from '../utils/logger.js';
import { env } from './env.js';
import { runtimeSettings } from './runtimeSettings.js';

class ConfigLoader {
  constructor() {
    this.config = {};
    this.initialized = false;
    this.changeListeners = [];
  }

  async initialize() {
    if (this.initialized) return;
    
    // Load runtime settings first
    await runtimeSettings.load();
    
    // Build merged configuration
    this.buildConfig();
    
    this.initialized = true;
    logger.info('Configuration initialized successfully');
  }

  buildConfig() {
    // Get runtime settings (user configuration)
    const runtime = runtimeSettings.get() || {};
    
    // Smart defaults with environment variable fallbacks
    const defaults = {
      azureDevOps: {
        organization: env.AZURE_DEVOPS_ORG || '',
        project: env.AZURE_DEVOPS_PROJECT || '',
        personalAccessToken: env.AZURE_DEVOPS_PAT || '',
        baseUrl: env.AZURE_DEVOPS_BASE_URL || 'https://dev.azure.com'
      },
      ai: {
        provider: 'openai',
        openaiApiKey: '',
        groqApiKey: '',
        geminiApiKey: '',
        model: 'gpt-3.5-turbo'
      },
      notifications: {
        teamsWebhookUrl: '',
        slackWebhookUrl: '',
        googleChatWebhookUrl: '',
        teamsEnabled: false,
        slackEnabled: false,
        googleChatEnabled: false,
        enabled: false
      },
      polling: {
        workItemsInterval: '0 */1 * * *',     // Every hour
        pipelineInterval: '0 */1 * * *',      // Every hour  
        pullRequestInterval: '0 */1 * * *',   // Every hour
        overdueCheckInterval: '0 9 * * *'     // Daily at 9 AM
      }
    };

    // Priority: Runtime Settings > Defaults > Env Vars (only for deployment config)
    this.config = {
      // Azure DevOps Configuration (Runtime settings override defaults)
      azureDevOps: {
        organization: runtime.azureDevOps?.organization || defaults.azureDevOps.organization,
        project: runtime.azureDevOps?.project || defaults.azureDevOps.project,
        personalAccessToken: runtime.azureDevOps?.personalAccessToken || defaults.azureDevOps.personalAccessToken,
        baseUrl: runtime.azureDevOps?.baseUrl || defaults.azureDevOps.baseUrl
      },
      
      // AI Configuration (Runtime settings override defaults)
      ai: {
        provider: runtime.ai?.provider || defaults.ai.provider,
        openaiApiKey: runtime.ai?.openaiApiKey || defaults.ai.openaiApiKey,
        groqApiKey: runtime.ai?.groqApiKey || defaults.ai.groqApiKey,
        geminiApiKey: runtime.ai?.geminiApiKey || defaults.ai.geminiApiKey,
        model: runtime.ai?.model || defaults.ai.model
      },
      
      // Notification Configuration (Runtime settings override defaults)
      notifications: {
        teamsWebhookUrl: runtime.notifications?.teamsWebhookUrl || defaults.notifications.teamsWebhookUrl,
        slackWebhookUrl: runtime.notifications?.slackWebhookUrl || defaults.notifications.slackWebhookUrl,
        googleChatWebhookUrl: runtime.notifications?.googleChatWebhookUrl || defaults.notifications.googleChatWebhookUrl,
        teamsEnabled: runtime.notifications?.teamsEnabled || defaults.notifications.teamsEnabled,
        slackEnabled: runtime.notifications?.slackEnabled || defaults.notifications.slackEnabled,
        googleChatEnabled: runtime.notifications?.googleChatEnabled || defaults.notifications.googleChatEnabled,
        enabled: runtime.notifications?.enabled || defaults.notifications.enabled
      },
      
      // Polling Configuration (Runtime settings override defaults)
      polling: {
        workItemsInterval: runtime.polling?.workItemsInterval || defaults.polling.workItemsInterval,
        pipelineInterval: runtime.polling?.pipelineInterval || defaults.polling.pipelineInterval,
        pullRequestInterval: runtime.polling?.pullRequestInterval || defaults.polling.pullRequestInterval,
        overdueCheckInterval: runtime.polling?.overdueCheckInterval || defaults.polling.overdueCheckInterval
      },
      
      // Security Configuration (Env vars only - deployment level)
      security: {
        webhookSecret: env.WEBHOOK_SECRET || '',
        apiToken: env.API_TOKEN || 'default-token-change-me'
      },
      
      // Application Configuration (Env vars only - deployment level)
      app: {
        port: parseInt(env.PORT) || 3001,
        nodeEnv: env.NODE_ENV || 'development',
        logLevel: env.LOG_LEVEL || 'info'
      }
    };
  }

  async updateRuntimeSettings(newSettings) {
    try {
      // Save new runtime settings
      await runtimeSettings.save(newSettings);
      
      // Rebuild configuration
      this.buildConfig();
      
      // Notify listeners of configuration change
      this.notifyChangeListeners();
      
      logger.info('Runtime settings updated and configuration reloaded');
      return true;
    } catch (error) {
      logger.error('Failed to update runtime settings:', error);
      throw error;
    }
  }

  getRuntimeSettings() {
    return runtimeSettings.get() || runtimeSettings.getDefaults();
  }

  // Add listener for configuration changes
  onConfigChange(listener) {
    this.changeListeners.push(listener);
  }

  // Notify all listeners of configuration changes
  notifyChangeListeners() {
    for (const listener of this.changeListeners) {
      try {
        listener(this.config);
      } catch (error) {
        logger.error('Error in config change listener:', error);
      }
    }
  }

  // Validation schema
  getValidationSchema() {
    return Joi.object({
      azureDevOps: Joi.object({
        organization: Joi.string().min(1).required(),
        project: Joi.string().min(1).required(),
        personalAccessToken: Joi.string().min(1).required(),
        baseUrl: Joi.string().uri().required()
      }).required(),
      
      ai: Joi.object({
        provider: Joi.string().valid('openai', 'groq', 'gemini').default('openai'),
        openaiApiKey: Joi.string().allow('').optional(),
        groqApiKey: Joi.string().allow('').optional(),
        geminiApiKey: Joi.string().allow('').optional(),
        model: Joi.string().default('gpt-3.5-turbo')
      }).optional(),
      
      notifications: Joi.object({
        teamsWebhookUrl: Joi.string().uri().allow('').optional(),
        slackWebhookUrl: Joi.string().uri().allow('').optional(),
        googleChatWebhookUrl: Joi.string().uri().allow('').optional(),
        teamsEnabled: Joi.boolean().default(false),
        slackEnabled: Joi.boolean().default(false),
        googleChatEnabled: Joi.boolean().default(false),
        enabled: Joi.boolean().default(false)
      }).optional(),
      
      polling: Joi.object({
        workItemsInterval: Joi.string().min(1).required(),
        pipelineInterval: Joi.string().min(1).required(),
        pullRequestInterval: Joi.string().min(1).required(),
        overdueCheckInterval: Joi.string().min(1).required()
      }).required(),
      
      security: Joi.object({
        webhookSecret: Joi.string().allow('').optional(),
        apiToken: Joi.string().min(1).required()
      }).required(),
      
      app: Joi.object({
        port: Joi.number().port().required(),
        nodeEnv: Joi.string().valid('development', 'production', 'test').required(),
        logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').required()
      }).required()
    });
  }

  async validate() {
    const schema = this.getValidationSchema();
    const { error, value } = schema.validate(this.config);
    
    if (error) {
      logger.error('Configuration validation failed:', error.details);
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    
    this.config = value;
    return this.config;
  }

  // Validate only essential configuration for basic functionality
  validateEssential() {
    const essentialSchema = Joi.object({
      azureDevOps: Joi.object({
        organization: Joi.string().min(1).required(),
        project: Joi.string().min(1).required(),
        personalAccessToken: Joi.string().min(1).required(),
        baseUrl: Joi.string().uri().required()
      }).required()
    });

    const { error } = essentialSchema.validate({
      azureDevOps: this.config.azureDevOps
    });

    return !error;
  }

  get(path) {
    if (!this.initialized) {
      throw new Error('ConfigLoader not initialized. Call initialize() first.');
    }
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  getAzureDevOpsConfig() {
    return this.config.azureDevOps;
  }

  getAIConfig() {
    return this.config.ai;
  }

  getNotificationConfig() {
    return this.config.notifications;
  }

  getPollingConfig() {
    return this.config.polling;
  }

  getSecurityConfig() {
    return this.config.security;
  }

  isProduction() {
    return this.config.app.nodeEnv === 'production';
  }

  isDevelopment() {
    return this.config.app.nodeEnv === 'development';
  }
}

export const configLoader = new ConfigLoader();
