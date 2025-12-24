import mongoose from 'mongoose';

const PatternSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  signature: {
    type: String,
    required: true,
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

// Compound indexes for multi-tenant queries
PatternSchema.index({ organizationId: 1, type: 1, confidence: -1 });
PatternSchema.index({ organizationId: 1, signature: 1 }, { unique: true, sparse: true });
PatternSchema.index({ lastSeen: 1, successCount: 1 });

const Pattern = mongoose.model('Pattern', PatternSchema);

export default Pattern;
