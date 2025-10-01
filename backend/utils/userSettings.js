import { UserSettings } from '../models/UserSettings.js';
import { encrypt, decrypt } from './encryption.js';

export const getUserSettings = async (userId) => {
  let settings = await UserSettings.findOne({ userId });
  
  if (!settings) {
    settings = new UserSettings({ userId });
    await settings.save();
  }
  
  // Decrypt sensitive fields
  if (settings.azureDevOps?.pat) {
    settings.azureDevOps.pat = decrypt(settings.azureDevOps.pat);
  }
  
  if (settings.ai?.apiKeys) {
    Object.keys(settings.ai.apiKeys).forEach(key => {
      if (settings.ai.apiKeys[key]) {
        settings.ai.apiKeys[key] = decrypt(settings.ai.apiKeys[key]);
      }
    });
  }
  
  return settings;
};

export const updateUserSettings = async (userId, updates) => {
  let settings = await UserSettings.findOne({ userId });
  
  if (!settings) {
    settings = new UserSettings({ userId });
  }
  
  // Helper function to trim string values recursively
  const trimStrings = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      const trimmed = {};
      for (const [key, value] of Object.entries(obj)) {
        trimmed[key] = trimStrings(value);
      }
      return trimmed;
    }
    return obj;
  };
  
  // Trim all string values in updates
  updates = trimStrings(updates);
  
  // Deep merge instead of overwrite to preserve existing values
  if (updates.azureDevOps) {
    settings.azureDevOps = { ...settings.azureDevOps, ...updates.azureDevOps };
    
    // Encrypt PAT if provided
    if (updates.azureDevOps.pat) {
      settings.azureDevOps.pat = encrypt(updates.azureDevOps.pat);
    }
  }
  
  if (updates.ai) {
    // Ensure ai object exists
    if (!settings.ai) {
      settings.ai = {};
    }
    
    // Ensure apiKeys is always an object
    if (!settings.ai.apiKeys) {
      settings.ai.apiKeys = {};
    }
    
    // Only merge defined values to avoid overwriting with undefined
    if (updates.ai.provider !== undefined) settings.ai.provider = updates.ai.provider;
    if (updates.ai.model !== undefined) settings.ai.model = updates.ai.model;
    
    // Handle API keys separately to avoid undefined issues
    if (updates.ai.apiKeys && typeof updates.ai.apiKeys === 'object') {
      // Encrypt API keys if provided
      Object.keys(updates.ai.apiKeys).forEach(key => {
        if (updates.ai.apiKeys[key]) {
          settings.ai.apiKeys[key] = encrypt(updates.ai.apiKeys[key]);
        }
      });
    }
  }
  
  if (updates.notifications) {
    // Ensure notifications object exists
    if (!settings.notifications) {
      settings.notifications = { enabled: true, webhooks: {} };
    }
    
    // Ensure webhooks object exists
    if (!settings.notifications.webhooks) {
      settings.notifications.webhooks = {};
    }
    
    // Handle flat notification properties (from frontend form)
    if (updates.notifications.enabled !== undefined) {
      settings.notifications.enabled = updates.notifications.enabled;
    }
    
    // Handle webhook URLs - check both nested and flat structure
    if (updates.notifications.teamsWebhookUrl !== undefined) {
      settings.notifications.webhooks.teams = updates.notifications.teamsWebhookUrl;
    }
    if (updates.notifications.slackWebhookUrl !== undefined) {
      settings.notifications.webhooks.slack = updates.notifications.slackWebhookUrl;
    }
    if (updates.notifications.googleChatWebhookUrl !== undefined) {
      settings.notifications.webhooks.googleChat = updates.notifications.googleChatWebhookUrl;
    }
    
    // Handle webhook enabled flags
    if (updates.notifications.teamsEnabled !== undefined) {
      settings.notifications.teamsEnabled = updates.notifications.teamsEnabled;
    }
    if (updates.notifications.slackEnabled !== undefined) {
      settings.notifications.slackEnabled = updates.notifications.slackEnabled;
    }
    if (updates.notifications.googleChatEnabled !== undefined) {
      settings.notifications.googleChatEnabled = updates.notifications.googleChatEnabled;
    }
  }
  
  if (updates.polling) {
    console.log('Updating polling settings:', updates.polling);
    // Ensure polling object exists
    if (!settings.polling) {
      settings.polling = {};
    }
    settings.polling = { ...settings.polling, ...updates.polling };
    console.log('Final polling settings:', settings.polling);
    
    // Update global config for cron jobs (temporary solution)
    const { configLoader } = await import('../config/settings.js');
    configLoader.updatePollingConfig(settings.polling);
  }
  
  await settings.save();
  
  return getUserSettings(userId); // Return decrypted version
};
