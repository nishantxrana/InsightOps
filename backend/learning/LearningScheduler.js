import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { ruleGenerator } from './RuleGenerator.js';
import { patternTracker } from './PatternTracker.js';

/**
 * Learning Scheduler - Periodically generates rules and reviews performance
 */
class LearningScheduler {
  constructor() {
    this.jobs = [];
    this.running = false;
  }

  /**
   * Start learning scheduler
   */
  start() {
    if (this.running) {
      logger.warn('Learning scheduler already running');
      return;
    }

    // Generate rules daily at 3 AM
    const ruleGenJob = cron.schedule('0 3 * * *', async () => {
      logger.info('Running scheduled rule generation');
      try {
        const generated = await ruleGenerator.generateRules(0.85, 5);
        logger.info(`Generated ${generated} new rules`);
      } catch (error) {
        logger.error('Rule generation failed:', error);
      }
    });

    // Review rules weekly on Sunday at 4 AM
    const reviewJob = cron.schedule('0 4 * * 0', async () => {
      logger.info('Running scheduled rule review');
      try {
        const updated = await ruleGenerator.reviewRules();
        logger.info(`Updated ${updated} rules`);
      } catch (error) {
        logger.error('Rule review failed:', error);
      }
    });

    // Cleanup old patterns monthly on 1st at 5 AM
    const cleanupJob = cron.schedule('0 5 1 * *', async () => {
      logger.info('Running scheduled pattern cleanup');
      try {
        const cleaned = await patternTracker.cleanup(90);
        logger.info(`Cleaned up ${cleaned} old patterns`);
      } catch (error) {
        logger.error('Pattern cleanup failed:', error);
      }
    });

    this.jobs = [ruleGenJob, reviewJob, cleanupJob];
    this.running = true;

    logger.info('Learning scheduler started');
  }

  /**
   * Stop learning scheduler
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.running = false;
    logger.info('Learning scheduler stopped');
  }

  /**
   * Manually trigger rule generation
   */
  async triggerRuleGeneration() {
    logger.info('Manually triggering rule generation');
    return await ruleGenerator.generateRules(0.85, 5);
  }

  /**
   * Manually trigger rule review
   */
  async triggerRuleReview() {
    logger.info('Manually triggering rule review');
    return await ruleGenerator.reviewRules();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.running,
      jobs: this.jobs.length
    };
  }
}

// Export singleton instance
export const learningScheduler = new LearningScheduler();
export default learningScheduler;
