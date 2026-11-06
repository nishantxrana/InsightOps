import { config } from "dotenv";
import { z } from "zod";
import { logger } from "../utils/logger.js";

// Load environment variables first
config();

/** Treat missing / blank / whitespace-only App Settings as unset */
const blankToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return typeof value === "string" ? value.trim() : value;
};

const optionalString = z.preprocess(blankToUndefined, z.string().min(1).optional());

const optionalEmail = z.preprocess(blankToUndefined, z.string().email().optional());

const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());

/** All app secrets: exactly 64 hex characters. Generate:
 *  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const hexKey64 = z.string().regex(/^[0-9a-fA-F]{64}$/, "must be exactly 64 hexadecimal characters");

const optionalHexKey64 = z.preprocess(blankToUndefined, hexKey64.optional());

const optionalAcsConnectionString = z.preprocess(
  blankToUndefined,
  z
    .string()
    .refine(
      (value) => /endpoint=/i.test(value) && /accesskey=/i.test(value),
      "ACS_CONNECTION_STRING must look like endpoint=https://.../;accesskey=..."
    )
    .optional()
);

// Comprehensive environment validation schema
const envSchema = z
  .object({
    // Application Environment
    NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
    PORT: z.string().regex(/^\d+$/).transform(Number).default("3001"),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

    // Database Configuration (Required)
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

    // Security — every secret is exactly 64 hex characters
    JWT_SECRET: hexKey64,
    ENCRYPTION_KEY: hexKey64,

    // Frontend Configuration
    ALLOWED_ORIGINS: optionalString,

    // AI Providers (optional at boot — users can configure in Settings)
    OPENAI_API_KEY: optionalString,
    GROQ_API_KEY: optionalString,
    GEMINI_API_KEY: optionalString,
    AI_MODEL: z.string().default("gemini-2.0-flash"),
    AI_PROVIDER: z.enum(["openai", "groq", "gemini"]).default("gemini"),

    // Azure DevOps (Optional - configured per organization in Settings)
    AZURE_DEVOPS_ORG: optionalString,
    AZURE_DEVOPS_PROJECT: optionalString,
    AZURE_DEVOPS_PAT: optionalString,
    AZURE_DEVOPS_BASE_URL: z.preprocess(
      blankToUndefined,
      z.string().url().default("https://dev.azure.com")
    ),

    // Notification Services (Optional)
    TEAMS_WEBHOOK_URL: optionalUrl,
    SLACK_WEBHOOK_URL: optionalUrl,
    GOOGLE_CHAT_WEBHOOK_URL: optionalUrl,
    NOTIFICATIONS_ENABLED: z
      .string()
      .transform((val) => val === "true")
      .default("false"),

    // Rate Limiting Configuration
    RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default("300000"),
    RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).default("500"),
    RATE_LIMIT_AUTH_MAX: z.string().regex(/^\d+$/).transform(Number).default("10"),
    RATE_LIMIT_AI_MAX: z.string().regex(/^\d+$/).transform(Number).default("100"),

    // Database Connection Pool
    DB_MIN_POOL_SIZE: z.string().regex(/^\d+$/).transform(Number).default("5"),
    DB_MAX_POOL_SIZE: z.string().regex(/^\d+$/).transform(Number).default("20"),
    DB_CONNECTION_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default("30000"),

    // Webhook Configuration (Optional)
    WEBHOOK_SECRET: optionalString,
    API_TOKEN: optionalString,

    // Azure Communication Services Email (optional at boot; both required together for OTP mail)
    ACS_CONNECTION_STRING: optionalAcsConnectionString,
    ACS_EMAIL_FROM: optionalEmail,

    // Legacy JWT helpers on User model (unused by live OTP flow) — optional, 64 hex if set
    EMAIL_VERIFICATION_SECRET: optionalHexKey64,
    PASSWORD_RESET_SECRET: optionalHexKey64,
  })
  .superRefine((data, ctx) => {
    const hasConnection = Boolean(data.ACS_CONNECTION_STRING);
    const hasFrom = Boolean(data.ACS_EMAIL_FROM);
    if (hasConnection !== hasFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasConnection ? ["ACS_EMAIL_FROM"] : ["ACS_CONNECTION_STRING"],
        message:
          "ACS_CONNECTION_STRING and ACS_EMAIL_FROM must both be set (or both omitted) for email OTPs",
      });
    }
  });

let validatedEnv;

try {
  validatedEnv = envSchema.parse(process.env);

  if (!validatedEnv.ACS_CONNECTION_STRING || !validatedEnv.ACS_EMAIL_FROM) {
    logger.warn(
      "ACS email not configured (ACS_CONNECTION_STRING / ACS_EMAIL_FROM). Signup and password-reset OTPs will not send."
    );
  }

  if (validatedEnv.NODE_ENV === "production") {
    if (!validatedEnv.ALLOWED_ORIGINS) {
      logger.warn("ALLOWED_ORIGINS not set. CORS may not work properly.");
    }

    logger.info("Production environment detected");
  }

  logger.info("Environment validation successful", {
    nodeEnv: validatedEnv.NODE_ENV,
    port: validatedEnv.PORT,
    logLevel: validatedEnv.LOG_LEVEL,
    acsEmailConfigured: Boolean(validatedEnv.ACS_CONNECTION_STRING && validatedEnv.ACS_EMAIL_FROM),
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error("Environment validation failed:");
    error.errors.forEach((err) => {
      logger.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
  } else {
    logger.error("Environment validation error:", error.message);
  }
  process.exit(1);
}

export const env = validatedEnv;

export const isProduction = () => env.NODE_ENV === "production";
export const isDevelopment = () => env.NODE_ENV === "development";
export const isTest = () => env.NODE_ENV === "test";
export const isStaging = () => env.NODE_ENV === "staging";

export const database = {
  uri: env.MONGODB_URI,
  minPoolSize: env.DB_MIN_POOL_SIZE,
  maxPoolSize: env.DB_MAX_POOL_SIZE,
  connectionTimeout: env.DB_CONNECTION_TIMEOUT,
};

export const security = {
  jwtSecret: env.JWT_SECRET,
  encryptionKey: env.ENCRYPTION_KEY,
  webhookSecret: env.WEBHOOK_SECRET,
  apiToken: env.API_TOKEN,
};

export const rateLimits = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  authMax: env.RATE_LIMIT_AUTH_MAX,
  aiMax: env.RATE_LIMIT_AI_MAX,
};

export const notifications = {
  enabled: env.NOTIFICATIONS_ENABLED,
  teams: env.TEAMS_WEBHOOK_URL,
  slack: env.SLACK_WEBHOOK_URL,
  googleChat: env.GOOGLE_CHAT_WEBHOOK_URL,
};

export const acsEmail = {
  connectionString: env.ACS_CONNECTION_STRING,
  fromEmail: env.ACS_EMAIL_FROM,
  configured: Boolean(env.ACS_CONNECTION_STRING && env.ACS_EMAIL_FROM),
};
