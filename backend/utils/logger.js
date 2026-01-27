import winston from "winston";
import path from "path";
import fs from "fs";

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug");
const IS_PRODUCTION = NODE_ENV === "production";
const IS_DEVELOPMENT = NODE_ENV === "development";
const IS_STAGING = NODE_ENV === "staging";
// Staging behaves like development for logging (full debug, stack traces, etc.)
const VERBOSE_MODE = IS_DEVELOPMENT || IS_STAGING;

// Sensitive field patterns for sanitization
const SENSITIVE_PATTERNS = [
  "password",
  "token",
  "secret",
  "apikey",
  "pat",
  "authorization",
  "cookie",
  "bearer",
  "credential",
  "private",
  "webhook",
];

/**
 * Sanitize sensitive data from logs
 * @param {any} data - Data to sanitize
 * @param {number} depth - Current recursion depth (to prevent infinite loops)
 * @returns {any} Sanitized data
 */
export function sanitizeForLogging(data, depth = 0) {
  if (depth > 10) return "[Max Depth]";
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.slice(0, 10).map((item) => sanitizeForLogging(item, depth + 1));
  }

  const sanitized = {};

  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    const lowerKey = key.toLowerCase();

    // Check if key matches sensitive patterns
    if (SENSITIVE_PATTERNS.some((pattern) => lowerKey.includes(pattern))) {
      sanitized[key] = "***REDACTED***";
    } else if (typeof data[key] === "object" && data[key] !== null) {
      sanitized[key] = sanitizeForLogging(data[key], depth + 1);
    } else if (typeof data[key] === "string" && data[key].length > 500) {
      // Truncate very long strings
      sanitized[key] = data[key].substring(0, 500) + "...[truncated]";
    } else {
      sanitized[key] = data[key];
    }
  }

  return sanitized;
}

/**
 * Create context object for logging
 * @param {Object} options - Context options
 * @returns {Object} Formatted context
 */
export function createLogContext(options = {}) {
  const context = {};

  if (options.requestId) context.requestId = options.requestId;
  if (options.userId) context.userId = options.userId.toString();
  if (options.organizationId) context.organizationId = options.organizationId.toString();
  if (options.component) context.component = options.component;
  if (options.action) context.action = options.action;
  if (options.status) context.status = options.status;

  return context;
}

/**
 * Extract logging context from Express request
 * @param {Object} req - Express request object
 * @returns {Object} Logging context
 */
export function getRequestContext(req) {
  return {
    requestId: req?.id || "no-request-id",
    userId: req?.user?._id?.toString() || undefined,
    organizationId: req?.organizationId?.toString() || undefined,
    path: req?.path,
    method: req?.method,
  };
}

// Custom format for console output (development friendly)
const consoleFormat = printf(
  ({ level, message, timestamp, component, requestId, organizationId, userId, ...meta }) => {
    let log = `${timestamp} [${level}]`;

    // Add component tag if present
    if (component) log += ` [${component}]`;

    log += `: ${message}`;

    // Add context identifiers inline for easy scanning
    const contextParts = [];
    if (requestId && requestId !== "no-request-id")
      contextParts.push(`req:${requestId.substring(0, 8)}`);
    if (organizationId) contextParts.push(`org:${organizationId.substring(0, 8)}`);
    if (userId) contextParts.push(`user:${userId.substring(0, 8)}`);

    if (contextParts.length > 0) {
      log += ` (${contextParts.join(", ")})`;
    }

    // Add additional metadata in dev/staging mode
    const relevantMeta = { ...meta };
    delete relevantMeta.service; // Already known

    if (Object.keys(relevantMeta).length > 0 && VERBOSE_MODE) {
      try {
        const metaString = JSON.stringify(
          relevantMeta,
          (key, value) => {
            // Handle circular references
            if (key === "req" || key === "res" || key === "socket" || key === "client") {
              return "[Circular]";
            }
            if (typeof value === "object" && value !== null) {
              if (
                value.constructor?.name === "ClientRequest" ||
                value.constructor?.name === "IncomingMessage" ||
                value.constructor?.name === "Socket"
              ) {
                return "[Object]";
              }
            }
            return value;
          },
          2
        );
        log += `\n  ${metaString}`;
      } catch (error) {
        // Silently ignore serialization errors
      }
    }

    return log;
  }
);

// JSON format for production (structured logs)
const productionFormat = combine(
  timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  errors({ stack: VERBOSE_MODE }), // Include stack traces in dev/staging
  json()
);

// Create logs directory
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: productionFormat,
  defaultMeta: {
    service: "insightops-backend",
    environment: NODE_ENV,
  },
  transports: [
    // Console transport - format differs by environment
    // Production: JSON format for log aggregators
    // Dev/Staging: Human-readable colored format
    new winston.transports.Console({
      format: VERBOSE_MODE
        ? combine(colorize(), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), consoleFormat)
        : productionFormat,
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: productionFormat,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: productionFormat,
    }),
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
      format: productionFormat,
    }),
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
      format: productionFormat,
    }),
  ],
});

/**
 * Create a child logger with preset context (for services/components)
 * @param {string} component - Component name (e.g., 'webhook', 'poller', 'agent')
 * @param {Object} defaultContext - Default context to include in all logs
 * @returns {Object} Child logger with context methods
 */
export function createComponentLogger(component, defaultContext = {}) {
  return {
    info: (message, meta = {}) => logger.info(message, { component, ...defaultContext, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { component, ...defaultContext, ...meta }),
    error: (message, meta = {}) => logger.error(message, { component, ...defaultContext, ...meta }),
    debug: (message, meta = {}) => {
      if (VERBOSE_MODE) {
        logger.debug(message, { component, ...defaultContext, ...meta });
      }
    },
  };
}

/**
 * Log with request context (for use in request handlers)
 * @param {Object} req - Express request object
 * @param {string} component - Component name
 * @returns {Object} Logger with request context
 */
export function createRequestLogger(req, component) {
  const context = getRequestContext(req);
  return createComponentLogger(component, context);
}

// Export environment flags for conditional logging
export const logConfig = {
  isProduction: IS_PRODUCTION,
  isDevelopment: IS_DEVELOPMENT,
  isStaging: IS_STAGING,
  verboseMode: VERBOSE_MODE,
  level: LOG_LEVEL,
  environment: NODE_ENV,
};
