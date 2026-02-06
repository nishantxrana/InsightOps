import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const pendingPasswordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpiry: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // TTL: 15 minutes (auto-delete)
  },
});

// Hash OTP before saving
pendingPasswordResetSchema.pre("save", async function (next) {
  if (this.isModified("otp")) {
    this.otp = await bcrypt.hash(this.otp, 10);
  }
  next();
});

// Method to verify OTP
pendingPasswordResetSchema.methods.verifyOTP = async function (otp) {
  return await bcrypt.compare(otp, this.otp);
};

// Method to check if OTP expired
pendingPasswordResetSchema.methods.isOTPExpired = function () {
  return Date.now() > this.otpExpiry;
};

export const PendingPasswordReset = mongoose.model(
  "PendingPasswordReset",
  pendingPasswordResetSchema
);
