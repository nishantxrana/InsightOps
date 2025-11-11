import express from 'express';
import { User } from '../models/User.js';
import { UserSettings } from '../models/UserSettings.js';
import { generateToken } from '../middleware/auth.js';
import { logger, sanitizeForLogging } from '../utils/logger.js';
import { validateRequest } from '../middleware/validation.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Health check for auth routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Signup
router.post('/signup', validateRequest(registerSchema), asyncHandler(async (req, res) => {
    logger.info('Signup attempt:', sanitizeForLogging({ email: req.validatedData.email }));
    
    const { email, password, name } = req.validatedData;

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
}));

// Login
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
    logger.info('Login attempt:', sanitizeForLogging({ email: req.validatedData.email }));
    
    const { email, password } = req.validatedData;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login failed: User not found', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isLocked()) {
      logger.warn('Login failed: Account locked', { email });
      return res.status(423).json({ 
        error: 'Account temporarily locked due to too many failed login attempts. Please try again later.' 
      });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      // Increment login attempts
      await user.incLoginAttempts();
      logger.warn('Login failed: Invalid password', { email, attempts: user.loginAttempts + 1 });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    const token = generateToken(user._id);
    
    logger.info(`User logged in: ${email}`);
    
    // Start user polling if settings are configured
    try {
      const { userPollingManager } = await import('../polling/userPollingManager.js');
      await userPollingManager.startUserPolling(user._id.toString());
    } catch (error) {
      logger.warn('Failed to start user polling on login:', error);
    }
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
}));

export { router as authRoutes };
