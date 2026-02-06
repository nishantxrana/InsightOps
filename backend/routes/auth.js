import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { PendingSignup } from "../models/PendingSignup.js";
import { UserSettings } from "../models/UserSettings.js";
import { generateToken, authenticate } from "../middleware/auth.js";
import { logger, sanitizeForLogging } from "../utils/logger.js";
import { validateRequest } from "../middleware/validation.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOTPSchema,
  resendOTPSchema,
} from "../validators/schemas.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { emailService } from "../services/emailService.js";

const router = express.Router();

// Health check for auth routes
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth" });
});

// Step 1: Request OTP (initiate signup)
router.post(
  "/signup/request-otp",
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    logger.info("OTP request:", sanitizeForLogging({ email: req.validatedData.email }));

    const { email, password, name } = req.validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn("OTP request failed: User already exists", { email });
      return res.status(400).json({ error: "User already exists" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Delete any existing pending signup for this email
    await PendingSignup.deleteOne({ email });

    // Create pending signup
    const pendingSignup = new PendingSignup({
      email,
      name,
      passwordHash,
      otp, // Will be hashed by pre-save hook
      otpExpiry,
      attempts: 0,
    });
    await pendingSignup.save();

    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, name, otp);
      logger.info("OTP sent", { email });
    } catch (error) {
      logger.error("Failed to send OTP email", { email, error: error.message });
      return res.status(500).json({ error: "Failed to send verification code. Please try again." });
    }

    res.json({
      message: "Verification code sent to your email",
      email,
    });
  })
);

// Step 2: Verify OTP and create account
router.post(
  "/signup/verify-otp",
  validateRequest(verifyOTPSchema),
  asyncHandler(async (req, res) => {
    const { email, otp } = req.validatedData;

    logger.info("OTP verification attempt:", sanitizeForLogging({ email }));

    // Find pending signup
    const pendingSignup = await PendingSignup.findOne({ email });
    if (!pendingSignup) {
      logger.warn("OTP verification failed: Session not found", { email });
      return res.status(400).json({ error: "Verification session expired. Please sign up again." });
    }

    // Check if OTP expired
    if (pendingSignup.isOTPExpired()) {
      await PendingSignup.deleteOne({ email });
      logger.warn("OTP verification failed: Expired", { email });
      return res.status(400).json({ error: "Verification code expired. Please sign up again." });
    }

    // Check attempts
    if (pendingSignup.attempts >= 3) {
      await PendingSignup.deleteOne({ email });
      logger.warn("OTP verification failed: Too many attempts", { email });
      return res.status(429).json({ error: "Too many failed attempts. Please sign up again." });
    }

    // Verify OTP
    const isValid = await pendingSignup.verifyOTP(otp);
    if (!isValid) {
      pendingSignup.attempts += 1;
      await pendingSignup.save();

      const remainingAttempts = 3 - pendingSignup.attempts;
      logger.warn("OTP verification failed: Invalid code", {
        email,
        attempts: pendingSignup.attempts,
      });
      return res.status(400).json({
        error: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    // OTP verified! Create user account
    const user = new User({
      email: pendingSignup.email,
      name: pendingSignup.name,
      password: pendingSignup.passwordHash,
    });

    // Skip password hashing (already hashed)
    user.isModified = () => false;
    await user.save();

    // Create default settings
    const userSettings = new UserSettings({ userId: user._id });
    await userSettings.save();

    // Delete pending signup
    await PendingSignup.deleteOne({ email });

    // Generate JWT
    const token = generateToken(user._id);

    logger.info(`User registered and verified: ${email}`);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      message: "Account created successfully!",
    });
  })
);

// Step 3: Resend OTP
router.post(
  "/signup/resend-otp",
  validateRequest(resendOTPSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.validatedData;

    logger.info("OTP resend request:", sanitizeForLogging({ email }));

    // Find pending signup
    const pendingSignup = await PendingSignup.findOne({ email });
    if (!pendingSignup) {
      logger.warn("OTP resend failed: Session not found", { email });
      return res.status(400).json({ error: "Verification session expired. Please sign up again." });
    }

    // Rate limit: Can't resend within 60 seconds
    const timeSinceCreation = Date.now() - pendingSignup.createdAt.getTime();
    if (timeSinceCreation < 60000) {
      const waitTime = Math.ceil((60000 - timeSinceCreation) / 1000);
      logger.warn("OTP resend failed: Rate limited", { email, waitTime });
      return res.status(429).json({
        error: `Please wait ${waitTime} seconds before requesting a new code.`,
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    pendingSignup.otp = otp; // Will be hashed by pre-save hook
    pendingSignup.otpExpiry = otpExpiry;
    pendingSignup.attempts = 0; // Reset attempts
    pendingSignup.createdAt = Date.now(); // Update for rate limiting
    await pendingSignup.save();

    // Send new OTP
    try {
      await emailService.sendOTPEmail(email, pendingSignup.name, otp);
      logger.info("OTP resent", { email });
      res.json({ message: "New verification code sent to your email" });
    } catch (error) {
      logger.error("Failed to resend OTP", { email, error: error.message });
      res.status(500).json({ error: "Failed to send verification code. Please try again." });
    }
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
