const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const UserProfile = require("../models/UserProfile");
const asyncHandler = require("../utils/asyncHandler");

const pickProfiles = async (userIds) => {
  const uniqueIds = [...new Set(userIds)];
  const profiles = await UserProfile.find({
    clerkUserId: { $in: uniqueIds }
  }).select("clerkUserId displayName avatarUrl email lastSeenAt");

  const map = new Map();
  profiles.forEach((profile) => {
    map.set(profile.clerkUserId, profile);
  });

  // ensure there is stub record for missing profiles (in case user never synced yet)
  uniqueIds.forEach((id) => {
    if (!map.has(id)) {
      map.set(id, {
        clerkUserId: id,
        displayName: `User ${id.slice(-4)}`,
        avatarUrl: "",
        lastSeenAt: null
      });
    }
  });

  return map;
};

const mapProfileToPlain = (profile, clerkUserId) => {
  if (!profile) {
    return {
      clerkUserId,
      displayName: `User ${clerkUserId.slice(-4)}`,
      avatarUrl: "",
      email: "",
      lastSeenAt: null
    };
  }

  const plain = profile.toObject ? profile.toObject({ getters: false, virtuals: false }) : profile;

  return {
    clerkUserId,
    displayName: plain.displayName || `User ${clerkUserId.slice(-4)}`,
    avatarUrl: plain.avatarUrl || "",
    email: plain.email || "",
    lastSeenAt: plain.lastSeenAt || null
  };
};

const formatConversation = (conversation, profileMap, currentUserId) => {
  const isGroup = conversation.isGroup;
  const members = conversation.members.map((id) =>
    mapProfileToPlain(profileMap.get(id), id)
  );
  const otherMembers = members.filter((member) => member.clerkUserId !== currentUserId);
  const primaryMember = otherMembers[0] || members[0];

  const title = conversation.name || (isGroup
    ? (conversation.name || "Group chat")
    : primaryMember?.displayName || "Conversation");

  const avatar = isGroup
    ? ""
    : primaryMember?.avatarUrl || "";

  const unreadCounts = conversation.unreadCounts || new Map();

  return {
    id: conversation._id.toString(),
    name: title,
    isGroup,
    avatar,
    members,
    unreadCount: unreadCounts.get
      ? unreadCounts.get(currentUserId) || 0
      : unreadCounts[currentUserId] || 0,
    lastMessage: conversation.lastMessage
      ? {
          ...conversation.lastMessage,
          createdAt: conversation.lastMessage.createdAt
        }
      : null,
    lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
    createdAt: conversation.createdAt,
    adminId: conversation.adminId || null
  };
};

exports.listMyConversations = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;

  const conversations = await Conversation.find({
    members: currentUserId
  }).sort({ lastMessageAt: -1, updatedAt: -1 });

  const profileMap = await pickProfiles(conversations.flatMap((c) => c.members));

  const payload = conversations.map((conversation) =>
    formatConversation(conversation, profileMap, currentUserId)
  );

  res.json(payload);
});

exports.ensureConversation = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;
  const { targetUserId } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ message: "targetUserId required" });
  }

  if (targetUserId === currentUserId) {
    return res.status(400).json({ message: "Cannot start a conversation with yourself" });
  }

  let conversation = await Conversation.findOne({
    isGroup: false,
    members: { $all: [currentUserId, targetUserId], $size: 2 }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      members: [currentUserId, targetUserId],
      lastMessageAt: null,
      unreadCounts: Object.fromEntries([
        [currentUserId, 0],
        [targetUserId, 0]
      ])
    });
  }

  const profiles = await pickProfiles(conversation.members);
  const formatted = formatConversation(conversation, profiles, currentUserId);

  res.status(201).json(formatted);
});

exports.getConversationDetail = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;
  const { conversationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({ message: "Invalid conversation id" });
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation || !conversation.members.includes(currentUserId)) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const profiles = await pickProfiles(conversation.members);
  const formatted = formatConversation(conversation, profiles, currentUserId);

  res.json(formatted);
});
