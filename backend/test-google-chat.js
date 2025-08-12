// Test Google Chat webhook integration
import { config } from 'dotenv';
import { notificationService } from './notifications/notificationService.js';
import { configLoader } from './config/settings.js';

// Load environment variables
config({ path: './backend/.env' });

async function testGoogleChatNotification() {
  console.log('🧪 Testing Google Chat notification...');
  
  // Check if Google Chat webhook is configured
  const notificationConfig = configLoader.getNotificationConfig();
  
  if (!notificationConfig.googleChatWebhookUrl) {
    console.log('❌ Google Chat webhook URL not configured');
    console.log('💡 Set GOOGLE_CHAT_WEBHOOK_URL in your backend/.env file');
    console.log('📝 Current value:', process.env.GOOGLE_CHAT_WEBHOOK_URL || 'undefined');
    return;
  }
  
  if (!notificationConfig.enabled) {
    console.log('❌ Notifications are disabled');
    console.log('💡 Set NOTIFICATIONS_ENABLED=true in your backend/.env file');
    return;
  }
  
  console.log('✅ Google Chat webhook URL configured');
  console.log('✅ Notifications enabled');
  console.log('📤 Sending test message...');
  
  try {
    const testMessage = `🚀 *Test Notification from Azure DevOps Monitoring Agent*

This is a test message to verify Google Chat integration is working correctly.

*Timestamp*: ${new Date().toLocaleString()}
*Status*: Integration successful!

If you see this message, your Google Chat webhook is properly configured.`;

    await notificationService.sendNotification(testMessage, 'general');
    console.log('✅ Test notification sent successfully!');
    console.log('📱 Check your Google Chat space for the message');
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error.message);
    console.log('💡 Please check your Google Chat webhook URL and permissions');
  }
}

// Run the test
testGoogleChatNotification().catch(console.error);
