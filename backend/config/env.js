import { config } from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Load environment variables first
config();

// Comprehensive environment validation schema
const envSchema = z.object({
  // Application Environment
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Database Configuration (Required)
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Security Configuration (Required)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  ENCRYPTION_KEY: z.string().optional(), // Used for encrypting user settings

  // Frontend Configuration
  FRONTEND_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  // AI Providers (at least one required)
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gemini-2.0-flash'),
  AI_PROVIDER: z.enum(['openai', 'groq', 'gemini']).default('gemini'),

  // Azure DevOps (Optional - can be configured per user)
  AZURE_DEVOPS_ORG: z.string().optional(),
  AZURE_DEVOPS_PROJECT: z.string().optional(),
  AZURE_DEVOPS_PAT: z.string().optional(),
  AZURE_DEVOPS_BASE_URL: z.string().url().default('https://dev.azure.com'),

  // Notification Services (Optional)
  TEAMS_WEBHOOK_URL: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  GOOGLE_CHAT_WEBHOOK_URL: z.string().url().optional(),
  NOTIFICATIONS_ENABLED: z.string().transform(val => val === 'true').default('false'),

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).default('100'),
  RATE_LIMIT_AUTH_MAX: z.string().regex(/^\d+$/).transform(Number).default('5'),
  RATE_LIMIT_AI_MAX: z.string().regex(/^\d+$/).transform(Number).default('20'),

  // Database Connection Pool
  DB_MIN_POOL_SIZE: z.string().regex(/^\d+$/).transform(Number).default('2'),
  DB_MAX_POOL_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10'),
  DB_CONNECTION_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),

  // Webhook Configuration (Optional)
  WEBHOOK_SECRET: z.string().optional(),
  API_TOKEN: z.string().optional(),

  // UNUSED VARIABLES - Commented out to reduce complexity
  // Polling Configuration
  // WORK_ITEMS_POLL_INTERVAL: z.string().default('0 */10 * * *'),
  // PIPELINE_POLL_INTERVAL: z.string().default('0 */10 * * *'),
  // PR_POLL_INTERVAL: z.string().default('0 */10 * * *'),

  // Error Tracking (Optional)
  // SENTRY_DSN: z.string().url().optional(),

  // Performance Monitoring (Optional)
  // NEW_RELIC_LICENSE_KEY: z.string().optional(),
  // NEW_RELIC_APP_NAME: z.string().optional(),

  // Health Check Configuration
  // HEALTH_CHECK_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  // HEALTH_CHECK_INTERVAL: z.string().regex(/^\d+$/).transform(Number).default('30000'),

  // Session Configuration
  // SESSION_SECRET: z.string().min(32).optional(),
  // SESSION_MAX_AGE: z.string().regex(/^\d+$/).transform(Number).default('86400000'),

  // Cache Configuration
  // REDIS_URL: z.string().url().optional(),
  // CACHE_TTL: z.string().regex(/^\d+$/).transform(Number).default('300'),

  // Security Headers
  // CSP_REPORT_URI: z.string().url().optional(),
  // HSTS_MAX_AGE: z.string().regex(/^\d+$/).transform(Number).default('31536000'),

  // Feature Flags
  // FEATURE_AI_ANALYSIS: z.string().transform(val => val === 'true').default('true'),
  // FEATURE_REAL_TIME_UPDATES: z.string().transform(val => val === 'true').default('true'),
  // FEATURE_ADVANCED_ANALYTICS: z.string().transform(val => val === 'true').default('true'),

  // Performance Configuration
  // MAX_REQUEST_SIZE: z.string().default('50mb'),
  // REQUEST_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  // KEEP_ALIVE_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('5000'),

  // Development Flags
  // DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  // VERBOSE_LOGGING: z.string().transform(val => val === 'true').default('false'),
  // ENABLE_PROFILING: z.string().transform(val => val === 'true').default('false')
});

let validatedEnv;

try {
  // Parse and validate environment variables
  validatedEnv = envSchema.parse(process.env);
  
  // Additional validation logic
  const hasAIProvider = validatedEnv.OPENAI_API_KEY || 
                        validatedEnv.GROQ_API_KEY || 
                        validatedEnv.GEMINI_API_KEY;
  
  if (!hasAIProvider) {
    logger.warn('⚠️  No AI provider configured. Users must configure AI settings in the application.');
  }

  // Validate production-specific requirements (warnings only, no crashes)
  if (validatedEnv.NODE_ENV === 'production') {
    if (!validatedEnv.FRONTEND_URL && !validatedEnv.ALLOWED_ORIGINS) {
      logger.warn('⚠️  FRONTEND_URL or ALLOWED_ORIGINS not set. CORS may not work properly.');
    }
    
    if (validatedEnv.JWT_SECRET.length < 64) {
      logger.warn('⚠️  JWT_SECRET should be at least 64 characters in production');
    }
    
    logger.info('🚀 Production environment detected');
  }

  // Log successful validation
  logger.info('✅ Environment validation successful', {
    nodeEnv: validatedEnv.NODE_ENV,
    port: validatedEnv.PORT,
    logLevel: validatedEnv.LOG_LEVEL,
    hasAI: hasAIProvider,
    aiProvider: validatedEnv.AI_PROVIDER
  });
  
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('❌ Environment validation failed:');
    error.errors.forEach(err => {
      logger.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    logger.error('❌ Environment validation error:', error.message);
  }
  process.exit(1);
}

// Export validated environment
export const env = validatedEnv;

// Export helper functions
export const isProduction = () => env.NODE_ENV === 'production';
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isTest = () => env.NODE_ENV === 'test';
export const isStaging = () => env.NODE_ENV === 'staging';

// Export configuration objects (only used ones)
export const database = {
  uri: env.MONGODB_URI,
  minPoolSize: env.DB_MIN_POOL_SIZE,
  maxPoolSize: env.DB_MAX_POOL_SIZE,
  connectionTimeout: env.DB_CONNECTION_TIMEOUT
};

export const security = {
  jwtSecret: env.JWT_SECRET,
  encryptionKey: env.ENCRYPTION_KEY,
  webhookSecret: env.WEBHOOK_SECRET,
  apiToken: env.API_TOKEN
};

export const rateLimits = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  authMax: env.RATE_LIMIT_AUTH_MAX,
  aiMax: env.RATE_LIMIT_AI_MAX
};

export const ai = {
  provider: env.AI_PROVIDER,
  model: env.AI_MODEL,
  apiKeys: {
    openai: env.OPENAI_API_KEY,
    groq: env.GROQ_API_KEY,
    gemini: env.GEMINI_API_KEY
  }
};

export const notifications = {
  enabled: env.NOTIFICATIONS_ENABLED,
  teams: env.TEAMS_WEBHOOK_URL,
  slack: env.SLACK_WEBHOOK_URL,
  googleChat: env.GOOGLE_CHAT_WEBHOOK_URL
};
