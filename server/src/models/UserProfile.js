const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, unique: true }, // maps to Clerk user.id
    displayName: { type: String, required: true },               // what we show in chat UI
    avatarUrl: { type: String, default: "" },                    // profile picture
    email: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const UserProfile = mongoose.model("UserProfile", userProfileSchema);
module.exports = UserProfile;
