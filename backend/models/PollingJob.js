import mongoose from 'mongoose';

const pollingJobSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  jobType: { 
    type: String, 
    enum: ['workItems', 'pullRequests', 'overdue'], 
    required: true 
  },
  config: {
    enabled: { type: Boolean, default: false },
    interval: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          // Basic cron expression validation
          return /^[*\d\s,\-\/]+$/.test(v);
        },
        message: 'Invalid cron expression format'
      }
    },
    lastRun: Date,
    nextRun: Date,
    lastResult: { 
      type: String, 
      enum: ['success', 'error', 'timeout', 'pending'],
      default: 'pending'
    },
    lastError: String
  },
  status: { 
    type: String, 
    enum: ['active', 'paused', 'error'], 
    default: 'active' 
  }
}, {
  timestamps: true,
  collection: 'polling_jobs'
});

// Compound unique index - one job per user per type
pollingJobSchema.index({ userId: 1, jobType: 1 }, { unique: true });

// Index for querying active jobs
pollingJobSchema.index({ status: 1, 'config.enabled': 1 });

// Index for cleanup operations
pollingJobSchema.index({ updatedAt: 1 });

// Add method to check if job should be running
pollingJobSchema.methods.shouldBeActive = function() {
  return this.status === 'active' && this.config.enabled;
};

// Add method to update execution result
pollingJobSchema.methods.updateResult = function(result, error = null) {
  this.config.lastRun = new Date();
  this.config.lastResult = result;
  
  if (error) {
    this.config.lastError = error;
    this.status = 'error';
  } else if (result === 'success') {
    this.config.lastError = undefined;
    this.status = 'active';
  }
  
  return this.save();
};

export const PollingJob = mongoose.model('PollingJob', pollingJobSchema);
