const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const UserProfile = require("../models/UserProfile");
const asyncHandler = require("../utils/asyncHandler");

const ensureConversationAccess = async (conversationId, currentUserId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    const error = new Error("Invalid conversation id");
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }

  if (!conversation.members.includes(currentUserId)) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  return conversation;
};

exports.getMessagesForConversation = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;
  const { conversationId } = req.params;

  const conversation = await ensureConversationAccess(conversationId, currentUserId);

  let messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean();

  if (messages.length > 0) {
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: currentUserId },
        readBy: { $ne: currentUserId }
      },
      {
        $addToSet: { readBy: currentUserId },
        $set: { status: "seen" }
      }
    );
  }

  messages = messages.map((message) => {
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    const hasRead = readBy.includes(currentUserId);
    const nextReadBy = hasRead ? readBy : [...readBy, currentUserId];
    const status = message.senderId === currentUserId ? message.status : "seen";
    return {
      ...message,
      readBy: nextReadBy,
      status
    };
  });

  if (!conversation.unreadCounts) {
    conversation.unreadCounts = new Map();
  }
  if (conversation.unreadCounts instanceof Map) {
    conversation.unreadCounts.set(currentUserId, 0);
  } else {
    conversation.unreadCounts[currentUserId] = 0;
  }
  await conversation.save();

  res.json(messages);
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;
  const { conversationId, text } = req.body;

  if (!conversationId || !text?.trim()) {
    return res.status(400).json({ message: "conversationId and text are required" });
  }

  const conversation = await ensureConversationAccess(conversationId, currentUserId);

  const profile =
    (await UserProfile.findOne({ clerkUserId: currentUserId })) ||
    {
      displayName: "You",
      avatarUrl: ""
    };

  const message = await Message.create({
    conversationId,
    senderId: currentUserId,
    senderName: profile.displayName,
    senderAvatar: profile.avatarUrl,
    text: text.trim(),
    readBy: [currentUserId],
    status: "sent"
  });

  if (!conversation.unreadCounts) {
    conversation.unreadCounts = new Map();
  }

  const updateUnread = (memberId) => {
    if (conversation.unreadCounts instanceof Map) {
      const prev = conversation.unreadCounts.get(memberId) || 0;
      conversation.unreadCounts.set(memberId, memberId === currentUserId ? 0 : prev + 1);
    } else {
      const prev = conversation.unreadCounts[memberId] || 0;
      conversation.unreadCounts[memberId] = memberId === currentUserId ? 0 : prev + 1;
    }
  };

  conversation.members.forEach(updateUnread);

  conversation.lastMessage = {
    text: message.text,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    createdAt: message.createdAt
  };
  conversation.lastMessageAt = message.createdAt;

  await conversation.save();

  if (global.io) {
    global.io.to(conversationId).emit("message:new", {
      conversationId, 
      message: {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        text: message.text,
        status: message.status,
        readBy: message.readBy,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      }
    });

    conversation.members
      .filter((memberId) => memberId !== currentUserId)
      .forEach((memberId) => {
        global.io.to(memberId).emit("conversation:update", { conversationId });
      });
  }

  res.status(201).json(message);
});
exports.sendMessageWithSocket = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;
  const { conversationId, text, tempId } = req.body;

  if (!conversationId || !text?.trim()) {
    return res.status(400).json({ message: "conversationId and text are required" });
  }

  const conversation = await ensureConversationAccess(conversationId, currentUserId);

  const profile = await UserProfile.findOne({ clerkUserId: currentUserId }) || {
    displayName: "You",
    avatarUrl: ""
  };

  const message = await Message.create({
    conversationId,
    senderId: currentUserId,
    senderName: profile.displayName,
    senderAvatar: profile.avatarUrl,
    text: text.trim(),
    readBy: [currentUserId],
    status: "sent"
  });

  // Update conversation (same as existing code)
  if (!conversation.unreadCounts) {
    conversation.unreadCounts = new Map();
  }

  const updateUnread = (memberId) => {
    if (conversation.unreadCounts instanceof Map) {
      const prev = conversation.unreadCounts.get(memberId) || 0;
      conversation.unreadCounts.set(memberId, memberId === currentUserId ? 0 : prev + 1);
    } else {
      const prev = conversation.unreadCounts[memberId] || 0;
      conversation.unreadCounts[memberId] = memberId === currentUserId ? 0 : prev + 1;
    }
  };

  conversation.members.forEach(updateUnread);
  conversation.lastMessage = {
    text: message.text,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    createdAt: message.createdAt
  };
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  // Enhanced socket emission
  if (global.io) {
    const messageData = {
      _id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      text: message.text,
      status: message.status,
      readBy: message.readBy,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    // Emit to conversation room
    global.io.to(`conversation:${conversationId}`).emit("message:new", {
      conversationId,
      message: messageData,
      tempId // Include tempId for client-side tracking
    });

    // Update conversation lists for all members
    conversation.members.forEach(memberId => {
      global.io.to(memberId).emit("conversation:update", {
        conversationId,
        lastMessage: messageData,
        unreadCount: conversation.unreadCounts.get 
          ? conversation.unreadCounts.get(memberId) || 0
          : conversation.unreadCounts[memberId] || 0
      });
    });

    // Send notifications to offline users
    conversation.members
      .filter(memberId => memberId !== currentUserId)
      .forEach(memberId => {
        const userRooms = global.io.sockets.adapter.rooms.get(memberId);
        const isOnline = userRooms && userRooms.size > 0;
        
        if (!isOnline) {
          // Emit notification event
          global.io.to(memberId).emit("notification:new", {
            type: "new_message",
            conversationId,
            message: messageData,
            timestamp: new Date()
          });
        }
      });
  }

  res.status(201).json({
    ...message.toObject(),
    tempId // Echo back tempId for client reference
  });
});