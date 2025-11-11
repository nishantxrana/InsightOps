class ExecutionLock {
  constructor() {
    this.locks = new Map(); // userId-jobType -> executionId
  }

  acquire(userId, jobType) {
    const key = `${userId}-${jobType}`;
    
    if (this.locks.has(key)) {
      return null; // Lock already held
    }
    
    const executionId = Math.random().toString(36).substr(2, 9);
    this.locks.set(key, executionId);
    return executionId;
  }

  release(userId, jobType, executionId) {
    const key = `${userId}-${jobType}`;
    const currentLock = this.locks.get(key);
    
    if (currentLock === executionId) {
      this.locks.delete(key);
      return true;
    }
    
    return false;
  }

  isLocked(userId, jobType) {
    return this.locks.has(`${userId}-${jobType}`);
  }
}

export default new ExecutionLock();
