import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  azureDevOps: {
    organization: String,
    project: String,
    pat: String, // encrypted
    baseUrl: { type: String, default: 'https://dev.azure.com' }
  },
  ai: {
    provider: { type: String, enum: ['openai', 'groq', 'gemini'], default: 'gemini' },
    model: { type: String, default: 'gemini-2.0-flash' },
    apiKeys: {
      openai: String, // encrypted
      groq: String, // encrypted
      gemini: String // encrypted
    }
  },
  notifications: {
    enabled: { type: Boolean, default: true },
    teamsEnabled: { type: Boolean, default: false },
    slackEnabled: { type: Boolean, default: false },
    googleChatEnabled: { type: Boolean, default: false },
    webhooks: {
      teams: String,
      slack: String,
      googleChat: String
    }
  },
  polling: {
    workItemsInterval: { type: String, default: '*/10 * * * *' },
    pipelineInterval: { type: String, default: '0 */10 * * *' },
    pullRequestInterval: { type: String, default: '0 */10 * * *' },
    overdueCheckInterval: { type: String, default: '0 */10 * * *' }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'app_user_settings' // Use different collection name
});

userSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const UserSettings = mongoose.model('UserSettings', userSettingsSchema);
