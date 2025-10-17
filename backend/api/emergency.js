import express from 'express';
import { userPollingManager } from '../polling/userPollingManager.js';
import EmergencyCleanup from '../polling/emergency-cleanup.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Emergency cleanup endpoint
router.post('/cleanup', async (req, res) => {
  try {
    logger.warn('🚨 [EMERGENCY] Emergency cleanup requested');
    
    // Nuclear cleanup of all cron jobs
    const destroyedCount = await EmergencyCleanup.nuclearCleanup();
    
    // Clear user polling manager state
    await userPollingManager.emergencyCleanup();
    
    logger.info(`🧹 [EMERGENCY] Cleanup completed: ${destroyedCount} jobs destroyed`);
    
    res.json({
      success: true,
      message: `Emergency cleanup completed: ${destroyedCount} jobs destroyed`,
      destroyedCount
    });
  } catch (error) {
    logger.error('💥 [EMERGENCY] Cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
