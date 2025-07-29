import Joi from 'joi';
import { logger } from '../utils/logger.js';

class ConfigLoader {
  constructor() {
    this.config = {
      // Azure DevOps Configuration
      azureDevOps: {
        organization: process.env.AZURE_DEVOPS_ORG,
        project: process.env.AZURE_DEVOPS_PROJECT,
        personalAccessToken: process.env.AZURE_DEVOPS_PAT,
        baseUrl: process.env.AZURE_DEVOPS_BASE_URL || 'https://dev.azure.com'
      },
      
      // AI Configuration
      ai: {
        provider: process.env.AI_PROVIDER || 'openai', // 'openai' or 'groq'
        openaiApiKey: process.env.OPENAI_API_KEY,
        groqApiKey: process.env.GROQ_API_KEY,
        model: process.env.AI_MODEL || 'gpt-3.5-turbo'
      },
      
      // Notification Configuration
      notifications: {
        teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
        enabled: process.env.NOTIFICATIONS_ENABLED === 'true'
      },
      
      // Polling Configuration
      polling: {
        workItemsInterval: process.env.WORK_ITEMS_POLL_INTERVAL || '*/15 * * * *', // Every 15 minutes
        pipelineInterval: process.env.PIPELINE_POLL_INTERVAL || '*/10 * * * *', // Every 10 minutes
        pullRequestInterval: process.env.PR_POLL_INTERVAL || '0 */2 * * *', // Every 2 hours
        overdueCheckInterval: process.env.OVERDUE_CHECK_INTERVAL || '0 9 * * *' // Daily at 9 AM
      },
      
      // Security Configuration
      security: {
        webhookSecret: process.env.WEBHOOK_SECRET,
        apiToken: process.env.API_TOKEN || 'default-token-change-me'
      },
      
      // Application Configuration
      app: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
      }
    };
  }

  // Validation schema
  getValidationSchema() {
    return Joi.object({
      azureDevOps: Joi.object({
        organization: Joi.string().required(),
        project: Joi.string().required(),
        personalAccessToken: Joi.string().required(),
        baseUrl: Joi.string().uri().required()
      }).required(),
      
      ai: Joi.object({
        provider: Joi.string().valid('openai', 'groq').required(),
        openaiApiKey: Joi.when('provider', {
          is: 'openai',
          then: Joi.string().required(),
          otherwise: Joi.string().optional()
        }),
        groqApiKey: Joi.when('provider', {
          is: 'groq',
          then: Joi.string().required(),
          otherwise: Joi.string().optional()
        }),
        model: Joi.string().required()
      }).required(),
      
      notifications: Joi.object({
        teamsWebhookUrl: Joi.string().uri().optional(),
        slackWebhookUrl: Joi.string().uri().optional(),
        enabled: Joi.boolean().required()
      }).required(),
      
      polling: Joi.object({
        workItemsInterval: Joi.string().required(),
        pipelineInterval: Joi.string().required(),
        pullRequestInterval: Joi.string().required(),
        overdueCheckInterval: Joi.string().required()
      }).required(),
      
      security: Joi.object({
        webhookSecret: Joi.string().optional(),
        apiToken: Joi.string().required()
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

  get(path) {
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
