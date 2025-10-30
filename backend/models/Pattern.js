import mongoose from 'mongoose';

const PatternSchema = new mongoose.Schema({
  signature: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  category: String,
  pattern: {
    type: String,
    required: true
  },
  solution: String,
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  confidence: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
    index: true
  },
  examples: [{
    task: String,
    solution: String,
    timestamp: Date
  }],
  metadata: mongoose.Schema.Types.Mixed,
  discoveredAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for queries
PatternSchema.index({ type: 1, confidence: -1 });
PatternSchema.index({ lastSeen: 1, successCount: 1 });

const Pattern = mongoose.model('Pattern', PatternSchema);

export default Pattern;
