import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { UserSettings } from "../models/UserSettings.js";
import { generateToken, authenticate } from "../middleware/auth.js";
import { logger, sanitizeForLogging } from "../utils/logger.js";
import { validateRequest } from "../middleware/validation.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/schemas.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { emailService } from "../services/emailService.js";

const router = express.Router();

// Health check for auth routes
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth" });
});

// Signup
router.post(
  "/signup",
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    logger.info("Signup attempt:", sanitizeForLogging({ email: req.validatedData.email }));

    const { email, password, name } = req.validatedData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn("Signup failed: User already exists", { email });
      return res.status(400).json({ error: "User already exists" });
    }

    const user = new User({ email, password, name, isEmailVerified: false });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Create default settings for user
    const userSettings = new UserSettings({ userId: user._id });
    await userSettings.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
      logger.info("Verification email sent", { email });
    } catch (error) {
      logger.error("Failed to send verification email", { email, error: error.message });
      // Don't fail signup if email fails
    }

    const token = generateToken(user._id);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isEmailVerified: false,
      },
      message: "Account created! Please check your email to verify your account.",
    });
  })
);

// Login
router.post(
  "/login",
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    logger.info("Login attempt:", sanitizeForLogging({ email: req.validatedData.email }));

    const { email, password } = req.validatedData;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Login failed: User not found", { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.isLocked()) {
      logger.warn("Login failed: Account locked", { email });
      return res.status(423).json({
        error:
          "Account temporarily locked due to too many failed login attempts. Please try again later.",
      });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      // Increment login attempts
      await user.incLoginAttempts();
      logger.warn("Login failed: Invalid password", { email, attempts: user.loginAttempts + 1 });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    const token = generateToken(user._id);

    logger.info(`User logged in: ${email}`);

    // Start user polling if settings are configured
    try {
      const { userPollingManager } = await import("../polling/userPollingManager.js");
      await userPollingManager.startUserPolling(user._id.toString());
    } catch (error) {
      logger.warn("Failed to start user polling on login:", error);
    }

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  })
);

// Verify email
router.get(
  "/verify-email/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    } catch (error) {
      logger.warn("Email verification failed: Invalid token", { error: error.message });
      return res.status(400).json({ error: "Invalid or expired verification link" });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      logger.warn("Email verification failed: User not found", { userId: decoded.userId });
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      logger.info("Email already verified", { email: user.email });
      return res.json({ message: "Email already verified", alreadyVerified: true });
    }

    // Check token expiry
    if (user.verificationTokenExpiry < Date.now()) {
      logger.warn("Email verification failed: Token expired", { email: user.email });
      return res.status(400).json({ error: "Verification link expired" });
    }

    // Verify email
    await user.verifyEmail();
    logger.info("Email verified successfully", { email: user.email });

    res.json({ message: "Email verified successfully!" });
  })
);

// Resend verification email
router.post(
  "/resend-verification",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Rate limit: Check last sent time (prevent spam)
    if (user.verificationTokenExpiry && user.verificationTokenExpiry > Date.now() - 60000) {
      return res.status(429).json({ error: "Please wait before requesting another email" });
    }

    // Generate new token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
      logger.info("Verification email resent", { email: user.email });
      res.json({ message: "Verification email sent!" });
    } catch (error) {
      logger.error("Failed to resend verification email", {
        email: user.email,
        error: error.message,
      });
      res.status(500).json({ error: "Failed to send email. Please try again later." });
    }
  })
);

// Forgot password
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.validatedData;

    const user = await User.findOne({ email });

    // Always return success (don't reveal if email exists)
    if (!user) {
      logger.info("Forgot password: Email not found", { email });
      return res.json({
        message: "If that email exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save();

    // Send email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
      logger.info("Password reset email sent", { email });
    } catch (error) {
      logger.error("Failed to send password reset email", {
        email,
        error: error.message,
      });
    }

    res.json({
      message: "If that email exists, a reset link has been sent",
    });
  })
);

// Reset password
router.post(
  "/reset-password/:token",
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.validatedData;

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.PASSWORD_RESET_SECRET);
    } catch (error) {
      logger.warn("Password reset failed: Invalid token", { error: error.message });
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      logger.warn("Password reset failed: User not found", { userId: decoded.userId });
      return res.status(404).json({ error: "User not found" });
    }

    // Check token expiry
    if (user.resetPasswordExpiry < Date.now()) {
      logger.warn("Password reset failed: Token expired", { email: user.email });
      return res.status(400).json({ error: "Reset link expired" });
    }

    // Update password
    user.password = password; // Will be hashed by pre-save hook
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    user.lastPasswordResetAt = Date.now();
    await user.save();

    logger.info("Password reset successfully", { email: user.email });

    res.json({ message: "Password reset successfully!" });
  })
);

export { router as authRoutes };
