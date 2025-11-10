import { z } from 'zod';

// Authentication schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1, 'Name is required').max(100).trim()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required').max(100)
});

// Settings schemas
export const settingsSchema = z.object({
  azureDevOps: z.object({
    organization: z.string().min(1).max(100).regex(/^[a-zA-Z0-9-]+$/, 'Invalid organization name'),
    project: z.string().min(1).max(100),
    pat: z.string().min(20).max(200).optional(),
    baseUrl: z.string().url('Invalid URL format')
  }).optional(),
  ai: z.object({
    provider: z.enum(['openai', 'groq', 'gemini'], { errorMap: () => ({ message: 'Invalid AI provider' }) }),
    model: z.string().min(1).max(100),
    apiKeys: z.object({
      openai: z.string().max(200).optional(),
      groq: z.string().max(200).optional(),
      gemini: z.string().max(200).optional()
    }).optional()
  }).optional(),
  notifications: z.object({
    enabled: z.boolean().optional(),
    teamsWebhookUrl: z.string().url().optional().or(z.literal('')),
    slackWebhookUrl: z.string().url().optional().or(z.literal('')),
    googleChatWebhookUrl: z.string().url().optional().or(z.literal('')),
    teamsEnabled: z.boolean().optional(),
    slackEnabled: z.boolean().optional(),
    googleChatEnabled: z.boolean().optional()
  }).optional(),
  polling: z.object({
    workItemsInterval: z.string().regex(/^[*\d\s,\-\/]+$/, 'Invalid cron expression').optional(),
    pullRequestInterval: z.string().regex(/^[*\d\s,\-\/]+$/, 'Invalid cron expression').optional(),
    overdueCheckInterval: z.string().regex(/^[*\d\s,\-\/]+$/, 'Invalid cron expression').optional(),
    workItemsEnabled: z.boolean().optional(),
    pullRequestEnabled: z.boolean().optional(),
    overdueCheckEnabled: z.boolean().optional()
  }).optional(),
  security: z.object({
    webhookSecret: z.string().optional(),
    apiToken: z.string().optional(),
    enableRateLimit: z.boolean().optional(),
    maxRequestsPerMinute: z.number().optional()
  }).optional()
});

// Azure DevOps test connection schema
export const testConnectionSchema = z.object({
  organization: z.string().min(1).max(100),
  project: z.string().min(1).max(100),
  pat: z.string().min(20).max(200),
  baseUrl: z.string().url()
});
