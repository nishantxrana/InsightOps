import * as brevo from "@getbrevo/brevo";
import { logger } from "../utils/logger.js";

class EmailService {
  constructor() {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      logger.warn("BREVO_API_KEY not configured - email sending disabled");
      this.enabled = false;
      return;
    }

    this.apiInstance = new brevo.TransactionalEmailsApi();
    this.apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    this.enabled = true;

    this.fromEmail = process.env.FROM_EMAIL || "noreply@insightops.dev";
    this.fromName = process.env.FROM_NAME || "InsightOps";
    this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:8000";
  }

  async sendVerificationEmail(user, token) {
    if (!this.enabled) {
      logger.warn("Email service disabled - skipping verification email");
      return;
    }

    const verificationUrl = `${this.frontendUrl}/verify-email/${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #3b82f6; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
          .link { word-break: break-all; color: #3b82f6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome to InsightOps!</h2>
          <p>Hi ${user.name},</p>
          <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
          
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <p class="link">${verificationUrl}</p>
          
          <p><strong>This link expires in 24 hours.</strong></p>
          
          <p>If you didn't create an account with InsightOps, you can safely ignore this email.</p>
          
          <div class="footer">
            <p><strong>InsightOps</strong> - AI-powered DevOps Intelligence</p>
            <p>Questions? Contact us at support@insightops.dev</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: "Verify your InsightOps account",
      htmlContent,
    });
  }

  async sendOTPEmail(email, name, otp) {
    if (!this.enabled) {
      logger.warn("Email service disabled - skipping OTP email");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .otp-box { 
            background: #f3f4f6; 
            border: 2px dashed #3b82f6; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
            margin: 30px 0;
          }
          .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            letter-spacing: 8px; 
            color: #1e40af; 
            font-family: monospace;
          }
          .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Verify Your Email</h2>
          <p>Hi ${name},</p>
          <p>Thanks for signing up for InsightOps! Please use the verification code below to complete your registration:</p>
          
          <div class="otp-box">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code</p>
            <div class="otp-code">${otp}</div>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">This code expires in 10 minutes</p>
          </div>
          
          <p><strong>Important:</strong> Do not share this code with anyone. InsightOps will never ask for your verification code.</p>
          
          <p>If you didn't request this code, you can safely ignore this email.</p>
          
          <div class="footer">
            <p><strong>InsightOps</strong> - AI-powered DevOps Intelligence</p>
            <p>Questions? Contact us at support@insightops.dev</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: "Your InsightOps Verification Code",
      htmlContent,
    });
  }

  async sendPasswordResetEmail(user, token) {
    if (!this.enabled) {
      logger.warn("Email service disabled - skipping password reset email");
      return;
    }

    const resetUrl = `${this.frontendUrl}/reset-password/${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #3b82f6; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
          .link { word-break: break-all; color: #3b82f6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <a href="${resetUrl}" class="button">Reset Password</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <p class="link">${resetUrl}</p>
          
          <p><strong>This link expires in 1 hour.</strong></p>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          
          <div class="footer">
            <p><strong>InsightOps</strong> - AI-powered DevOps Intelligence</p>
            <p>Questions? Contact us at support@insightops.dev</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: "Reset your InsightOps password",
      htmlContent,
    });
  }

  async sendEmail({ to, subject, htmlContent }) {
    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.sender = { email: this.fromEmail, name: this.fromName };
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;

      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      logger.info("Email sent successfully", {
        to,
        subject,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error("Failed to send email", {
        to,
        subject,
        error: error.message,
      });
      throw error;
    }
  }
}

export const emailService = new EmailService();
