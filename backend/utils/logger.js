import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Sanitize sensitive data from logs
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitive = ['password', 'token', 'secret', 'apikey', 'pat', 'authorization', 'cookie'];
  const sanitized = Array.isArray(data) ? [] : {};
  
  for (const key in data) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeForLogging(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }
  
  return sanitized;
}

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    try {
      // Use JSON.stringify with replacer to handle circular references
      const metaString = JSON.stringify(meta, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          // Check for circular references by looking for common circular properties
          if (key === 'req' || key === 'res' || key === 'socket' || key === 'client') {
            return '[Circular]';
          }
          // Limit object depth to prevent large outputs
          if (typeof value.constructor === 'function' && 
              (value.constructor.name === 'ClientRequest' || 
               value.constructor.name === 'IncomingMessage' ||
               value.constructor.name === 'Socket')) {
            return '[Object]';
          }
        }
        return value;
      }, 2);
      log += ` ${metaString}`;
    } catch (error) {
      log += ` [Meta serialization error: ${error.message}]`;
    }
  }
  
  return log;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: 'azure-devops-monitoring-agent'
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    }),
    
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs to combined file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log')
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log')
    })
  ]
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Export sanitization function for use in other modules
export { sanitizeForLogging };
