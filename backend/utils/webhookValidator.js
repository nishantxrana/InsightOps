import crypto from 'crypto';
import { logger } from './logger.js';

export function validateWebhookSignature(req, secret) {
  try {
    const signature = req.get('X-Hub-Signature-256') || req.get('X-Signature');
    
    if (!signature) {
      logger.warn('No signature header found in webhook request');
      return false;
    }

    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;
    
    // Use timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignatureWithPrefix, 'utf8');
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    
  } catch (error) {
    logger.error('Error validating webhook signature:', error);
    return false;
  }
}
