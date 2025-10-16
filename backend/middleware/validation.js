import { z } from 'zod';
import { logger, sanitizeForLogging } from '../utils/logger.js';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    req.validatedData = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        })),
        body: sanitizeForLogging(req.body)
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};
