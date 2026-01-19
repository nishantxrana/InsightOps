import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { createComponentLogger } from '../utils/logger.js';

const log = createComponentLogger('auth');

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      log.warn('Authentication failed - no token', { 
        action: 'authenticate',
        status: 'failure',
        reason: 'no-token',
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'insightops-devops-agent',
      audience: 'insightops-users'
    });
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      log.warn('Authentication failed - user not found', { 
        action: 'authenticate',
        status: 'failure',
        reason: 'user-not-found',
        ip: req.ip
      });
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    const reason = error.name === 'TokenExpiredError' ? 'token-expired' : 
                   error.name === 'JsonWebTokenError' ? 'invalid-token' : 'unknown';
    log.warn('Authentication failed', { 
      action: 'authenticate',
      status: 'failure',
      reason,
      ip: req.ip,
      error: error.message
    });
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const generateToken = (userId) => {
  const expiresIn = process.env.NODE_ENV === 'production' ? '1d' : '7d';
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn,
      issuer: 'insightops-devops-agent',
      audience: 'insightops-users'
    }
  );
};
