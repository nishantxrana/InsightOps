import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';

class SettingsEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.prefix = 'encrypted:AES256:';
    
    // Get encryption key from env or generate one
    this.encryptionKey = this.getOrGenerateKey();
  }

  getOrGenerateKey() {
    let key = env.ENCRYPTION_KEY;
    
    if (!key) {
      // Generate a random key and warn user
      key = crypto.randomBytes(this.keyLength).toString('hex');
      logger.warn('No ENCRYPTION_KEY found in environment. Generated temporary key. Settings will not persist across restarts unless you set ENCRYPTION_KEY in your environment.');
      logger.warn(`Generated key: ${key}`);
    }
    
    // Ensure key is correct length
    if (key.length !== this.keyLength * 2) { // hex string is 2x length
      throw new Error(`ENCRYPTION_KEY must be ${this.keyLength * 2} characters (${this.keyLength} bytes in hex)`);
    }
    
    return Buffer.from(key, 'hex');
  }

  encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
      return plaintext;
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine iv + tag + encrypted data
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
      
      return this.prefix + combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      // Return original value if encryption fails (fallback)
      return plaintext;
    }
  }

  decrypt(encryptedValue) {
    if (!this.isEncrypted(encryptedValue)) {
      return encryptedValue;
    }

    try {
      // Remove prefix and decode
      const combined = Buffer.from(encryptedValue.slice(this.prefix.length), 'base64');
      
      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      // Return encrypted value if decryption fails (don't break the app)
      return encryptedValue;
    }
  }

  isEncrypted(value) {
    return typeof value === 'string' && value.startsWith(this.prefix);
  }

  // Encrypt sensitive fields in settings object
  encryptSensitiveFields(settings) {
    const sensitiveFields = [
      'azureDevOps.personalAccessToken',
      'ai.openaiApiKey',
      'ai.groqApiKey', 
      'ai.geminiApiKey',
      'notifications.teamsWebhookUrl',
      'notifications.slackWebhookUrl',
      'notifications.googleChatWebhookUrl'
    ];

    const encrypted = JSON.parse(JSON.stringify(settings));

    for (const fieldPath of sensitiveFields) {
      const value = this.getNestedValue(encrypted, fieldPath);
      if (value && typeof value === 'string' && value.trim() !== '' && !this.isEncrypted(value)) {
        this.setNestedValue(encrypted, fieldPath, this.encrypt(value));
      }
    }

    return encrypted;
  }

  // Decrypt sensitive fields in settings object
  decryptSensitiveFields(settings) {
    const decrypted = JSON.parse(JSON.stringify(settings));
    
    this.traverseAndDecrypt(decrypted);
    
    return decrypted;
  }

  traverseAndDecrypt(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.traverseAndDecrypt(obj[key]);
      } else if (this.isEncrypted(obj[key])) {
        obj[key] = this.decrypt(obj[key]);
      }
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

export const settingsEncryption = new SettingsEncryption();
