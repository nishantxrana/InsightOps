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
  
  // Encrypt sensitive fields before saving
  if (updates.azureDevOps?.pat) {
    updates.azureDevOps.pat = encrypt(updates.azureDevOps.pat);
  }
  
  if (updates.ai?.apiKeys) {
    Object.keys(updates.ai.apiKeys).forEach(key => {
      if (updates.ai.apiKeys[key]) {
        updates.ai.apiKeys[key] = encrypt(updates.ai.apiKeys[key]);
      }
    });
  }
  
  Object.assign(settings, updates);
  await settings.save();
  
  return getUserSettings(userId); // Return decrypted version
};
