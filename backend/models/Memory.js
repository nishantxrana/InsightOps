import mongoose from 'mongoose';

const MemorySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    index: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  type: {
    type: String,
    enum: ['build_failure', 'pr_issue', 'work_item', 'sprint_insight', 'general'],
    default: 'general',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  accessCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for cleanup queries
MemorySchema.index({ createdAt: 1, accessCount: 1 });

// Index for type-based queries
MemorySchema.index({ type: 1, createdAt: -1 });

const Memory = mongoose.model('Memory', MemorySchema);

export default Memory;
