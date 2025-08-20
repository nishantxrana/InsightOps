import axios from 'axios';
import { logger } from '../utils/logger.js';
import { configLoader } from '../config/settings.js';
import { markdownFormatter } from '../utils/markdownFormatter.js';

class NotificationService {
  constructor() {
    this.config = configLoader.getNotificationConfig();
  }

  async sendNotification(message, type = 'general') {
    if (!this.config.enabled) {
      logger.debug('Notifications are disabled, skipping notification');
      return;
    }

    const promises = [];

    // Send to Microsoft Teams if configured
    if (this.config.teamsWebhookUrl) {
      promises.push(this.sendTeamsNotification(message, type));
    }

    // Send to Slack if configured
    if (this.config.slackWebhookUrl) {
      promises.push(this.sendSlackNotification(message, type));
    }

    // Send to Google Chat if configured
    if (this.config.googleChatWebhookUrl) {
      promises.push(this.sendGoogleChatNotification(message, type));
    }

    if (promises.length === 0) {
      logger.warn('No notification channels configured');
      return;
    }

    try {
      await Promise.allSettled(promises);
      logger.info('Notifications sent successfully', { type });
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }

  async sendTeamsNotification(message, type) {
    try {
      const color = this.getColorForType(type);
      const title = this.getTitleForType(type);

      const teamsMessage = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": color,
        "summary": title,
        "sections": [
          {
            "activityTitle": title,
            "activitySubtitle": new Date().toLocaleString(),
            "text": message,
            "markdown": true
          }
        ]
      };

      await axios.post(this.config.teamsWebhookUrl, teamsMessage, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.debug('Teams notification sent successfully', { type });
    } catch (error) {
      logger.error('Error sending Teams notification:', error);
      throw error;
    }
  }

  async sendSlackNotification(message, type) {
    try {
      const color = this.getSlackColorForType(type);
      const title = this.getTitleForType(type);

      const slackMessage = {
        text: title,
        attachments: [
          {
            color: color,
            text: message,
            mrkdwn_in: ["text"],
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      await axios.post(this.config.slackWebhookUrl, slackMessage, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.debug('Slack notification sent successfully', { type });
    } catch (error) {
      logger.error('Error sending Slack notification:', error);
      throw error;
    }
  }

  async sendGoogleChatNotification(message, type) {
    try {
      // const title = this.getTitleForType(type);
      // const formattedMessage = `${title}\n\n${message}`;

      const googleChatMessage = {
        text: message
      };

      await axios.post(this.config.googleChatWebhookUrl, googleChatMessage, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        },
        timeout: 10000
      });

      logger.debug('Google Chat notification sent successfully', { type });
    } catch (error) {
      logger.error('Error sending Google Chat notification:', error);
      throw error;
    }
  }

  getColorForType(type) {
    const colorMap = {
      'work-item-created': '0078D4', // Blue
      'work-item-updated': '00BCF2', // Light Blue
      'build-succeeded': '107C10', // Green
      'build-failed': 'D13438', // Red
      'pull-request-created': '8764B8', // Purple
      'pull-request-updated': '5C2D91', // Dark Purple
      'pull-request-reviewer-assigned': 'FF8C00', // Orange
      'overdue-reminder': 'FF4B4B', // Bright Red
      'sprint-summary': '00A4EF', // Azure Blue
      'general': '666666' // Gray
    };

    return colorMap[type] || colorMap['general'];
  }

  getSlackColorForType(type) {
    const colorMap = {
      'work-item-created': '#0078D4',
      'work-item-updated': '#00BCF2',
      'build-succeeded': 'good',
      'build-failed': 'danger',
      'pull-request-created': '#8764B8',
      'pull-request-updated': '#5C2D91',
      'pull-request-reviewer-assigned': 'warning',
      'overdue-reminder': 'danger',
      'sprint-summary': '#00A4EF',
      'general': '#666666'
    };

    return colorMap[type] || colorMap['general'];
  }

  getTitleForType(type) {
    const titleMap = {
      'work-item-created': '🆕 New Work Item Created',
      'work-item-updated': '📝 Work Item Updated',
      'build-succeeded': '✅ Build Succeeded',
      'build-failed': '❌ Build Failed',
      'pull-request-created': '🔀 New Pull Request',
      'pull-request-updated': '🔄 Pull Request Updated',
      'pull-request-reviewer-assigned': '👥 Reviewer Assigned',
      'overdue-reminder': '⏰ Overdue Items Reminder',
      'sprint-summary': '📊 Sprint Summary',
      'general': '📢 Azure DevOps Notification'
    };

    return titleMap[type] || titleMap['general'];
  }

  async sendOverdueReminder(overdueItems) {
    if (!overdueItems || overdueItems.length === 0) {
      return;
    }

    const message = markdownFormatter.formatOverdueItemsMessage(overdueItems);
    await this.sendNotification(message, 'overdue-reminder');
  }
}

export const notificationService = new NotificationService();
