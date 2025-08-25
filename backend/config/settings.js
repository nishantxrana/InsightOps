import Joi from 'joi';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

class ConfigLoader {
  constructor() {
    this.config = {
      // Azure DevOps Configuration
      azureDevOps: {
        organization: env.AZURE_DEVOPS_ORG || '',
        project: env.AZURE_DEVOPS_PROJECT || '',
        personalAccessToken: env.AZURE_DEVOPS_PAT || '',
        baseUrl: env.AZURE_DEVOPS_BASE_URL || 'https://dev.azure.com'
      },
      
      // AI Configuration
      ai: {
        provider: env.AI_PROVIDER || 'openai', // 'openai', 'groq', or 'gemini'
        openaiApiKey: env.OPENAI_API_KEY || '',
        groqApiKey: env.GROQ_API_KEY || '',
        geminiApiKey: env.GEMINI_API_KEY || '',
        model: env.AI_MODEL || 'gpt-3.5-turbo'
      },
      
      // Notification Configuration
      notifications: {
        teamsWebhookUrl: env.TEAMS_WEBHOOK_URL || '',
        slackWebhookUrl: env.SLACK_WEBHOOK_URL || '',
        googleChatWebhookUrl: env.GOOGLE_CHAT_WEBHOOK_URL || '',
        enabled: env.NOTIFICATIONS_ENABLED === 'true'
      },
      
      // Polling Configuration
      polling: {
        workItemsInterval: env.WORK_ITEMS_POLL_INTERVAL || '*/15 * * * *', // Every 15 minutes
        pipelineInterval: env.PIPELINE_POLL_INTERVAL || '*/10 * * * *', // Every 10 minutes
        pullRequestInterval: env.PR_POLL_INTERVAL || '0 */2 * * *', // Every 2 hours
        overdueCheckInterval: env.OVERDUE_CHECK_INTERVAL || '0 9 * * *' // Daily at 9 AM
      },
      
      // Security Configuration
      security: {
        webhookSecret: env.WEBHOOK_SECRET || '',
        apiToken: env.API_TOKEN || 'default-token-change-me'
      },
      
      // Application Configuration
      app: {
        port: parseInt(env.PORT) || 3001,
        nodeEnv: env.NODE_ENV || 'development',
        logLevel: env.LOG_LEVEL || 'info'
      }
    };
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
        provider: Joi.string().valid('openai', 'groq', 'gemini').required(),
        openaiApiKey: Joi.when('provider', {
          is: 'openai',
          then: Joi.string().min(1).required(),
          otherwise: Joi.string().allow('').optional()
        }),
        groqApiKey: Joi.when('provider', {
          is: 'groq',
          then: Joi.string().min(1).required(),
          otherwise: Joi.string().allow('').optional()
        }),
        geminiApiKey: Joi.when('provider', {
          is: 'gemini',
          then: Joi.string().min(1).required(),
          otherwise: Joi.string().allow('').optional()
        }),
        model: Joi.string().min(1).required()
      }).required(),
      
      notifications: Joi.object({
        teamsWebhookUrl: Joi.string().uri().allow('').optional(),
        slackWebhookUrl: Joi.string().uri().allow('').optional(),
        googleChatWebhookUrl: Joi.string().uri().allow('').optional(),
        enabled: Joi.boolean().required()
      }).required(),
      
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
