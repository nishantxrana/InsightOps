import mongoose from "mongoose";

const MemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    index: true,
  },
  content: {
    type: String,
    required: true,
    index: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  type: {
    type: String,
    enum: ["build_failure", "pr_issue", "work_item", "sprint_insight", "general"],
    default: "general",
    index: true,
  },
  accessCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Indexes for multi-tenant queries
MemorySchema.index({ organizationId: 1, type: 1, createdAt: -1 });
MemorySchema.index({ organizationId: 1, createdAt: 1, accessCount: 1 });

const Memory = mongoose.model("Memory", MemorySchema);

export default Memory;
