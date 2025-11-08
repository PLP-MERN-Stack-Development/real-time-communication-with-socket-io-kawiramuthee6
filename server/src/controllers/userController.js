const UserProfile = require("../models/UserProfile");
const asyncHandler = require("../utils/asyncHandler");

exports.listUsers = asyncHandler(async (req, res) => {
  const profiles = await UserProfile.find()
    .select("clerkUserId displayName avatarUrl email lastSeenAt")
    .sort({ displayName: 1 });

  res.json(profiles);
});

exports.syncProfile = asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const { displayName, avatarUrl, email } = req.body;

  if (!displayName) {
    return res.status(400).json({ message: "displayName is required" });
  }

  const profile = await UserProfile.findOneAndUpdate(
    { clerkUserId: userId },
    {
      clerkUserId: userId,
      displayName: displayName,
      avatarUrl: avatarUrl || "",
      email: email || "",
      lastSeenAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  res.json(profile);
});
