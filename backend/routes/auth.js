import express from 'express';
import { User } from '../models/User.js';
import { UserSettings } from '../models/UserSettings.js';
import { generateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Health check for auth routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    logger.info('Signup attempt:', { email: req.body.email });
    
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      logger.warn('Signup failed: Missing required fields');
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Signup failed: User already exists', { email });
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ email, password, name });
    await user.save();

    // Create default settings for user
    const userSettings = new UserSettings({ userId: user._id });
    await userSettings.save();

    const token = generateToken(user._id);
    
    logger.info(`New user registered: ${email}`);
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    logger.info('Login attempt:', { email: req.body.email });
    
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Login failed: Missing credentials');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login failed: User not found', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn('Login failed: Invalid password', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    
    logger.info(`User logged in: ${email}`);
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export { router as authRoutes };
