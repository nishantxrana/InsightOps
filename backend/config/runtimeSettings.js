import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { settingsEncryption } from '../utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RuntimeSettings {
  constructor() {
    this.settingsFile = path.join(__dirname, 'runtime-settings.json');
    this.settings = {};
    this.loaded = false;
  }

  async load() {
    try {
      const data = await fs.readFile(this.settingsFile, 'utf8');
      const encryptedSettings = JSON.parse(data);
      
      // Decrypt sensitive fields
      this.settings = settingsEncryption.decryptSensitiveFields(encryptedSettings);
      
      logger.info('Runtime settings loaded successfully');
      this.loaded = true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No runtime settings file found, using defaults');
        this.settings = {};
        this.loaded = true;
      } else {
        logger.error('Failed to load runtime settings:', error);
        throw error;
      }
    }
  }

  async save(newSettings) {
    try {
      // Validate settings structure
      this.validateSettings(newSettings);
      
      // Encrypt sensitive fields before saving
      const encryptedSettings = settingsEncryption.encryptSensitiveFields(newSettings);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.settingsFile), { recursive: true });
      
      // Save to file
      await fs.writeFile(this.settingsFile, JSON.stringify(encryptedSettings, null, 2));
      
      // Update in-memory settings
      this.settings = newSettings;
      
      logger.info('Runtime settings saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save runtime settings:', error);
      throw error;
    }
  }

  get(path) {
    if (!this.loaded) {
      throw new Error('Runtime settings not loaded. Call load() first.');
    }
    
    if (!path) {
      return this.settings;
    }
    
    return path.split('.').reduce((obj, key) => obj?.[key], this.settings);
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.settings);
    
    target[lastKey] = value;
  }

  has(path) {
    return this.get(path) !== undefined;
  }

  validateSettings(settings) {
    // Basic validation - ensure required structure exists
    const requiredSections = ['azureDevOps', 'ai', 'notifications', 'polling'];
    
    for (const section of requiredSections) {
      if (settings[section] && typeof settings[section] !== 'object') {
        throw new Error(`Invalid settings: ${section} must be an object`);
      }
    }

    // Validate AI provider
    if (settings.ai?.provider && !['openai', 'groq', 'gemini'].includes(settings.ai.provider)) {
      throw new Error('Invalid AI provider. Must be one of: openai, groq, gemini');
    }

    // Validate URLs if provided
    const urlFields = [
      'azureDevOps.baseUrl',
      'notifications.teamsWebhookUrl',
      'notifications.slackWebhookUrl', 
      'notifications.googleChatWebhookUrl'
    ];

    for (const fieldPath of urlFields) {
      const value = this.getNestedValue(settings, fieldPath);
      if (value && typeof value === 'string' && value.trim() !== '') {
        try {
          new URL(value);
        } catch {
          throw new Error(`Invalid URL for ${fieldPath}: ${value}`);
        }
      }
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Get default settings structure
  getDefaults() {
    return {
      azureDevOps: {
        organization: '',
        project: '',
        personalAccessToken: '',
        baseUrl: 'https://dev.azure.com'
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
        workItemsInterval: '10',     // 10 seconds
        pipelineInterval: '10',      // 10 seconds
        pullRequestInterval: '10',   // 10 seconds
        overdueCheckInterval: '10'   // 10 seconds
      }
    };
  }
}

export const runtimeSettings = new RuntimeSettings();
