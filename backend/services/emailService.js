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

    // ✅ ENV-FIRST (with safe defaults)
    this.fromEmail = process.env.FROM_EMAIL || "support@notbatman.me";
    this.fromName = process.env.FROM_NAME || "InsightOps";
  }

  // ------------------------
  // Public APIs
  // ------------------------

  async sendOTPEmail(email, name, otp) {
    return this.sendTransactionalOTP({
      email,
      name,
      otp,
      title: "Verify your email",
      intro:
        "Thanks for signing up for InsightOps. Use the verification code below to complete your registration.",
      subject: "Your InsightOps verification code",
    });
  }

  async sendPasswordResetOTP(email, name, otp) {
    return this.sendTransactionalOTP({
      email,
      name,
      otp,
      title: "Reset your password",
      intro:
        "We received a request to reset your InsightOps password. Use the code below to continue.",
      subject: "Your InsightOps password reset code",
    });
  }

  // ------------------------
  // Core implementation
  // ------------------------

  async sendTransactionalOTP({ email, name, otp, title, intro, subject, accentColor }) {
    if (!this.enabled) {
      logger.warn("Email service disabled - skipping email send");
      return { skipped: true };
    }

    // ✅ Prevent HTML injection
    const safeName = name && typeof name === "string" ? name.replace(/[<>]/g, "") : "there";

    const htmlContent = this.buildTemplate({
      title,
      intro,
      otp,
      name: safeName,
      accentColor,
    });

    const textContent = `
${title}

Hi ${safeName},

${intro}

Your verification code: ${otp}
This code expires in 10 minutes.

Do not share this code with anyone.
If you did not request this, you can safely ignore this email.

— InsightOps
support@notbatman.me
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      htmlContent,
      textContent,
    });
  }

  // ------------------------
  // Template (Minimal + Elegant)
  // ------------------------

  buildTemplate({ title, intro, otp, name, accentColor }) {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        color: #09090b;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.5;
      }
  
      .container {
        max-width: 520px;
        margin: 0 auto;
        padding: 48px 24px 40px;
      }
  
      .brand {
        font-size: 13px;
        font-weight: 500;
        color: #52525b;
        margin-bottom: 32px;
      }
  
      h1 {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0 0 16px;
      }
  
      p {
        font-size: 14px;
        color: #3f3f46;
        margin: 0 0 16px;
      }
  
      .otp-block {
        margin: 32px 0 28px;
      }
  
      .otp-label {
        font-size: 12px;
        font-weight: 500;
        color: #71717a;
        margin-bottom: 8px;
      }
  
      .otp-code {
        font-size: 36px;
        font-weight: 600;
        letter-spacing: 0.35em;
        color: #09090b;
        font-family: ui-monospace, SFMono-Regular, Menlo,
          Monaco, Consolas, monospace;
      }
  
      .otp-expiry {
        margin-top: 8px;
        font-size: 12px;
        color: #71717a;
      }
  
      .hint {
        margin-top: 20px;
        font-size: 13px;
        color: #52525b;
      }
  
      .footer {
        margin-top: 48px;
        padding-top: 24px;
        border-top: 1px solid #e4e4e7;
        font-size: 12px;
        color: #71717a;
      }
  
      .footer strong {
        color: #18181b;
        font-weight: 500;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="brand">InsightOps</div>
  
      <h1>${title}</h1>
  
      <p>Hi ${name},</p>
  
      <p>${intro}</p>
  
      <div class="otp-block">
        <div class="otp-label">Verification code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">Expires in 10 minutes</div>
      </div>
  
      <p class="hint">
        Do not share this code with anyone. InsightOps will never ask you for it.
      </p>
  
      <p class="hint">
        If you did not request this, you can safely ignore this email.
      </p>
  
      <div class="footer">
        <strong>InsightOps</strong><br />
        AI-powered DevOps Intelligence<br />
        support@notbatman.me
      </div>
    </div>
  </body>
  </html>
    `;
  }

  // ------------------------
  // Sender
  // ------------------------

  async sendEmail({ to, subject, htmlContent, textContent }) {
    try {
      const email = new brevo.SendSmtpEmail();

      email.sender = {
        email: this.fromEmail,
        name: this.fromName,
      };

      email.to = [{ email: to }];
      email.subject = subject;
      email.htmlContent = htmlContent;
      email.textContent = textContent;

      const result = await this.apiInstance.sendTransacEmail(email);

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
