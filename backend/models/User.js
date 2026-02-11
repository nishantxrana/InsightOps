import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    // Password reset
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiry: {
      type: Date,
      default: null,
    },
    lastPasswordResetAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "app_users",
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.incLoginAttempts = async function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  // Lock the account after max attempts
  if (this.loginAttempts + 1 >= maxAttempts && !this.lockUntil) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Generate email verification token (24 hours)
userSchema.methods.generateVerificationToken = function () {
  const token = jwt.sign(
    { userId: this._id.toString(), type: "email-verification" },
    process.env.EMAIL_VERIFICATION_SECRET,
    { expiresIn: "24h" }
  );
  this.verificationToken = token;
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

// Generate password reset token (1 hour)
userSchema.methods.generateResetToken = function () {
  const token = jwt.sign(
    { userId: this._id.toString(), type: "password-reset" },
    process.env.PASSWORD_RESET_SECRET,
    { expiresIn: "1h" }
  );
  this.resetPasswordToken = token;
  this.resetPasswordExpiry = Date.now() + 60 * 60 * 1000;
  return token;
};

// Mark email as verified
userSchema.methods.verifyEmail = async function () {
  this.isEmailVerified = true;
  this.emailVerifiedAt = Date.now();
  this.verificationToken = null;
  this.verificationTokenExpiry = null;
  await this.save();
};

// Add database indexes for performance
userSchema.index({ createdAt: -1 });

// Cascade delete helper function
async function cascadeDeleteUserData(userId) {
  const Organization = mongoose.model("Organization");
  const UserSettings = mongoose.model("UserSettings");
  const NotificationHistory = mongoose.model("NotificationHistory");
  const PollingJob = mongoose.model("PollingJob");
  const WorkflowExecution = mongoose.model("WorkflowExecution");
  const Memory = mongoose.model("Memory");
  const Pattern = mongoose.model("Pattern");

  await Promise.all([
    Organization.deleteMany({ userId }),
    UserSettings.deleteMany({ userId }),
    NotificationHistory.deleteMany({ userId }),
    PollingJob.deleteMany({ userId }),
    WorkflowExecution.deleteMany({ userId }),
    Memory.deleteMany({ userId }),
    Pattern.deleteMany({ userId }),
  ]);
}

// Cascade delete: document.deleteOne()
userSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    await cascadeDeleteUserData(this._id);
    next();
  } catch (error) {
    next(error);
  }
});

// Cascade delete: User.findOneAndDelete()
userSchema.pre("findOneAndDelete", async function (next) {
  try {
    const doc = await this.model.findOne(this.getFilter());
    if (doc) {
      await cascadeDeleteUserData(doc._id);
    }
    next();
  } catch (error) {
    next(error);
  }
});

export const User = mongoose.model("User", userSchema);
