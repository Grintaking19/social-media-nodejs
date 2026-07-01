import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    hashToken: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Track which login session this token belongs to
    // All tokens from the same session will share the same family ID
    // This allows us to invalidate all tokens from the same session if one is compromised
    // Helps implement advanced token management features like device-based logout, session tracking and logout from all devices and etc.
    family: {
      type: String,
      required: true,
      index: true,
    }
  },
  { timestamps: true },
);
// MongoDB TTL Index to automatically delete expired tokens
// This index will automatically remove documents once the expiresAt field is reached
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;
