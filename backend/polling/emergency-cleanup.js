import cron from "node-cron";
import { createComponentLogger } from "../utils/logger.js";

const log = createComponentLogger("emergency-cleanup");

class EmergencyCleanup {
  static async nuclearCleanup() {
    log.warn("Starting nuclear cleanup of all cron jobs", {
      action: "nuclear-cleanup",
      status: "starting",
    });

    // Stop all cron tasks
    const tasks = cron.getTasks();
    let stoppedCount = 0;

    for (const [key, task] of tasks) {
      try {
        task.stop();
        stoppedCount++;
      } catch (error) {
        log.error("Failed to stop cron task", { taskKey: key, error: error.message });
      }
    }

    log.info("Nuclear cleanup completed", {
      action: "nuclear-cleanup",
      status: "completed",
      stoppedCount,
    });

    // Clear any remaining references
    tasks.clear();

    return stoppedCount;
  }
}

export default EmergencyCleanup;
