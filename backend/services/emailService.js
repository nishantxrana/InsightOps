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
            <p>Questions? Contact us at support@notbatman.me</p>
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

  async sendPasswordResetOTP(email, name, otp) {
    if (!this.enabled) {
      logger.warn("Email service disabled - skipping password reset OTP");
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
            background: #fef3c7; 
            border: 2px dashed #f59e0b; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
            margin: 30px 0;
          }
          .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            letter-spacing: 8px; 
            color: #92400e; 
            font-family: monospace;
          }
          .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Please use the verification code below:</p>
          
          <div class="otp-box">
            <p style="margin: 0; font-size: 14px; color: #92400e;">Your password reset code</p>
            <div class="otp-code">${otp}</div>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400e;">This code expires in 10 minutes</p>
          </div>
          
          <p><strong>Important:</strong> Do not share this code with anyone. If you didn't request a password reset, please ignore this email.</p>
          
          <div class="footer">
            <p><strong>InsightOps</strong> - AI-powered DevOps Intelligence</p>
            <p>Questions? Contact us at support@notbatman.me</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: "Your InsightOps Password Reset Code",
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
