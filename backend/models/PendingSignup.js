import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const pendingSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  passwordHash: {
    type: String,
    required: true,
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
pendingSignupSchema.pre("save", async function (next) {
  if (this.isModified("otp")) {
    this.otp = await bcrypt.hash(this.otp, 10);
  }
  next();
});

// Method to verify OTP
pendingSignupSchema.methods.verifyOTP = async function (otp) {
  return await bcrypt.compare(otp, this.otp);
};

// Method to check if OTP expired
pendingSignupSchema.methods.isOTPExpired = function () {
  return Date.now() > this.otpExpiry;
};

export const PendingSignup = mongoose.model("PendingSignup", pendingSignupSchema);
