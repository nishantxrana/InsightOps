import mongoose from 'mongoose';

const WorkflowExecutionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  workflowId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'paused'],
    default: 'running',
    index: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: Number,
  steps: [{
    id: String,
    status: String,
    result: mongoose.Schema.Types.Mixed,
    error: String,
    timestamp: Date
  }],
  context: mongoose.Schema.Types.Mixed,
  outputs: mongoose.Schema.Types.Mixed,
  error: String
});

// Index for cleanup
WorkflowExecutionSchema.index({ status: 1, startTime: 1 });

// TTL index - auto-delete completed executions after 7 days
WorkflowExecutionSchema.index(
  { startTime: 1 },
  { 
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { status: 'completed' }
  }
);

const WorkflowExecution = mongoose.model('WorkflowExecution', WorkflowExecutionSchema);

export default WorkflowExecution;
