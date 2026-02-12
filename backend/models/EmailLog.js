import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["signup_otp", "password_reset_otp"],
  },
  status: {
    type: String,
    required: true,
    enum: ["sent", "failed", "retrying"],
    default: "sent",
  },
  messageId: {
    type: String,
    default: null,
  },
  attempts: {
    type: Number,
    default: 1,
  },
  lastError: {
    type: String,
    default: null,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800, // TTL: 7 days (auto-delete old logs)
  },
});

// Index for querying stats
emailLogSchema.index({ sentAt: -1 });
emailLogSchema.index({ status: 1, sentAt: -1 });

export const EmailLog = mongoose.model("EmailLog", emailLogSchema);
