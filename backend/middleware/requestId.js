import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID from header or generate new one
  req.id = req.header('X-Request-ID') || uuidv4();
  
  // Set response header
  res.setHeader('X-Request-ID', req.id);
  
  next();
};
