import { EmailClient, KnownEmailSendStatus } from "@azure/communication-email";
import { logger } from "../utils/logger.js";
import { EmailLog } from "../models/EmailLog.js";

class EmailService {
  constructor() {
    const connectionString = process.env.ACS_CONNECTION_STRING?.trim();
    const fromEmail = process.env.ACS_EMAIL_FROM?.trim();

    if (!connectionString || !fromEmail) {
      logger.warn(
        "ACS_CONNECTION_STRING or ACS_EMAIL_FROM not configured - email sending disabled"
      );
      this.enabled = false;
      return;
    }

    try {
      this.emailClient = new EmailClient(connectionString);
      this.fromEmail = fromEmail;
      this.enabled = true;
    } catch (error) {
      logger.error("Invalid ACS_CONNECTION_STRING - email sending disabled", {
        error: error.message,
      });
      this.enabled = false;
      return;
    }

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelays = [0, 2000, 4000]; // 0s, 2s, 4s
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
      type: "signup_otp",
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
      type: "password_reset_otp",
    });
  }

  // ------------------------
  // Core implementation
  // ------------------------

  async sendTransactionalOTP({ email, name, otp, title, intro, subject, type, accentColor }) {
    if (!this.enabled) {
      logger.warn("Email service disabled - skipping email send");
      return { skipped: true };
    }

    // Prevent HTML injection
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
${this.fromEmail}
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      htmlContent,
      textContent,
      type,
    });
  }

  // ------------------------
  // Template (Minimal + Elegant)
  // ------------------------

  buildTemplate({ title, intro, otp, name }) {
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
        ${this.fromEmail}
      </div>
    </div>
  </body>
  </html>
    `;
  }

  // ------------------------
  // Sender with Retry Logic
  // ------------------------

  async sendEmail({ to, subject, htmlContent, textContent, type }) {
    let lastError = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Wait before retry (except first attempt)
        if (attempt > 0) {
          await this.sleep(this.retryDelays[attempt]);
          logger.info(`Retrying email send (attempt ${attempt + 1}/${this.maxRetries})`, {
            to,
            type,
          });
        }

        const message = {
          senderAddress: this.fromEmail,
          content: {
            subject,
            plainText: textContent,
            html: htmlContent,
          },
          recipients: {
            to: [{ address: to }],
          },
        };

        const poller = await this.emailClient.beginSend(message);
        const result = await poller.pollUntilDone();

        if (result.status !== KnownEmailSendStatus.Succeeded) {
          const sendError = result.error ?? new Error(`Email send failed: ${result.status}`);
          throw sendError;
        }

        const messageId = result.id;

        await this.logEmail({
          email: to,
          type,
          status: "sent",
          messageId,
          attempts: attempt + 1,
        });

        logger.info("Email sent successfully", {
          to,
          subject,
          messageId,
          attempts: attempt + 1,
        });

        return result;
      } catch (error) {
        lastError = error;

        logger.warn(`Email send attempt ${attempt + 1} failed`, {
          to,
          type,
          error: error.message,
          statusCode: error.statusCode,
        });

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
      }
    }

    // All retries failed - log failure
    await this.logEmail({
      email: to,
      type,
      status: "failed",
      attempts: this.maxRetries,
      lastError: lastError?.message || "Unknown error",
    });

    logger.error("Failed to send email after all retries", {
      to,
      subject,
      attempts: this.maxRetries,
      error: lastError?.message,
    });

    throw lastError;
  }

  // Helper: Check if error should not be retried
  isNonRetryableError(error) {
    const message = error.message?.toLowerCase() || "";
    const statusCode = error.statusCode ?? error.code;

    // Retry 429 (rate limit); do not retry auth / invalid sender / forbidden
    if (statusCode === 429) {
      return false;
    }

    return (
      statusCode === 401 ||
      statusCode === 403 ||
      message.includes("invalid email") ||
      message.includes("invalid sender") ||
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("access denied")
    );
  }

  // Helper: Sleep for retry delay
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Helper: Log email to database
  async logEmail({ email, type, status, messageId = null, attempts = 1, lastError = null }) {
    try {
      await EmailLog.create({
        email,
        type,
        status,
        messageId,
        attempts,
        lastError,
        sentAt: new Date(),
      });
    } catch (error) {
      // Don't fail email send if logging fails
      logger.error("Failed to log email", { error: error.message });
    }
  }
}

export const emailService = new EmailService();
