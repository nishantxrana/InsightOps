import cron from 'node-cron';

class EmergencyCleanup {
  static async nuclearCleanup() {
    console.log('🚨 [EMERGENCY] Starting nuclear cleanup of all cron jobs');
    
    // Stop all cron tasks
    const tasks = cron.getTasks();
    let stoppedCount = 0;
    
    for (const [key, task] of tasks) {
      try {
        task.stop();
        stoppedCount++;
      } catch (error) {
        console.error(`Failed to stop task ${key}:`, error);
      }
    }
    
    console.log(`🧹 [EMERGENCY] Stopped ${stoppedCount} cron jobs`);
    
    // Clear any remaining references
    tasks.clear();
    
    return stoppedCount;
  }
}

export default EmergencyCleanup;
