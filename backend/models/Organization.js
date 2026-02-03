import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    azureDevOps: {
      organization: { type: String, required: true },
      project: { type: String, required: true },
      pat: { type: String, required: true }, // encrypted
      baseUrl: { type: String, default: "https://dev.azure.com" },
    },
    ai: {
      provider: { type: String, enum: ["openai", "groq", "gemini"], default: "gemini" },
      model: { type: String, default: "gemini-2.0-flash" },
      apiKeys: {
        openai: String,
        groq: String,
        gemini: String,
      },
    },
    notifications: {
      enabled: { type: Boolean, default: true },
      teamsEnabled: { type: Boolean, default: false },
      slackEnabled: { type: Boolean, default: false },
      googleChatEnabled: { type: Boolean, default: false },
      webhooks: {
        teams: String,
        slack: String,
        googleChat: String,
      },
    },
    polling: {
      workItemsInterval: { type: String, default: "*/10 * * * *" },
      pullRequestInterval: { type: String, default: "0 */10 * * *" },
      overdueCheckInterval: { type: String, default: "0 */10 * * *" },
      workItemsEnabled: { type: Boolean, default: false },
      pullRequestEnabled: { type: Boolean, default: false },
      overdueCheckEnabled: { type: Boolean, default: false },
      overdueFilterEnabled: { type: Boolean, default: true },
      overdueMaxDays: { type: Number, default: 60 },
    },
    productionFilters: {
      enabled: { type: Boolean, default: false },
      branches: { type: [String], default: [] },
      environments: { type: [String], default: [] },
      buildDefinitions: { type: [String], default: [] },
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "organizations",
  }
);

// Compound index: one org per user per Azure DevOps org
organizationSchema.index({ userId: 1, "azureDevOps.organization": 1 }, { unique: true });
organizationSchema.index({ userId: 1, isDefault: 1 });
organizationSchema.index({ isActive: 1 });

organizationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Organization = mongoose.model("Organization", organizationSchema);
