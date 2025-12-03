import mongoose from 'mongoose';

const notificationHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['build', 'release', 'work-item', 'pull-request', 'overdue', 'idle-pr'],
    index: true
  },
  subType: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['webhook', 'poller'],
    required: true
  },
  card: {
    type: mongoose.Schema.Types.Mixed
  },
  aiSummary: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  channels: [{
    platform: {
      type: String,
      enum: ['teams', 'slack', 'google-chat']
    },
    status: {
      type: String,
      enum: ['sent', 'failed']
    },
    sentAt: Date,
    error: String
  }],
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  starred: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
});

// Compound indexes for efficient queries
notificationHistorySchema.index({ userId: 1, createdAt: -1 });
notificationHistorySchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationHistorySchema.index({ userId: 1, read: 1 });

// TTL index for automatic cleanup after 7 days
notificationHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NotificationHistory = mongoose.model('NotificationHistory', notificationHistorySchema);

export default NotificationHistory;
